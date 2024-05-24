import { initClipboard, createOpacityImage } from './util'
import { rules } from './const'
import hotkeys from 'hotkeys-js'

let count = 0
let inited = false
let canCopyAll = false
let rule
function init(resetCount) {
  if (inited) return
  if (resetCount) count = 0
  if (document.visibilityState === 'hidden') return
  rule = Object.values(rules).find((item) => document.querySelector(item.selectorList.join()))
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
    const content = rule.pre(rule.parse(finalTarget))
    rule.post(finalTarget, content)
  })
}

init(true)

// turn all svg to image with latex alt
hotkeys('shift+up,esc', (_, handler) => {
  switch (handler.key) {
    case 'shift+up':
      fullPageCopy()
      break
    default:
  }
})

document.addEventListener('visibilitychange', () => {
  if (!inited && document.visibilityState === 'visible') {
    init(true)
  }
})

document.addEventListener('scroll', () => {
  if (!canCopyAll) return
  const ruleSelector = rule.selectorList.join()
  const elList = Array.from(document.querySelectorAll(ruleSelector)).filter((item) => !item.getAttribute('data-uuid'))
  if (!elList.length) return
  // TODO: wait until latex rendered
  fullPageCopy(elList)
})

async function fullPageCopy(targetList = []) {
  canCopyAll = true
  const ruleSelector = rule.selectorList.join()
  let elList = targetList.length ? targetList : document.querySelectorAll(ruleSelector)
  for (let el of elList) {
    if (el.tagName === 'IMG') continue
    const uuid = crypto.randomUUID()
    const parent = el.parentNode
    let parentPosition = window.getComputedStyle(parent).position
    if (parentPosition === 'static') parent.style.position = 'relative'
    const content = rule.parse(el)
    el.setAttribute('data-uuid', uuid)
    if (!content || content instanceof Blob) continue
    let img = createOpacityImage({
      width: el.clientWidth,
      height: el.clientHeight,
      alt: content,
      id: uuid,
    })
    img.style.position = 'absolute'
    img.style.left = el.offsetLeft + 'px'
    img.style.top = el.offsetTop + 'px'
    img.style.zIndex = 100
    el.parentNode.insertBefore(img, el)
  }
}
