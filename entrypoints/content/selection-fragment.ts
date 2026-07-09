import type { SelectionFormulaTarget } from './selection-targets'

const copyMarkerAttr = 'data-mfh-copy-id'

export type MarkedSelectionFormulaTarget = SelectionFormulaTarget & {
  marker: string
}

// Marks live DOM formula roots so cloned selection fragments can find matching nodes.
export function markSelectionTargets(
  targets: SelectionFormulaTarget[],
): MarkedSelectionFormulaTarget[] {
  return targets.map((target) => {
    const marker = crypto.randomUUID()
    target.replaceRoot.setAttribute(copyMarkerAttr, marker)
    return { ...target, marker }
  })
}

// Removes temporary selection markers from live formula roots after copy handling finishes.
export function unmarkSelectionTargets(targets: MarkedSelectionFormulaTarget[]) {
  for (const { replaceRoot } of targets) {
    replaceRoot.removeAttribute(copyMarkerAttr)
  }
}

// Finds the cloned formula node by marker and removes nearby script/preview companion nodes.
export function findFormulaFragmentElement(root: HTMLElement, marker: string) {
  const fragEl = root.querySelector(
    `[${copyMarkerAttr}="${CSS.escape(marker)}"]`,
  ) as HTMLElement | null
  if (!fragEl) return null

  removeFormulaCompanionNodes(fragEl)
  return fragEl
}

// Cleans cloned selection text after formula replacement and falls back to native selection text.
export function cleanSelectionFragmentText(root: HTMLElement, fallback: string) {
  cleanCopyMarkers(root)
  cleanTextNodes(root)
  return normalizeSelectionFragmentText(root.textContent || fallback)
}

// Cleans cloned selection HTML for rich Word Native clipboard output.
export function cleanSelectionFragmentHtml(root: HTMLElement) {
  cleanCopyMarkers(root)
  cleanTextNodes(root)
  return root.innerHTML
}

// Decides whether inline MathML needs trailing space before the following text.
export function shouldKeepSpaceAfterFormula(root: HTMLElement) {
  const nextText = getAdjacentText(root, 'next')
  if (!nextText) return true
  return !/^\s*[,.;:!?，。；：！？)\]}）】、]/u.test(nextText)
}

// Decides whether rich replacement needs a leading space before the formula.
export function shouldKeepSpaceBeforeFormula(root: HTMLElement) {
  const previousText = getAdjacentText(root, 'previous')
  if (!previousText) return false
  return !/[\s([{（【]$/u.test(previousText)
}

// Removes script or preview nodes that become noise once a formula is replaced.
function removeFormulaCompanionNodes(root: HTMLElement) {
  removeFormulaCompanionNode(root.previousSibling, 'previous')
  removeFormulaCompanionNode(root.nextSibling, 'next')
}

// Removes one adjacent companion node after skipping whitespace in the requested direction.
function removeFormulaCompanionNode(node: Node | null, direction: 'previous' | 'next') {
  const candidate = skipWhitespaceText(node, direction)
  if (!isFormulaCompanionElement(candidate)) return
  candidate.remove()
}

// Reads the closest meaningful neighboring text around a formula fragment.
function getAdjacentText(root: HTMLElement, direction: 'previous' | 'next') {
  let current = direction === 'next' ? root.nextSibling : root.previousSibling

  while (current) {
    if (current.nodeType === Node.TEXT_NODE) return current.textContent || ''
    if (current instanceof HTMLElement) {
      const text = current.textContent || ''
      if (text.trim()) return text
    }
    current = direction === 'next' ? current.nextSibling : current.previousSibling
  }

  return ''
}

// Skips pure-whitespace text nodes while preserving direction for adjacency checks.
function skipWhitespaceText(node: Node | null, direction: 'previous' | 'next') {
  let current = node
  while (current?.nodeType === Node.TEXT_NODE && !current.textContent?.trim()) {
    current = direction === 'next' ? current.nextSibling : current.previousSibling
  }
  return current
}

// Identifies MathJax script/preview companions that should not leak into copied text.
function isFormulaCompanionElement(node: Node | null): node is HTMLElement {
  if (!(node instanceof HTMLElement)) return false
  if (node.matches('script[type^="math/"],script[type*="math/tex"],script[type*="math/mml"]')) {
    return true
  }
  return node.classList.contains('MathJax_Preview')
}

// Removes temporary copy marker attributes from cloned fragments.
function cleanCopyMarkers(root: HTMLElement) {
  root.querySelectorAll(`[${copyMarkerAttr}]`).forEach((el) => {
    el.removeAttribute(copyMarkerAttr)
  })
}

// Collapses line breaks inside cloned text nodes without rewriting element structure.
function cleanTextNodes(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const dirtyPattern = /\s*[\r\n]+\s*/g
  let currentNode = walker.nextNode()

  while (currentNode) {
    if (currentNode.nodeValue && /[\r\n]/.test(currentNode.nodeValue)) {
      currentNode.nodeValue = currentNode.nodeValue.replace(dirtyPattern, ' ')
    }
    currentNode = walker.nextNode()
  }
}

// Produces plain copied text with natural spacing around replacement formulas.
function normalizeSelectionFragmentText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .trim()
}
