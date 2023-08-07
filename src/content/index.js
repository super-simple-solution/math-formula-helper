import { copyLatex, svgToImage, addCopiedStyle } from './util'
import Toastify from 'toastify-js'

let Mathml2latex

const isVIP = true

const rules = {
  math_jax: {
    testUrl: ['https://www.andlearning.org/math-formula/', 'https://zhuanlan.zhihu.com/p/115277553'],
    selectorList: [
      '.MathJax_Preview + .MathJax',
      '.MathJax_Preview + .MathJax_SVG_Display',
      '.MathJax_Preview + .MathJax_SVG',
      '.MathJax_Preview + .MathJax_Display',
    ],
    parser: (el) => {
      if (!el) return
      const scriptEl = el.nextElementSibling
      if (scriptEl.tagName === 'SCRIPT' && scriptEl.type.includes('math/tex')) {
        const latexContent = scriptEl.textContent.trim()
        if (!latexContent.length) return
        copyLatex(latexContent, el)
      }
    },
  },
  math_ml: {
    testUrl: ['https://juejin.cn/post/7210175991837507621'],
    selectorList: ['.math .katex'],
    parser: (el) => {
      if (!el) return
      const annotationEl = el.querySelector('.katex-mathml annotation')
      // 获取数学公式dom及属性
      if (annotationEl.getAttribute('encoding').includes('application/x-tex')) {
        const latexContent = annotationEl.textContent.trim()
        if (!latexContent.length) return
        copyLatex(latexContent, el)
      }
    },
  },
  math_jax_html: {
    key: 'math_jax_html',
    testUrl: ['https://www.mathreference.org/'],
    selectorList: ['mjx-container.MathJax'],
    parser: (el) => {
      if (!el) return
      const mathEl = el.querySelector('mjx-math + mjx-assistive-mml')
      // svg with no content
      if (!mathEl) {
        const svgEl = el.querySelector('svg')
        // TODO: overlay, and convert image to latex
        svgToImage(svgEl).then((blob) => {
          if (isVIP) {
            // TODO: send blob to server
          } else {
            navigator.clipboard
              .write([
                new ClipboardItem({
                  [blob.type]: blob,
                }),
              ])
              .then(() => {
                addCopiedStyle(el)
                Toastify({
                  text: 'Image copied',
                }).showToast()
              })
          }
        })
        return
      }
      // MathML2LaTeX
      if (!Mathml2latex) return
      const latexContent = Mathml2latex.convert(mathEl.innerHTML)
      copyLatex(latexContent, el)
    },
  },
}

let count = 0
async function init() {
  const rule = Object.values(rules).find((item) => {
    return document.querySelector(item.selectorList.join())
  })
  if (count > 5) return
  count++
  if (!rule) {
    setTimeout(init, 1000)
    return
  }
  chrome.runtime.sendMessage({
    greeting: 'insert-css',
    data: rule.selectorList,
  })
  if (rule.key === 'math_jax_html') {
    Mathml2latex = await import('mathml-to-latex')
  }
  document.addEventListener('click', (e) => {
    const target = e.target
    const finalTarget = target.closest(rule.selectorList.join())
    if (!finalTarget) return
    rule.parser(finalTarget)
  })
}
init()
