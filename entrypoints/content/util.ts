import { toast, uuid } from '@/lib'
import { latexFormat } from '@/lib/latex'
import { LatexQueue, type Prefer, getPreference, watchPreference } from '@/lib/storage'
import * as clipboardPolyfill from 'clipboard-polyfill'
import { MathMLToLaTeX } from 'mathml-to-latex'
import type { Unwatch } from 'wxt/storage'

let preferData: Prefer

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

export async function formatCopiedText() {
  const text = await clipboard.readText()
  await clipboard.writeText(text)
}

export async function copyLatex(latexContent: string, options = { text: 'Copied' }) {
  const content = latexFormat(latexContent, preferData.format_signs)
  await clipboard.writeText(content)
  if (preferData.show_toast) {
    toast(options)
  }
  LatexQueue.enqueue({
    url: location.href,
    value: latexContent, // 存储不带格式的latex, 使用时再带格式
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
  // 高分屏
  // increase the actual size of our canvas
  canvas.width = width * devicePixelRatio
  canvas.height = height * devicePixelRatio

  // ensure all drawing operations are scaled
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not get canvas context')
  context.scale(devicePixelRatio, devicePixelRatio)
  // draw image in canvas starting left-0 , top - 0
  context.drawImage(image, 0, 0, width, height)

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
  img.alt = latexFormat(alt, preferData.format_signs)
  return img
}
