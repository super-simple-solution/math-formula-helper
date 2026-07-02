export function katexHtmlToLatex(el: HTMLElement) {
  const htmlEl = (
    el.classList.contains('katex-html') ? el : el.querySelector('.katex-html')
  ) as HTMLElement | null
  if (!htmlEl) return ''
  if (htmlEl.querySelector('.mfrac,.sqrt,.mroot,.accent')) return ''

  return cleanKatexLatex(parseKatexChildren(htmlEl))
}

export function recoverLatexFromKatexText(content: string) {
  const reg1 = /\s+[^\s\n]{1}[\s|\n][\s|\n]/g
  const reg2 = /\\begin{.+?end{\w+?}$/
  const latexPattern = 'begin{'
  let refinedContent = content.replace(reg1, '').trim()
  if (refinedContent.includes(latexPattern)) {
    const matchRes = refinedContent.match(reg2)
    if (matchRes?.length) {
      refinedContent = matchRes[0]
    }
  }
  return refinedContent
}

function parseKatexChildren(parent: HTMLElement) {
  let latex = ''
  let previousRenderable: HTMLElement | null = null

  for (const child of Array.from(parent.children) as HTMLElement[]) {
    if (isIgnoredKatexNode(child)) continue

    if (child.classList.contains('msupsub')) {
      const scripts = parseKatexScripts(child, previousRenderable)
      if (scripts.sup) latex += `^{${scripts.sup}}`
      if (scripts.sub) latex += `_{${scripts.sub}}`
      continue
    }

    const piece = parseKatexNode(child)
    if (!piece) continue

    latex += piece
    previousRenderable = child
  }

  return latex || parseKatexText(parent.textContent || '')
}

function parseKatexNode(el: HTMLElement): string {
  if (isIgnoredKatexNode(el)) return ''

  if (el.classList.contains('mtable')) return parseKatexTable(el)

  if (el.classList.contains('minner') && el.querySelector('.mtable')) {
    return parseKatexTable(el.querySelector('.mtable') as HTMLElement)
  }

  if (el.classList.contains('mrel') && isKatexNotEquals(el)) return '\\ne'

  if (el.classList.contains('mspace')) return parseKatexSpace(el)

  if (el.classList.contains('mathbb')) {
    return `\\mathbb{${parseKatexText(el.textContent || '')}}`
  }

  if (el.classList.contains('mathcal')) {
    return `\\mathcal{${parseKatexText(el.textContent || '')}}`
  }

  if (el.classList.contains('mathrm')) {
    return `\\mathrm{${parseKatexText(el.textContent || '')}}`
  }

  if (el.children.length) {
    return parseKatexChildren(el)
  }

  return parseKatexText(el.textContent || '')
}

function parseKatexTable(el: HTMLElement) {
  const columns = Array.from(el.querySelectorAll<HTMLElement>(':scope > .col-align-l')).map(
    parseKatexTableColumn,
  )
  const rowCount = Math.max(0, ...columns.map((column) => column.length))
  if (!rowCount) return ''

  const rows: string[] = []
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const cells = columns
      .map((column) => column[rowIndex]?.latex || '')
      .filter((cell) => cell.length > 0)
    if (cells.length) rows.push(cells.join(' & '))
  }

  if (!rows.length) return ''
  return `\\begin{cases} ${rows.join(' \\\\ ')} \\end{cases}`
}

function parseKatexTableColumn(el: HTMLElement) {
  return Array.from(
    el.querySelectorAll<HTMLElement>(':scope > .vlist-t .vlist-r:first-child > .vlist > span'),
  )
    .map((row) => ({
      top: getKatexTop(row),
      latex: cleanKatexLatex(parseKatexChildren(row)),
    }))
    .filter((row) => row.latex.length > 0)
    .sort((a, b) => a.top - b.top)
}

function getKatexTop(el: HTMLElement) {
  const match = (el.getAttribute('style') || '').match(/top:\s*(-?\d+(?:\.\d+)?)em/)
  return match ? Number(match[1]) : 0
}

