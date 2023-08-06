import { injectScriptByUrl } from '@/utils/extension-action.js'
const rules = {
  // math_jax: {
  //   selectorList: ['.MathJax_Preview + .MathJax_SVG_Display', '.MathJax_Preview + .MathJax_SVG', '.MathJax'],
  //   parser: (el) => {
  //     if (!el) return
  //     const scriptEl = el.nextElementSibling
  //     if (scriptEl.tagName === 'SCRIPT' && scriptEl.type.includes('math/tex')) {
  //       const mathContent = scriptEl.textContent.trim()
  //       if (!mathContent.length) return
  //       // https://web.dev/async-clipboard/
  //       navigator.clipboard.writeText(mathContent).then(() => {
  //         el.classList.add('sss-copyed')
  //         el.addEventListener(
  //           'mouseout',
  //           () => {
  //             setTimeout(() => el.classList.remove('sss-copyed'), 500)
  //           },
  //           { once: true },
  //         )
  //       })
  //     }
  //   },
  // },
  math_ml: {
    selectorList: ['.math .katex'],
    parser: (el) => {
      if (!el) return
      const annotationEl = el.querySelector('.katex-mathml annotation')
      // 获取数学公式dom及属性
      if (annotationEl.getAttribute('encoding').includes('application/x-tex')) {
        const mathContent = annotationEl.textContent.trim()
        if (!mathContent.length) return
        // https://web.dev/async-clipboard/
        navigator.clipboard.writeText(mathContent).then(() => {
          el.classList.add('sss-copyed')
          el.addEventListener(
            'mouseout',
            () => {
              setTimeout(() => el.classList.remove('sss-copyed'), 500)
            },
            { once: true },
          )
        })
      }
    },
  },
  math_jax_svg: {
    selectorList: ['mjx-container.MathJax'],
    parser: (el) => {
      if (!el) return
      injectScriptByUrl('https://cdn.jsdelivr.net/npm/mathml2latex@1.1.3/lib/mathml2latex.browser.cjs.min.js')
      const mathEl = el.querySelector('[data-mml-node="math"]')
      setTimeout(() => {
        const latex = window.MathML2LaTeX.convert(mathEl.outerHTML)
        navigator.clipboard.writeText(latex).then(() => {
          el.classList.add('sss-copyed')
          el.addEventListener(
            'mouseout',
            () => {
              setTimeout(() => el.classList.remove('sss-copyed'), 500)
            },
            { once: true },
          )
        })
      }, 500)
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
