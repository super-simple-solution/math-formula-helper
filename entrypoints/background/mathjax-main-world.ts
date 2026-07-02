export async function accessMathJaxInMainWorld(
  request:
    | { kind: 'source'; elementId?: string }
    | { kind: 'tex-to-mathml'; tex?: string; displayMode?: string },
) {
  type MathJaxMathItem = {
    math?: string
    inputData?: {
      original?: { tex?: string }
      originalMml?: string
      math?: string
    }
    typesetRoot?: Element
    root?: { node?: Element }
    start?: { node?: Element }
    toMathML?: () => string
  }

  type MathJax2MmlNode = {
    type?: string
    data?: Array<MathJax2MmlNode | string | null>
    isToken?: boolean
    inferred?: boolean
    mathvariant?: string
    displaystyle?: boolean | string
    scriptlevel?: number | string
    accent?: boolean | string
    accentunder?: boolean | string
    stretchy?: boolean | string
    fence?: boolean | string
    separator?: boolean | string
    lspace?: string
    rspace?: string
    form?: string
    open?: string
    close?: string
    separators?: string
    width?: string
    linethickness?: string
  }

  type MathJaxDocument = {
    getMathItemsWithin?: (el: Element) => MathJaxMathItem[]
    math?: Iterable<MathJaxMathItem>
  }

  type MathJaxWindow = Window & {
    MathJax?: {
      tex2mml?: (tex: string, options?: { display?: boolean }) => unknown
      tex2mmlPromise?: (tex: string, options?: { display?: boolean }) => Promise<unknown>
      startup?: { document?: MathJaxDocument }
      InputJax?: {
        TeX?: {
          Parse?: (...args: unknown[]) => {
            mml?: () => MathJax2MmlNode
          } | MathJax2MmlNode | null
        }
      }
      Hub?: {
        getJaxFor?: (el: Element) => {
          originalText?: string
          SourceElement?: () => Element | null
          root?: MathJax2MmlNode
        } | null
      }
    }
  }

  const mathJax = (window as MathJaxWindow).MathJax
  if (!mathJax) return null
  const pageMathJax = mathJax

  if (request.kind === 'tex-to-mathml') {
    return convertTexToMathmlWithPageMathJax(
      request.tex || '',
      request.displayMode === 'display',
    )
  }

  const el = request.elementId ? document.getElementById(request.elementId) : null
  if (!el) return null

  const findMathJax3Item = (doc: MathJaxDocument | undefined, target: Element) => {
    if (!doc) return null

    if (typeof doc.getMathItemsWithin === 'function') {
      const items = doc.getMathItemsWithin(target)
      if (items.length) return items[0]
    }

    if (doc.math && typeof doc.math[Symbol.iterator] === 'function') {
      for (const item of doc.math) {
        const root = item.typesetRoot || item.root?.node || item.start?.node
        if (root && (root === target || root.contains(target) || target.contains(root))) {
          return item
        }
      }
    }

    return null
  }

  const getMathJax3Source = (item: MathJaxMathItem | null) => {
    if (!item) return null
    const tex = item.inputData?.original?.tex || item.inputData?.math || item.math || null
    const mathml = item.inputData?.originalMml || item.toMathML?.() || null
    if (tex || mathml) return { tex, mathml }
    return null
  }

  const findMathJax2Item = () => {
    if (!mathJax.Hub?.getJaxFor) return null

    const candidates = [el, ...Array.from(el.querySelectorAll('[id]'))]
    for (const candidate of candidates) {
      const jax = mathJax.Hub.getJaxFor(candidate)
      if (jax) return jax
    }

    return null
  }

  const item = findMathJax3Item(mathJax.startup?.document, el)
  const source = getMathJax3Source(item)
  if (source) return source

  const jax = findMathJax2Item()
  if (!jax) return null

  const tex = jax.originalText || jax.SourceElement?.()?.textContent || null
  const mathml = mathJax2RootToMathml(jax.root)
  return tex || mathml ? { tex, mathml } : null

  async function convertTexToMathmlWithPageMathJax(texSource: string, display: boolean) {
    const tex = unwrapTexDelimiters(texSource)
    if (!tex) return null

    const mathJax3 = await convertTexWithMathJax3(tex, display)
    if (mathJax3) return mathJax3

    return convertTexWithMathJax2(tex, display)
  }

  async function convertTexWithMathJax3(tex: string, display: boolean) {
    const options = { display }

    try {
      if (typeof pageMathJax.tex2mmlPromise === 'function') {
        const result = await pageMathJax.tex2mmlPromise(tex, options)
        const mathml = normalizeMathmlCandidate(result)
        if (mathml) return mathml
      }
    } catch {}

    try {
      if (typeof pageMathJax.tex2mml === 'function') {
        const result = pageMathJax.tex2mml(tex, options)
        const mathml = normalizeMathmlCandidate(result)
        if (mathml) return mathml
      }
    } catch {}

    return null
  }

  function convertTexWithMathJax2(tex: string, display: boolean) {
    const parse = pageMathJax.InputJax?.TeX?.Parse
    if (typeof parse !== 'function') return null

    const parseArgSets: unknown[][] = [
      [tex, null, display],
      [tex, display],
      [tex],
    ]

    for (const args of parseArgSets) {
      try {
        const parsed = parse.apply(pageMathJax.InputJax?.TeX, args)
        const root =
          parsed && typeof parsed === 'object' && 'mml' in parsed && typeof parsed.mml === 'function'
            ? parsed.mml()
            : parsed
        const mathml = mathJax2RootToMathml(root as MathJax2MmlNode | undefined)
        if (mathml && !/<merror\b/i.test(mathml)) return mathml
      } catch {}
    }

    return null
  }

  function normalizeMathmlCandidate(candidate: unknown) {
    if (typeof candidate === 'string' && /^<math[\s>]/i.test(candidate.trim())) {
      return ensureMathmlNamespace(candidate.trim())
    }
    if (candidate instanceof Element && candidate.tagName.toLowerCase() === 'math') {
      return ensureMathmlNamespace(candidate.outerHTML)
    }
    return null
  }

  function unwrapTexDelimiters(source: string) {
    let value = source.trim()
    if (!value) return ''

    const wrappers: Array<[RegExp, string]> = [
      [/^\\\(([\s\S]*)\\\)$/u, '$1'],
      [/^\\\[([\s\S]*)\\\]$/u, '$1'],
      [/^\$\$([\s\S]*)\$\$$/u, '$1'],
      [/^\$([\s\S]*)\$$/u, '$1'],
    ]

    for (const [pattern, replacement] of wrappers) {
      if (pattern.test(value)) {
        value = value.replace(pattern, replacement).trim()
        break
      }
    }

    return value
  }

  function mathJax2RootToMathml(root?: MathJax2MmlNode) {
    if (!root) return null
    const serialized = serializeMathJax2Node(root)
    if (!serialized) return null
    if (/^<math[\s>]/i.test(serialized)) return ensureMathmlNamespace(serialized)
    return `<math xmlns="http://www.w3.org/1998/Math/MathML">${serialized}</math>`
  }

  function ensureMathmlNamespace(mathml: string) {
    if (/^<math\b[^>]*\sxmlns=/i.test(mathml)) return mathml
    return mathml.replace(/^<math\b/i, '<math xmlns="http://www.w3.org/1998/Math/MathML"')
  }

  function serializeMathJax2Node(node: MathJax2MmlNode | string | null | undefined): string {
    if (node === null || node === undefined) return ''
    if (typeof node === 'string') return escapeMathmlText(node)

    const type = node.type || 'mrow'
    if (type === 'chars') return serializeChildren(node)
    if (type === 'entity') return serializeEntity(node)
    if (type === 'TeXAtom' || type === 'texatom') return `<mrow>${serializeChildren(node)}</mrow>`

    if (type === 'msubsup') {
      const base = serializeMathJax2Node(node.data?.[0])
      const sub = serializeMathJax2Node(node.data?.[1])
      const sup = serializeMathJax2Node(node.data?.[2])
      if (sub && sup) return `<msubsup>${base}${sub}${sup}</msubsup>`
      if (sub) return `<msub>${base}${sub}</msub>`
      if (sup) return `<msup>${base}${sup}</msup>`
      return base
    }

    if (type === 'munderover') {
      const base = serializeMathJax2Node(node.data?.[0])
      const under = serializeMathJax2Node(node.data?.[1])
      const over = serializeMathJax2Node(node.data?.[2])
      if (under && over) return `<munderover>${base}${under}${over}</munderover>`
      if (under) return `<munder>${base}${under}</munder>`
      if (over) return `<mover>${base}${over}</mover>`
      return base
    }

    if (node.inferred && type === 'mrow') return serializeChildren(node)

    const tag = normalizeMathJax2TagName(type)
    const attrs = serializeMathJax2Attrs(node)
    return `<${tag}${attrs}>${serializeChildren(node)}</${tag}>`
  }

  function serializeChildren(node: MathJax2MmlNode) {
    return (node.data || []).map((child) => serializeMathJax2Node(child)).join('')
  }

  function serializeEntity(node: MathJax2MmlNode) {
    const raw = String(node.data?.[0] || '')
    if (/^#x[0-9a-f]+$/i.test(raw) || /^#\d+$/.test(raw)) return `&${raw};`
    return escapeMathmlText(raw)
  }

  function normalizeMathJax2TagName(type: string) {
    const tagMap: Record<string, string> = {
      msubsup: 'msubsup',
      munderover: 'munderover',
      mml: 'mrow',
    }
    return tagMap[type] || type.toLowerCase()
  }

  function serializeMathJax2Attrs(node: MathJax2MmlNode) {
    const attrNames = [
      'mathvariant',
      'displaystyle',
      'scriptlevel',
      'accent',
      'accentunder',
      'stretchy',
      'fence',
      'separator',
      'lspace',
      'rspace',
      'form',
      'open',
      'close',
      'separators',
      'width',
      'linethickness',
    ] as const

    let attrs = ''
    for (const name of attrNames) {
      if (!Object.prototype.hasOwnProperty.call(node, name)) continue
      const value = node[name]
      if (value === undefined || value === null || value === '') continue
      attrs += ` ${name}="${escapeMathmlAttr(String(value))}"`
    }
    return attrs
  }

  function escapeMathmlText(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  function escapeMathmlAttr(value: string) {
    return escapeMathmlText(value).replace(/"/g, '&quot;')
  }
}
