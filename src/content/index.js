import { initClipboard } from './util'
import { rules } from './const'
// import hotkeys from 'hotkeys-js'

let count = 0
let inited = false
function init(resetCount) {
  if (inited) return
  if (resetCount) count = 0
  if (document.visibilityState === 'hidden') return
  const rule = Object.values(rules).find((item) => {
    return document.querySelector(item.selectorList.join())
  })
  if (count > 5) return
  count++
  if (!rule) {
    setTimeout(init, 2000)
    return
  }
  inited = true
  initClipboard()
  chrome.runtime.sendMessage({
    greeting: 'insert-css',
    data: rule.selectorList,
  })
  if (rule.key === 'math_jax_html') {
    import('mathml-to-latex').then((res) => {
      window.Mathml2latex = res.MathMLToLaTeX
    })
  }
  document.body.addEventListener('click', (e) => {
    const target = e.target
    const finalTarget = target.closest(rule.selectorList.join())
    if (!finalTarget) return
    rule.parser(finalTarget)
  })
}

init(true)

// turn all svg to image with latex alt
// hotkeys('shift+up,esc', function (event, handler) {
//   switch (handler.key) {
//     case 'shift+up':
//       focusIns && focusIns.init()
//       break
//     case 'esc':
//       focusIns && focusIns.unFocus()
//       break
//     default:
//   }
// })

document.addEventListener('visibilitychange', () => {
  if (!inited && document.visibilityState === 'visible') {
    init(true)
  }
})
