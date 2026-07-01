import { uuid } from '@/lib'
import { sendBrowserMessage } from '@/lib/extension-action'
import {
  defaultBracePolicy,
  defaultEnvironmentPolicy,
  defaultHistoryValueMode,
  defaultLatexSymbol,
  defaultNormalization,
  defaultOutputProfile,
  defaultTagPolicy,
  HistoryValueMode,
  latexFormat,
} from '@/lib/latex'
import { LatexQueue, type Prefer, getPreference, watchPreference } from '@/lib/storage'
import { toast } from '@/lib/toast'
import * as clipboardPolyfill from 'clipboard-polyfill'
import { MathMLToLaTeX } from 'mathml-to-latex'
import type { Unwatch } from 'wxt/utils/storage'
import type { Rule } from './const'
import {
  describeCopyResult,
  toCopyResult,
  type CopyResult,
  type CopyResultMetadata,
} from './copy-result'

let preferData: Prefer = {
  show_toast: true,
  show_source_quality: true,
  selection_copy: true,
  history_value: defaultHistoryValueMode,
  output_profile: defaultOutputProfile,
  format_signs: defaultLatexSymbol,
  normalization: defaultNormalization,
  tag_policy: defaultTagPolicy,
  environment_policy: defaultEnvironmentPolicy,
  brace_policy: defaultBracePolicy,
}

function initPrefer() {
  runContentTask(() => getPreference().then(setPrefer), 'load preference')
}

function setPrefer(prefer: Prefer) {
  preferData = prefer
}

export function watchPrefer(): Unwatch {
  initPrefer()
  try {
    return watchPreference(setPrefer)
  } catch (error) {
    handleContentError(error, 'watch preference')
    return () => {}
  }
}

export function runContentTask(task: Promise<unknown> | (() => Promise<unknown>), label: string) {
  try {
    const promise = typeof task === 'function' ? task() : task
    promise.catch((error) => handleContentError(error, label))
  } catch (error) {
    handleContentError(error, label)
  }
}

export function handleContentError(error: unknown, label: string) {
  if (isExtensionContextInvalidated(error)) return

  console.warn(`[math-formula-helper] ${label} failed`, error)
}

export function isExtensionContextInvalidated(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error || '')

  return /Extension context invalidated|context invalidated|Extension context was invalidated/i.test(
    message,
  )
}

let clipboard: Clipboard =
  navigator.clipboard ||
  ({
    ...clipboardPolyfill,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  } as Clipboard)

export async function initClipboard() {
  if (!clipboard) {
    clipboard = {
      ...clipboardPolyfill,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    } as Clipboard
  }
}

export async function initMathml() {
  if (!window.Mathml2latex) {
    window.Mathml2latex = MathMLToLaTeX
  }
}

export function cleanMathml(mathml: string) {
  const source = mathml.trim()
  if (!source) return source

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(source, 'application/xml')
    if (doc.querySelector('parsererror')) return source

    const allowedAttrs = new Set([
      'xmlns',
      'display',
      'encoding',
      'mathvariant',
      'stretchy',
      'fence',
      'separator',
      'accent',
      'accentunder',
      'lspace',
      'rspace',
    ])

    doc.querySelectorAll('*').forEach((node) => {
      for (const attr of Array.from(node.attributes)) {
        if (allowedAttrs.has(attr.name) || attr.name.startsWith('xmlns')) continue
        node.removeAttribute(attr.name)
      }
    })

    return new XMLSerializer().serializeToString(doc.documentElement)
  } catch {
    return source
  }
}

export async function getMathJaxSourceFromPage(elementId: string): Promise<string | null> {
  try {
    const source = await sendBrowserMessage({
      greeting: 'get-mathjax-source',
      data: { elementId },
    })
    return typeof source === 'string' && source ? source : null
  } catch {
    return null
  }
}
export async function formatCopiedText() {
  const text = await clipboard.readText()
  await clipboard.writeText(text)
}

export async function copyLatex(
  latexContent: string,
  options = { text: 'Copied' },
  metadata: CopyResultMetadata = {},
) {
  const content = latexFormat(latexContent, preferData)
  await clipboard.writeText(content)
  if (preferData.show_toast) {
    toast({
      ...options,
      text:
        preferData.show_source_quality && metadata.sourceKind
          ? `${options.text} (${describeCopyResult(metadata)})`
          : options.text,
    })
  }

  const historyValueMode = preferData.history_value ?? HistoryValueMode.Raw
  const storesFormatted =
    historyValueMode === HistoryValueMode.Formatted || historyValueMode === HistoryValueMode.Both

  await LatexQueue.enqueue({
    url: location.href.replace(location.hash, ''),
    value: historyValueMode === HistoryValueMode.Formatted ? content : latexContent,
    valueMode: historyValueMode,
    formatted: storesFormatted ? content : undefined,
    id: uuid(),
    sourceKind: preferData.show_source_quality ? metadata.sourceKind : undefined,
    quality: preferData.show_source_quality ? metadata.quality : undefined,
    displayMode: preferData.show_source_quality ? metadata.displayMode : undefined,
    warnings: preferData.show_source_quality ? metadata.warnings : undefined,
  }).catch((error) => handleContentError(error, 'save copy history'))
}

export async function copyLatexAsImage(
  latexBlob: Blob,
  options = { text: 'LaTeX content not found, Copied it as Image' },
) {
  await clipboard.write([
    new ClipboardItem({
      [latexBlob.type]: latexBlob,
    }),
  ])
  if (preferData.show_toast) {
    toast(options)
  }
}

