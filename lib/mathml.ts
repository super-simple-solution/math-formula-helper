import type { LatexDisplayMode } from './latex-options'

export const mathmlNamespace = 'http://www.w3.org/1998/Math/MathML'

const allowedMathmlAttrs = new Set([
  'xmlns',
  'display',
  'encoding',
  'mathvariant',
  'displaystyle',
  'scriptlevel',
  'stretchy',
  'fence',
  'separator',
  'separators',
  'accent',
  'accentunder',
  'lspace',
  'rspace',
  'form',
  'open',
  'close',
  'width',
  'linethickness',
])

export function cleanMathml(mathml: string) {
  return normalizeMathmlRoot(mathml) || mathml.trim()
}

export function normalizeMathmlRoot(
  mathml: string,
  options: {
    displayMode?: LatexDisplayMode
  } = {},
) {
  const source = mathml.trim()
  if (!source || !/^<math\b/i.test(source)) return ''

  const parsed = normalizeMathmlRootWithDom(source, options)
  if (parsed) return parsed

  return normalizeMathmlRootWithStringFallback(source, options)
}

function normalizeMathmlRootWithDom(
  source: string,
  options: {
    displayMode?: LatexDisplayMode
  },
) {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return ''

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(source, 'application/xml')
    if (doc.querySelector('parsererror')) return ''

    const root = doc.documentElement
    if (root.localName.toLowerCase() !== 'math') return ''

    sanitizeMathmlElementAttrs(root)

    if (!root.getAttribute('xmlns')) {
      root.setAttribute('xmlns', mathmlNamespace)
    }

    if (!root.getAttribute('display') && options.displayMode && options.displayMode !== 'unknown') {
      root.setAttribute('display', options.displayMode === 'display' ? 'block' : 'inline')
    }

    return new XMLSerializer().serializeToString(root)
  } catch {
    return ''
  }
}

function sanitizeMathmlElementAttrs(root: Element) {
  root.querySelectorAll('*').forEach(sanitizeSingleElementAttrs)
  sanitizeSingleElementAttrs(root)
}

function sanitizeSingleElementAttrs(node: Element) {
  for (const attr of Array.from(node.attributes)) {
    if (allowedMathmlAttrs.has(attr.name) || attr.name.startsWith('xmlns')) continue
    node.removeAttribute(attr.name)
  }
}

function normalizeMathmlRootWithStringFallback(
  source: string,
  options: {
    displayMode?: LatexDisplayMode
  },
) {
  const openTag = source.match(/^<math\b[^>]*>/i)?.[0] ?? ''
  if (!openTag) return ''

  let normalizedOpenTag = openTag
  if (!/\sxmlns=/.test(normalizedOpenTag)) {
    normalizedOpenTag = normalizedOpenTag.replace(/^<math\b/i, `<math xmlns="${mathmlNamespace}"`)
  }

  if (
    !/\sdisplay=/.test(normalizedOpenTag) &&
    options.displayMode &&
    options.displayMode !== 'unknown'
  ) {
    normalizedOpenTag = normalizedOpenTag.replace(
      /^<math\b/i,
      `<math display="${options.displayMode === 'display' ? 'block' : 'inline'}"`,
    )
  }

  return `${normalizedOpenTag}${source.slice(openTag.length)}`
}
