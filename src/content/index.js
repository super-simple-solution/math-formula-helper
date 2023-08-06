import Mathml2latex from 'mathml-to-latex'
import { copyLatex } from './util'

const rules = {
  math_jax: {
    selectorList: ['.MathJax_Preview + .MathJax_SVG_Display', '.MathJax_Preview + .MathJax_SVG', '.MathJax'],
    parser: (el) => {
      if (!el) return
      const scriptEl = el.nextElementSibling
      if (scriptEl.tagName === 'SCRIPT' && scriptEl.type.includes('math/tex')) {
        const mathContent = scriptEl.textContent.trim()
        if (!mathContent.length) return
        copyLatex(mathContent, el)
      }
    },
  },
  math_ml: {
    selectorList: ['.math .katex'],
    parser: (el) => {
      if (!el) return
      const annotationEl = el.querySelector('.katex-mathml annotation')
      // 获取数学公式dom及属性
      if (annotationEl.getAttribute('encoding').includes('application/x-tex')) {
        const mathContent = annotationEl.textContent.trim()
        if (!mathContent.length) return
        copyLatex(mathContent, el)
      }
    },
  },
  math_jax_html: {
    selectorList: ['mjx-container.MathJax'],
    parser: (el) => {
      if (!el) return
      const mathEl = el.querySelector('mjx-math + mjx-assistive-mml')
      // MathML2LaTeX
      const latexContent = Mathml2latex.convert(mathEl.innerHTML)
      copyLatex(latexContent, el)
    },
  },
}

let count = 0
function init() {
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
  document.addEventListener('click', (e) => {
    const target = e.target
    const finalTarget = target.closest(rule.selectorList.join())
    if (!finalTarget) return
    rule.parser(finalTarget)
  })
}
init()
