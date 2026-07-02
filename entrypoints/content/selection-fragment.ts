import type { SelectionFormulaTarget } from './selection-targets'

const copyMarkerAttr = 'data-mfh-copy-id'

export type MarkedSelectionFormulaTarget = SelectionFormulaTarget & {
  marker: string
}

export function markSelectionTargets(
  targets: SelectionFormulaTarget[],
): MarkedSelectionFormulaTarget[] {
  return targets.map((target) => {
    const marker = crypto.randomUUID()
    target.replaceRoot.setAttribute(copyMarkerAttr, marker)
    return { ...target, marker }
  })
}

export function unmarkSelectionTargets(targets: MarkedSelectionFormulaTarget[]) {
  for (const { replaceRoot } of targets) {
    replaceRoot.removeAttribute(copyMarkerAttr)
  }
}

export function findFormulaFragmentElement(root: HTMLElement, marker: string) {
  const fragEl = root.querySelector(
    `[${copyMarkerAttr}="${CSS.escape(marker)}"]`,
  ) as HTMLElement | null
  if (!fragEl) return null

  removeFormulaCompanionNodes(fragEl)
  return fragEl
}

export function cleanSelectionFragmentText(root: HTMLElement, fallback: string) {
  cleanCopyMarkers(root)
  cleanTextNodes(root)
  return normalizeSelectionFragmentText(root.textContent || fallback)
}

export function cleanSelectionFragmentHtml(root: HTMLElement) {
  cleanCopyMarkers(root)
  cleanTextNodes(root)
  return root.innerHTML
}

export function shouldKeepSpaceAfterFormula(root: HTMLElement) {
  const nextText = getAdjacentText(root, 'next')
  if (!nextText) return true
  return !/^\s*[,.;:!?，。；：！？)\]}）】、]/u.test(nextText)
}

export function shouldKeepSpaceBeforeFormula(root: HTMLElement) {
  const previousText = getAdjacentText(root, 'previous')
  if (!previousText) return false
  return !/[\s([{（【]$/u.test(previousText)
}

function removeFormulaCompanionNodes(root: HTMLElement) {
  removeFormulaCompanionNode(root.previousSibling, 'previous')
  removeFormulaCompanionNode(root.nextSibling, 'next')
}

function removeFormulaCompanionNode(node: Node | null, direction: 'previous' | 'next') {
  const candidate = skipWhitespaceText(node, direction)
  if (!isFormulaCompanionElement(candidate)) return
  candidate.remove()
}

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

function skipWhitespaceText(node: Node | null, direction: 'previous' | 'next') {
  let current = node
  while (current?.nodeType === Node.TEXT_NODE && !current.textContent?.trim()) {
    current = direction === 'next' ? current.nextSibling : current.previousSibling
  }
  return current
}

function isFormulaCompanionElement(node: Node | null): node is HTMLElement {
  if (!(node instanceof HTMLElement)) return false
  if (node.matches('script[type^="math/"],script[type*="math/tex"],script[type*="math/mml"]')) {
    return true
  }
  return node.classList.contains('MathJax_Preview')
}

function cleanCopyMarkers(root: HTMLElement) {
  root.querySelectorAll(`[${copyMarkerAttr}]`).forEach((el) => {
    el.removeAttribute(copyMarkerAttr)
  })
}

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

function normalizeSelectionFragmentText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .trim()
}
