import '@/style/index.scss'
import hotkeys from 'hotkeys-js'
import { ImageAltRule, rules } from './const'
import { createOpacityImage, formatCopiedText, initClipboard } from './util'

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
    if (!window.showTooltip) return

    const target = e.target
    const finalTarget = target.closest(selector)
    if (!finalTarget) return

    let tooltip = document.querySelector('.sss-tooltip')
    if (!tooltip) {
      tooltip = document.createElement('div')
      tooltip.classList.add('sss-tooltip')
      document.body.appendChild(tooltip) // 添加到 body

      Object.assign(tooltip.style, {
        position: 'absolute',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        zIndex: '9999',
        display: 'none',
        transition: 'opacity 0.2s ease',
      })
      updateTooltipTheme(tooltip) // 初始化时设置主题色
    }

    const rect = finalTarget.getBoundingClientRect()
    const scrollX = window.scrollX || window.pageXOffset
    const scrollY = window.scrollY || window.pageYOffset
    // 设置 tooltip 位置（显示在元素下方）
    Object.assign(tooltip.style, {
      display: 'block',
      top: `${rect.bottom + scrollY + 5}px`,
      left: `${rect.left + scrollX + rect.width / 2}px`,
      transform: 'translateX(-50%)', // 让 tooltip 居中
    })

    curRule.parse(finalTarget).then((res) => {
      tooltip.textContent = res
      updateTooltipTheme(tooltip)

      const tooltipRect = tooltip.getBoundingClientRect()
      if (tooltipRect.bottom > window.innerHeight) {
        tooltip.style.top = `${rect.top + scrollY - tooltipRect.height}px`
      }
      if (tooltipRect.right > window.innerWidth) {
        tooltip.style.left = `${window.innerWidth - tooltipRect.width - 5}px`
        tooltip.style.transform = 'none'
      }
      if (tooltipRect.left < 0) {
        tooltip.style.left = '5px'
        tooltip.style.transform = 'none'
      }
    })
  })

  document.body.addEventListener('mouseout', () => {
    const tooltip = document.querySelector('.sss-tooltip')
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
      curRule.post(finalTarget, `$${content}$`)
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

const updateTooltipTheme = (tooltip) => {
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches

  Object.assign(tooltip.style, {
    background: isDarkMode ? 'white' : 'rgba(0, 0, 0, 0.65)',
    color: isDarkMode ? 'black' : 'white',
    border: isDarkMode ? '1px solid #ddd' : 'none',
  })
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const tooltip = document.querySelector('.sss-tooltip')
  if (tooltip) updateTooltipTheme(tooltip)
})

chrome.storage.sync.get(['showTooltip'], (data) => {
  window.showTooltip = data.showTooltip ?? true
})
chrome.storage.onChanged.addListener((changes) => {
  if (changes.showTooltip) {
    window.showTooltip = changes.showTooltip.newValue
  }
})
