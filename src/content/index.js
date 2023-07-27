const rules = {
  zhihu: {
    selector: '.MathJax_Preview + .MathJax_SVG_Display, .MathJax_Preview + .MathJax_SVG, .MathJax',
    parser: (el) => {
      if (!el) return
      const scriptEl = el.nextElementSibling
      if (scriptEl.tagName === 'SCRIPT' && scriptEl.type.includes('math/tex')) {
        const mathContent = scriptEl.textContent.trim()
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
}

function init() {
  document.addEventListener('click', (e) => {
    const target = e.target
    const finalTarget = target.closest(rules.zhihu.selector)
    if (!finalTarget) return
    rules.zhihu.parser(finalTarget)
  })
}

init()