function isKatexNotEquals(el: HTMLElement) {
  const text = el.textContent || ''
  return text.includes('\ue020') && text.includes('=')
}

function parseKatexScripts(el: HTMLElement, reference: HTMLElement | null) {
  const scripts: { sup: string; sub: string } = { sup: '', sub: '' }
  const referenceRect = reference?.getBoundingClientRect()
  const referenceCenter =
    referenceRect && referenceRect.height > 0 ? referenceRect.top + referenceRect.height / 2 : null

  const candidates = Array.from(
    el.querySelectorAll<HTMLElement>('.vlist-r > .vlist > span'),
  ).filter((candidate) => {
    const text = (candidate.textContent || '').replaceAll('\u200b', '').trim()
    return text.length > 0
  })

  for (const candidate of candidates) {
    const contentEl = Array.from(candidate.children).find(
      (child) => !(child as HTMLElement).classList.contains('pstrut'),
    ) as HTMLElement | undefined
    const latex = cleanKatexLatex(
      contentEl ? parseKatexNode(contentEl) : parseKatexText(candidate.textContent || ''),
    )
    if (!latex) continue

    const candidateRect = (contentEl || candidate).getBoundingClientRect()
    const candidateCenter =
      candidateRect.height > 0 ? candidateRect.top + candidateRect.height / 2 : null
    const isSup =
      referenceCenter !== null && candidateCenter !== null ? candidateCenter < referenceCenter : false

    if (isSup) {
      scripts.sup = latex
    } else {
      scripts.sub = latex
    }
  }

  return scripts
}

function isIgnoredKatexNode(el: HTMLElement) {
  return (
    el.classList.contains('strut') ||
    el.classList.contains('pstrut') ||
    el.classList.contains('vlist-s') ||
    el.classList.contains('frac-line') ||
    el.getAttribute('aria-hidden') === 'true'
  )
}

function parseKatexSpace(el: HTMLElement) {
  const rawStyle = el.getAttribute('style') || ''
  if (/margin-right:\s*1(?:\.0+)?em/.test(rawStyle)) return '\\quad '
  if (/margin-right:\s*2(?:\.0+)?em/.test(rawStyle)) return '\\qquad '
  return ''
}

function parseKatexText(text: string) {
  const symbolMap: Record<string, string> = {
    '\u200b': '',
    '−': '-',
    '…': '\\ldots',
    '⋯': '\\cdots',
    '∙': ' \\bullet ',
    '·': ' \\cdot ',
    '×': ' \\times ',
    '⊗': ' \\otimes ',
    '⊕': ' \\oplus ',
    '→': ' \\to ',
    '←': ' \\leftarrow ',
    '↦': ' \\mapsto ',
    '≅': ' \\cong ',
    '≃': ' \\simeq ',
    '≈': ' \\approx ',
    '∼': ' \\sim ',
    '≤': ' \\le ',
    '≥': ' \\ge ',
    '∈': ' \\in ',
    '∉': ' \\notin ',
    '⊂': ' \\subset ',
    '⊆': ' \\subseteq ',
    '∪': ' \\cup ',
    '∩': ' \\cap ',
    '∅': '\\emptyset',
    '∞': '\\infty',
    'ℤ': '\\mathbb{Z}',
    'ℚ': '\\mathbb{Q}',
    'ℝ': '\\mathbb{R}',
    'ℂ': '\\mathbb{C}',
    'α': '\\alpha',
    'β': '\\beta',
    'γ': '\\gamma',
    'δ': '\\delta',
    'ε': '\\epsilon',
    'θ': '\\theta',
    'λ': '\\lambda',
    'μ': '\\mu',
    'π': '\\pi',
    'σ': '\\sigma',
    'φ': '\\phi',
    'ω': '\\omega',
  }

  return Array.from(text)
    .map((char) => symbolMap[char] || char)
    .join('')
}

function cleanKatexLatex(latex: string) {
  return latex
    .replaceAll('\u200b', '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,;:)])/g, '$1')
    .replace(/([([])\s+/g, '$1')
    .trim()
}

