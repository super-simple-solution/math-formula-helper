const rules = {
  zhihu: {
    selector: '.MathJax_SVG, .MathJax',
    parser: (el) => {
      const scriptEl = el.nextElementSibling
      if (scriptEl.tagName === 'SCRIPT' && scriptEl.type.includes('math/tex')) {
        console.log('math res', scriptEl.textContent.trim())
        // https://web.dev/async-clipboard/
        navigator.clipboard.writeText(scriptEl.textContent.trim()).then(() => {
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

document.addEventListener('click', (e) => {
  const target = e.target
  const finalTarget = target.closest(rules.zhihu.selector)
  if (!finalTarget) return
  rules.zhihu.parser(finalTarget)
})
