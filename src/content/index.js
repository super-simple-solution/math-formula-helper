import { selectorList } from './const'

const rules = {
  zhihu: {
    selector: selectorList.join(),
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

let count = 0
function init() {
  const selector = rules.zhihu.selector
  if (count > 5) return
  count++
  if (!document.querySelector(selector)) {
    setTimeout(init, 1000)
  }
  // inject css
  chrome.runtime.sendMessage({
    greeting: 'insert-css',
  })
  document.addEventListener('click', (e) => {
    const target = e.target
    const finalTarget = target.closest(selector)
    if (!finalTarget) return
    rules.zhihu.parser(finalTarget)
  })
}
init()
