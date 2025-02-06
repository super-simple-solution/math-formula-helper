import '@/style/index.scss'
import hotkeys from 'hotkeys-js'
import { ImageAltRule, rules } from './const'
import { createOpacityImage, formatCopiedText, initClipboard } from './util'
// import { handleTargetDom } from './targetDom'

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

  const curRule = canCopyAll ? ImageAltRule : rule
  const selector = curRule.selectorList.join()

  document.body.addEventListener('mouseover', (e) => {
    const target = e.target
    const finalTarget = target.closest(selector)
    if (!finalTarget) return

    if (window.getComputedStyle(finalTarget).position === 'static') {
      finalTarget.style.position = 'relative'
    }

    let tooltip = document.querySelector('.sss-tooltip')
    if (!tooltip) {
      tooltip = document.createElement('div')
      tooltip.classList.add(
        'sss-tooltip',
        'sss-bg-black',
        'sss-text-white',
        'sss-p-1',
        'sss-rounded-sm',
        'sss-absolute',
      )

      // const parentRect = finalTarget.getBoundingClientRect()
      tooltip.style.left = '0'
      tooltip.style.position = 'absolute'
      tooltip.style.top = '0px' // 向上偏移（高度 + 间隙）
      tooltip.style.transform = 'translateY(-100%)' // 向上平移
      finalTarget.appendChild(tooltip) // 将 Tooltip 添加到 DOM
    }
    tooltip.style.display = 'block'
    curRule.parse(finalTarget).then((res) => {
      tooltip.textContent = res
    })
  })

  document.body.addEventListener('mouseout', (e) => {
    const target = e.target
    const finalTarget = target.closest(selector)
    if (!finalTarget) return

    const tooltip = finalTarget.querySelector('.sss-tooltip') // 改为在finalTarget范围内查找
    if (tooltip) {
      tooltip.remove() // 完全移除元素
    }
  })

  document.body.addEventListener('click', (e) => {
    const target = e.target
    const finalTarget = target.closest(selector)
    if (!finalTarget) return
    curRule.parse(finalTarget).then((res) => {
      const content = curRule.pre(res)
      curRule.post(finalTarget, content)
    })
  })
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
  const elList = Array.from(document.querySelectorAll(ruleSelector)).filter(
    (item) => !item.getAttribute('data-uuid'),
  )
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
  const elList = targetList.length ? targetList : document.querySelectorAll(ruleSelector)
  for (const el of elList) {
    if (el.tagName === 'IMG' || !el.offsetHeight) continue
    const uuid = crypto.randomUUID()
    const parent = el.parentNode
    const parentPosition = window.getComputedStyle(parent).position
    if (parentPosition === 'static') parent.style.position = 'relative'
    const content = await rule.parse(el)
    el.setAttribute('data-uuid', uuid)
    el.classList.add('sss-none-select')
    if (!content || content instanceof Blob) continue
    const img = createOpacityImage({
      width: el.offsetWidth,
      height: el.offsetHeight,
      alt: content,
      id: uuid,
    })
    const imgContainer = document.createElement('span')
    imgContainer.className = 'sss-img-latex'
    imgContainer.style.left = `${el.offsetLeft}px`
    imgContainer.style.top = `${el.offsetTop}px`
    imgContainer.appendChild(img)
    el.parentNode.insertBefore(imgContainer, el)
  }
}
