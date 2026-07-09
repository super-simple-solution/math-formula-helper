import { MathMLToLaTeX } from 'mathml-to-latex'

// Runs async content-script work without letting extension lifecycle errors crash listeners.
export function runContentTask(task: Promise<unknown> | (() => Promise<unknown>), label: string) {
  try {
    const promise = typeof task === 'function' ? task() : task
    promise.catch((error) => handleContentError(error, label))
  } catch (error) {
    handleContentError(error, label)
  }
}

// Logs actionable content-script errors while ignoring normal extension reload invalidations.
export function handleContentError(error: unknown, label: string) {
  if (isExtensionContextInvalidated(error)) return

  console.warn(`[math-formula-helper] ${label} failed`, error)
}

// Detects Chrome errors emitted when the extension reloads while a page still has old scripts.
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

// Exposes the MathML-to-LaTeX converter on window for rule code that runs in page context.
export async function initMathml() {
  if (!window.Mathml2latex) {
    window.Mathml2latex = MathMLToLaTeX
  }
}

// Marks a formula as copied until the next mouseout animation cleanup.
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

// Rasterizes SVG output to a clipboard-friendly image blob.
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

// Converts a rendered canvas into a PNG blob.
function getCanvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
    })
  })
}

// Loads an object URL into an image so it can be drawn to canvas.
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = url
  })
}
