import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
let clipboard = navigator.clipboard

const toastConfig = {
  duration: 3000,
  position: 'center',
  style: {
    background: 'linear-gradient(to right, #00b09b, #96c93d)',
  },
}

export function initClipboard() {
  // http webpage cannot use native clipboard api
  if (!clipboard) {
    import('clipboard-polyfill').then((res) => {
      clipboard = res
    })
  }
}

export function initMathml() {
  if (!window.Mathml2latex) {
    return import('mathml-to-latex').then((res) => {
      window.Mathml2latex = res.MathMLToLaTeX
    })
  }
  return Promise.resolve(true)
}

export function formatCopiedText() {
  return clipboard.readText().then((text) => {
    // remove image markdown, juse pure text
    clipboard.writeText(text)
  })
}

export function copyLatex(latexContent, options = { text: 'Copied' }) {
  // https://web.dev/async-clipboard/
  return clipboard.writeText(latexContent).then(() => {
    return Toastify({
      ...toastConfig,
      text: options.text,
    }).showToast()
  })
}

export function copyLatexAsImage(
  latexBlob,
  options = { text: 'LaTeX content not found, Copied it as Image' },
) {
  return clipboard
    .write([
      new ClipboardItem({
        [latexBlob.type]: latexBlob,
      }),
    ])
    .then(() => {
      return Toastify({
        ...toastConfig,
        text: options.text,
      }).showToast()
    })
}

export function addCopiedStyle(el) {
  el.classList.add('sss-copied')
  el.addEventListener(
    'mouseout',
    () => {
      setTimeout(() => el.classList.remove('sss-copied'), 500)
    },
    { once: true },
  )
}

export function svgToImage(svgElement) {
  const { clientWidth: width, clientHeight: height } = svgElement
  const clonedSvgElement = svgElement.cloneNode(true)
  const outerHTML = clonedSvgElement.outerHTML
  const blob = new Blob([outerHTML], { type: 'image/svg+xml;charset=utf-8' })
  const blobURL = URL.createObjectURL(blob)
  return loadImage(blobURL).then((image) => {
    const canvas = document.createElement('canvas')
    // 高分屏
    // increase the actual size of our canvas
    canvas.width = width * devicePixelRatio
    canvas.height = height * devicePixelRatio

    // ensure all drawing operations are scaled
    const context = canvas.getContext('2d')
    context.scale(devicePixelRatio, devicePixelRatio)
    // draw image in canvas starting left-0 , top - 0
    context.drawImage(image, 0, 0, width, height)
    return getCanvasBlob(canvas)
  })
}

function getCanvasBlob(mycanvas) {
  return new Promise((resolve) => {
    mycanvas.toBlob((blob) => {
      resolve(blob)
    })
  })
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', (err) => reject(err))
    img.src = url
  })
}

export function createOpacityImage(options) {
  const { width, height, id, alt } = options
  const canvas = document.createElement('canvas')
  canvas.width = width // Set width of the canvas
  canvas.height = height // Set height of the canvas
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = 'rgba(255, 0, 0, 0)' // Red color with 50% transparency
  ctx.fillRect(0, 0, width, height) // Fill rectangle

  const imageDataURL = canvas.toDataURL('image/png')
  const img = new Image()
  img.src = imageDataURL
  img.id = id
  img.alt = alt
  return img
}
