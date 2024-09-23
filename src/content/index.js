import '@/style/index.scss'
import { initClipboard, createOpacityImage, formatCopiedText } from './util'
import { rules, ImageAltRule } from './const'
import hotkeys from 'hotkeys-js'

const latexPopover = document.createElement('latex-popover')
document.querySelector('html').appendChild(latexPopover)

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
    data: [...rule.selectorList, ...ImageAltRule.selectorList],
  })
  if (rule.key === 'math_jax_html') {
    import('mathml-to-latex').then((res) => {
      window.Mathml2latex = res.MathMLToLaTeX
    })
  }
  document.body.addEventListener('click', (e) => {
    const target = e.target
    const curRule = canCopyAll ? ImageAltRule : rule
    const selector = curRule.selectorList.join()
    const finalTarget = target.closest(selector)
    latexPopover.style.display = 'none'
    if (!finalTarget) return

    const rect = target.getBoundingClientRect()
    const left = rect.left + window.scrollX
    const top = rect.top + window.scrollY

    latexPopover.innerHTML = `
      <div class="latex-popover-content">
        <img src="${chrome.runtime.getURL('assets/images/svg/book.svg')}"
        class="latex-popover-btn"
        onclick='event.stopPropagation();${copyCurLatex(curRule, finalTarget, true)}'/>        
      <img src="${chrome.runtime.getURL('assets/images/svg/copy.svg')}"
      class="latex-popover-btn" onclick='event.stopPropagation();${copyCurLatex(curRule, finalTarget)}'/>
    
      </div>
    `
    latexPopover.style.left = `${left}px`
    latexPopover.style.top = `${top + 30}px`
    latexPopover.style.display = 'block'

    // const content = curRule.pre(curRule.parse(finalTarget))
    // curRule.post(finalTarget, content)
  })
}

function copyCurLatex(curRule, finalTarget, explain = false) {
  const content = curRule.pre(curRule.parse(finalTarget))
  curRule.post(finalTarget, content)
  if (explain) {
    console.log(1242)
  }
}

init(true)

// turn all svg to image with latex alt
hotkeys('shift+up,esc', (_, handler) => {
  switch (handler.key) {
    case 'shift+up':
      if (!inited || canCopyAll) return
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
  fullPageCopy(elList)
})

document.addEventListener('copy', () => {
  if (!canCopyAll) return
  formatCopiedText()
})

async function fullPageCopy(targetList = []) {
  canCopyAll = true
  const ruleSelector = rule.selectorList.join()
  let elList = targetList.length ? targetList : document.querySelectorAll(ruleSelector)
  for (let el of elList) {
    if (el.tagName === 'IMG' || !el.offsetHeight) continue
    const uuid = crypto.randomUUID()
    const parent = el.parentNode
    let parentPosition = window.getComputedStyle(parent).position
    if (parentPosition === 'static') parent.style.position = 'relative'
    const content = rule.parse(el)
    el.setAttribute('data-uuid', uuid)
    el.classList.add('sss-none-select')
    if (!content || content instanceof Blob) continue
    let img = createOpacityImage({
      width: el.offsetWidth,
      height: el.offsetHeight,
      alt: content,
      id: uuid,
    })
    const imgContainer = document.createElement('span')
    imgContainer.className = 'sss-img-latex'
    imgContainer.style.left = el.offsetLeft + 'px'
    imgContainer.style.top = el.offsetTop + 'px'
    imgContainer.appendChild(img)
    el.parentNode.insertBefore(imgContainer, el)
  }
}
