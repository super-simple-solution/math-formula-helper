import { uuid } from '@/lib'
import { sendBrowserMessage } from '@/lib/extension-action'
import {
  defaultLatexSymbol,
  defaultNormalization,
  defaultOutputProfile,
  latexFormat,
} from '@/lib/latex'
import { LatexQueue, type Prefer, getPreference, watchPreference } from '@/lib/storage'
import { toast } from '@/lib/toast'
import * as clipboardPolyfill from 'clipboard-polyfill'
import { MathMLToLaTeX } from 'mathml-to-latex'
import type { Unwatch } from 'wxt/utils/storage'
import type { Rule } from './const'

let preferData: Prefer = {
  show_toast: true,
  output_profile: defaultOutputProfile,
  format_signs: defaultLatexSymbol,
  normalization: defaultNormalization,
}

function initPrefer() {
  getPreference().then(setPrefer)
}

function setPrefer(prefer: Prefer) {
  preferData = prefer
}

export function watchPrefer(): Unwatch {
  initPrefer()
  return watchPreference(setPrefer)
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

export async function copyLatex(latexContent: string, options = { text: 'Copied' }) {
  const content = latexFormat(latexContent, preferData)
  await clipboard.writeText(content)
  if (preferData.show_toast) {
    toast(options)
  }
  LatexQueue.enqueue({
    url: location.href.replace(location.hash, ''),
    value: latexContent,
    id: uuid(),
  })
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
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return

  const range = selection.getRangeAt(0)
  const fragment = range.cloneContents()
  const div = document.createElement('div')
  div.appendChild(fragment)

  let hasFormulaReplacement = false
  const handledLiveElements: HTMLElement[] = []

  for (const currentRule of activeRules) {
    const selector = currentRule.selectorList.join(',')
    let liveCandidates: HTMLElement[] = []

    try {
      liveCandidates = Array.from(document.querySelectorAll(selector)) as HTMLElement[]
    } catch {
      continue
    }

    const liveMatches = liveCandidates.filter((el) => {
      if (!range.intersectsNode(el)) return false
      return !handledLiveElements.some(
        (handled) => handled === el || handled.contains(el) || el.contains(handled),
      )
    })

    const replaceTasks = liveMatches.map(async (liveEl, index) => {
      let latex: string | Blob | null = null
      try {
        latex = await currentRule.parse(liveEl)
      } catch {
        latex = null
      }

      if (typeof latex !== 'string' || !latex) return

      const fragEl = findFragmentElement(div, selector, liveEl, index)
      if (!fragEl) return

      const formattedLatex = latexFormat(currentRule.pre(latex), preferData)
      const textNode = document.createTextNode(` ${formattedLatex} `)
      const wrapper = fragEl.closest('tex-math')
      const targetToReplace = wrapper || fragEl

      if (targetToReplace.parentNode) {
        targetToReplace.parentNode.replaceChild(textNode, targetToReplace)
        handledLiveElements.push(liveEl)
        hasFormulaReplacement = true
      }
    })

    await Promise.all(replaceTasks)
  }

  if (!hasFormulaReplacement) return

  e.preventDefault()
  cleanTextNodes(div)
  await clipboard.writeText(div.textContent || '')

  if (preferData.show_toast) {
    toast({ text: 'Copied with LaTeX' })
  }
}

function findFragmentElement(
  root: HTMLElement,
  selector: string,
  liveEl: HTMLElement,
  fallbackIndex: number,
) {
  if (liveEl.id) {
    const byId = root.querySelector(`#${CSS.escape(liveEl.id)}`) as HTMLElement | null
    if (byId) return byId
  }

  try {
    const candidates = Array.from(root.querySelectorAll(selector)) as HTMLElement[]
    return candidates[fallbackIndex] || null
  } catch {
    return null
  }
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
