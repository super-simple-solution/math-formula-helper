import type { Rule } from './const'

export type SelectionFormulaTarget = {
  rule: Rule
  el: HTMLElement
  replaceRoot: HTMLElement
}

// Expands selection boundaries when the user starts or ends inside a formula node.
export function expandRangeToWholeFormulas(range: Range, activeRules: Rule[]) {
  const expandedRange = range.cloneRange()
  const startTarget = findFormulaTargetFromNode(expandedRange.startContainer, activeRules)
  const endTarget = findFormulaTargetFromNode(expandedRange.endContainer, activeRules)

  if (startTarget) expandedRange.setStartBefore(startTarget.replaceRoot)
  if (endTarget) expandedRange.setEndAfter(endTarget.replaceRoot)

  return expandedRange
}

// Collects formula nodes intersecting the selection and de-duplicates nested targets.
export function collectSelectionFormulaTargets(range: Range, activeRules: Rule[]) {
  const targets: SelectionFormulaTarget[] = []

  for (const rule of activeRules) {
    const selector = rule.selectorList.join(',')
    let candidates: HTMLElement[] = []

    try {
      candidates = Array.from(document.querySelectorAll(selector)) as HTMLElement[]
    } catch {
      continue
    }

    for (const el of candidates) {
      if (!rangeIntersectsNode(range, el)) continue
      addSelectionTarget(targets, createSelectionTarget(rule, el))
    }
  }

  return targets.sort((a, b) => {
    if (a.replaceRoot === b.replaceRoot) return 0
    const position = a.replaceRoot.compareDocumentPosition(b.replaceRoot)
    return position & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1
  })
}

// Resolves the formula target containing a range boundary node.
function findFormulaTargetFromNode(node: Node, activeRules: Rule[]): SelectionFormulaTarget | null {
  const element = node instanceof Element ? node : node.parentElement
  if (!element) return null

  for (const rule of activeRules) {
    try {
      const target = element.closest(rule.selectorList.join(',')) as HTMLElement | null
      if (target) return createSelectionTarget(rule, target)
    } catch {}
  }

  return null
}

// Creates a selection target and chooses the DOM root that should be replaced in fragments.
function createSelectionTarget(rule: Rule, el: HTMLElement): SelectionFormulaTarget {
  return {
    rule,
    el,
    replaceRoot: findSelectionReplacementRoot(el),
  }
}

// Adds a target unless an overlapping wrapper already represents the same formula.
function addSelectionTarget(targets: SelectionFormulaTarget[], target: SelectionFormulaTarget) {
  const existingIndex = targets.findIndex((item) =>
    areOverlappingFormulaTargets(item.replaceRoot, target.replaceRoot),
  )

  if (existingIndex === -1) {
    targets.push(target)
    return
  }

  const existing = targets[existingIndex]
  if (target.replaceRoot.contains(existing.replaceRoot)) {
    targets[existingIndex] = target
  }
}

// Checks whether two candidate formula roots overlap in the DOM tree.
function areOverlappingFormulaTargets(a: HTMLElement, b: HTMLElement) {
  return a === b || a.contains(b) || b.contains(a)
}

// Promotes inner rendered nodes to their formula wrapper so replacement is structurally clean.
function findSelectionReplacementRoot(el: HTMLElement) {
  const root = el.closest(
    [
      'tex-math',
      '.mathjax-tex',
      '.MathJax_Display',
      '.MathJax_SVG_Display',
      '.MathJax_SVG',
      '.MathJax_CHTML',
      '.mjx-chtml',
      'mjx-container.MathJax',
      '.MathJax',
      '.katex-display',
      '.katex',
      '.ltx_equation',
      '.ltx_Math',
      '.display-math',
      'article-fulltext-disp-eq',
      '.article-fulltext-disp-eq',
      'inline-formula',
      '.inline-formula',
      '.maruku-mathml',
      'STX-N',
      '.STX-N',
      '.sss-img-latex',
    ].join(','),
  )
  return (root as HTMLElement | null) || el
}

// Safely checks selection intersection across browsers and detached nodes.
function rangeIntersectsNode(range: Range, node: Node) {
  try {
    return range.intersectsNode(node)
  } catch {
    return false
  }
}
