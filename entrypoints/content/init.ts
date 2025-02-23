import './style.css'
import { sendBrowserMessage } from '@/lib/extension-action'
import hotkeys from 'hotkeys-js'
import { ImageAltRule, type Rule, rules } from './const'
import { createOpacityImage, formatCopiedText, initClipboard } from './util'

export function latexInit() {
  init(true)
}

let count = 0
let inited = false
let canCopyAll = false
let rule: Rule | undefined
function init(resetCount: boolean) {
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
  eventInit()
  sendBrowserMessage({
    greeting: 'insert-css',
    data: [...rule.selectorList, ...ImageAltRule.selectorList],
  })

  const curRule = canCopyAll ? ImageAltRule : rule
  const selector = curRule.selectorList.join()

  document.body.addEventListener('click', (e) => {
    const target = e.target
    const finalTarget = (target as HTMLElement).closest(selector) as HTMLElement
    if (!finalTarget) return
    curRule.parse(finalTarget).then((res) => {
      if (res) {
        let content: string | Blob
        if (typeof res === 'string') {
          content = curRule.pre(res) as string
          curRule.post(finalTarget, content)
        } else if (res instanceof Blob) {
          content = curRule.pre(res) as Blob
          curRule.post(finalTarget, content)
        }
      }
    })
  })
}

function eventInit() {
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
    const ruleSelector = rule?.selectorList.join()
    if (!ruleSelector?.length) return
    const elList = Array.from(document.querySelectorAll(ruleSelector)).filter(
      (item) => !item.getAttribute('data-uuid'),
    ) as HTMLElement[]
    if (!elList.length) return
    fullPageCopy(elList)
  })

  document.addEventListener('copy', () => {
    if (!canCopyAll) return
    formatCopiedText()
  })
}

async function fullPageCopy(targetList: HTMLElement[] = []) {
  canCopyAll = true
  if (!rule) return
  const ruleSelector = rule?.selectorList.join()
  if (!ruleSelector?.length) return
  const elList = targetList.length ? targetList : document.querySelectorAll(ruleSelector)
  for (const el of elList as HTMLElement[]) {
    if (el.tagName === 'IMG' || !el.offsetHeight) continue
    const uuid = crypto.randomUUID()
    const parent = el.parentNode as HTMLElement
    if (!parent) return
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
    if (!img) return
    const imgContainer = document.createElement('span')
    imgContainer.className = 'sss-img-latex'
    imgContainer.style.left = `${el.offsetLeft}px`
    imgContainer.style.top = `${el.offsetTop}px`
    imgContainer.appendChild(img)
    el.parentNode?.insertBefore(imgContainer, el)
  }
}
