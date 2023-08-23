let clipboard = navigator.clipboard

export function initClipboard() {
  // http webpage cannot use native clipboard api
  if (!clipboard) {
    import('clipboard-polyfill').then((res) => (clipboard = res))
  }
}

export function copyLatex(latexContent, el) {
  // https://web.dev/async-clipboard/
  clipboard.writeText(latexContent).then(() => addCopiedStyle(el))
}

export function copyLatexAsImage(latexBlob, el) {
  clipboard
    .write([
      new ClipboardItem({
        [latexBlob.type]: latexBlob,
      }),
    ])
    .then(() => {
      addCopiedStyle(el)
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
  let { clientWidth: width, clientHeight: height } = svgElement
  let clonedSvgElement = svgElement.cloneNode(true)
  let outerHTML = clonedSvgElement.outerHTML
  const blob = new Blob([outerHTML], { type: 'image/svg+xml;charset=utf-8' })
  const blobURL = URL.createObjectURL(blob)
  return loadImage(blobURL).then((image) => {
    let canvas = document.createElement('canvas')
    // 高分屏
    // increase the actual size of our canvas
    canvas.width = width * devicePixelRatio
    canvas.height = height * devicePixelRatio

    // ensure all drawing operations are scaled
    let context = canvas.getContext('2d')
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
