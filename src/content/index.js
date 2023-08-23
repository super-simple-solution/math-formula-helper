import { initClipboard } from './util'
import { rules } from 'const'

let count = 0
let inited = false
async function init(resetCount = false) {
  if (resetCount) count = 0
  const rule = Object.values(rules).find((item) => {
    return document.querySelector(item.selectorList.join())
  })
  if (count > 5) return
  count++
  if (!rule) {
    setTimeout(init, 1000)
    return
  }
  inited = true
  initClipboard()
  chrome.runtime.sendMessage({
    greeting: 'insert-css',
    data: rule.selectorList,
  })
  if (rule.key === 'math_jax_html') {
    window.Mathml2latex = await import('mathml-to-latex')
  }
  document.addEventListener('click', (e) => {
    const target = e.target
    const finalTarget = target.closest(rule.selectorList.join())
    if (!finalTarget) return
    rule.parser(finalTarget)
  })
}

init(true)

document.addEventListener('visibilitychange', () => {
  if (!inited && document.visibilityState === 'visible') {
    init(true)
  }
})
