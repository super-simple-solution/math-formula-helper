import { MathMLToLaTeX } from 'mathml-to-latex'

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

export async function initMathml() {
  if (!window.Mathml2latex) {
    window.Mathml2latex = MathMLToLaTeX
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