export function addCopiedStyle(el: HTMLElement) {
  el.classList.add('sss-copied')
  el.addEventListener(
    'mouseout',
    () => {
      setTimeout(() => el.classList.remove('sss-copied'), 500)
    },
    { once: true },
  )
}

export async function svgToImage(svgElement: SVGSVGElement): Promise<Blob> {
  const { clientWidth: width, clientHeight: height } = svgElement
  const clonedSvgElement = svgElement.cloneNode(true) as HTMLElement
  const outerHTML = clonedSvgElement.outerHTML
  const blob = new Blob([outerHTML], { type: 'image/svg+xml;charset=utf-8' })
  const blobURL = URL.createObjectURL(blob)

  const image = await loadImage(blobURL)
  const canvas = document.createElement('canvas')
  canvas.width = width * devicePixelRatio
  canvas.height = height * devicePixelRatio

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not get canvas context')
  context.scale(devicePixelRatio, devicePixelRatio)
  context.drawImage(image, 0, 0, width, height)

  URL.revokeObjectURL(blobURL)
  return getCanvasBlob(canvas)
}

function getCanvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
    })
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = url
  })
}

export function createOpacityImage(options: {
  width: number
  height: number
  id: string
  alt: string
}): HTMLImageElement | undefined {
  const { width, height, id, alt } = options
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = 'rgba(255, 0, 0, 0)'
  ctx.fillRect(0, 0, width, height)

  const imageDataURL = canvas.toDataURL('image/png')
  const img = new Image()
  img.src = imageDataURL
  img.id = id
  img.alt = latexFormat(alt, preferData)
  return img
}

export async function handleMixedCopy(e: ClipboardEvent, activeRules: Rule[]) {
  if (!preferData.selection_copy) return

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return

  const range = expandRangeToWholeFormulas(selection.getRangeAt(0), activeRules)
  const targets = collectSelectionFormulaTargets(range, activeRules)
  if (!targets.length) return

  e.preventDefault()

  const markedTargets = targets.map((target) => {
    const marker = crypto.randomUUID()
    target.replaceRoot.setAttribute('data-mfh-copy-id', marker)
    return { ...target, marker }
  })

  try {
    const fragment = range.cloneContents()
    const div = document.createElement('div')
    div.appendChild(fragment)

    let hasFormulaReplacement = false

    for (const { rule, el: liveEl, marker } of markedTargets) {
      const fragEl = findMarkedFragmentElement(div, marker)
      if (!fragEl) continue
      removeFormulaCompanionNodes(fragEl)

      let latex: CopyResult | null = null
      try {
        latex = toCopyResult(await rule.parse(liveEl), { displayMode: 'unknown' })
      } catch {
        latex = null
      }

      if (!latex || typeof latex.content !== 'string') continue

      const formattedLatex = latexFormat(rule.pre(latex.content), preferData)
      const textNode = document.createTextNode(` ${formattedLatex} `)

      if (fragEl.parentNode) {
        fragEl.parentNode.replaceChild(textNode, fragEl)
        hasFormulaReplacement = true
      }
    }

    cleanCopyMarkers(div)
    cleanTextNodes(div)
    await clipboard.writeText(cleanSelectionClipboardText(div.textContent || selection.toString()))

    if (hasFormulaReplacement && preferData.show_toast) {
      toast({ text: 'Copied with LaTeX' })
    }
  } finally {
    for (const { replaceRoot } of markedTargets) {
      replaceRoot.removeAttribute('data-mfh-copy-id')
    }
  }
}

type SelectionFormulaTarget = {
  rule: Rule
  el: HTMLElement
  replaceRoot: HTMLElement
}

function expandRangeToWholeFormulas(range: Range, activeRules: Rule[]) {
  const expandedRange = range.cloneRange()
  const startTarget = findFormulaTargetFromNode(expandedRange.startContainer, activeRules)
  const endTarget = findFormulaTargetFromNode(expandedRange.endContainer, activeRules)

  if (startTarget) expandedRange.setStartBefore(startTarget.replaceRoot)
  if (endTarget) expandedRange.setEndAfter(endTarget.replaceRoot)

  return expandedRange
}

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

function collectSelectionFormulaTargets(range: Range, activeRules: Rule[]) {
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

function createSelectionTarget(rule: Rule, el: HTMLElement): SelectionFormulaTarget {
  return {
    rule,
    el,
    replaceRoot: getFormulaReplacementRoot(el),
  }
}

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

function areOverlappingFormulaTargets(a: HTMLElement, b: HTMLElement) {
  return a === b || a.contains(b) || b.contains(a)
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

function getFormulaReplacementRoot(el: HTMLElement) {
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

function rangeIntersectsNode(range: Range, node: Node) {
  try {
    return range.intersectsNode(node)
  } catch {
    return false
  }
}

function findMarkedFragmentElement(root: HTMLElement, marker: string) {
  return root.querySelector(`[data-mfh-copy-id="${CSS.escape(marker)}"]`) as HTMLElement | null
}

function cleanCopyMarkers(root: HTMLElement) {
  root.querySelectorAll('[data-mfh-copy-id]').forEach((el) => {
    el.removeAttribute('data-mfh-copy-id')
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

function cleanSelectionClipboardText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .trim()
}
