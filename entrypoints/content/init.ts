import './style.css'
import { sendBrowserMessage } from '@/lib/extension-action'
import hotkeys from 'hotkeys-js'
import { ImageAltRule, type Rule, rules } from './const'
import { createOpacityImage, formatCopiedText, initClipboard } from './util'

export function latexInit() {
  init(true)
}

const MAX_RETRIES = 5
const state = { count: 0, inited: false, canCopyAll: false, rule: undefined as Rule | undefined }

async function init(isReset: boolean) {
  if (state.inited) return
  if (isReset) state.count = 0
  if (document.visibilityState === 'hidden') return
  const ruleKey = await sendBrowserMessage({
    greeting: 'get-pattern',
    data: {
      domain: location.hostname,
    },
  })
  console.log(ruleKey, 'ruleKey')
  if (ruleKey) {
    state.rule = rules[ruleKey as string]
  } else {
    state.rule = Object.values(rules).find((item) => document.querySelector(item.selectorList.join()))
  }
  if (state.count >= MAX_RETRIES) return
  state.count++
  if (!state.rule) {
    setTimeout(() => init(false), 2000)
    return
  }
  state.inited = true
  initClipboard()
  eventInit()
  sendBrowserMessage({
    greeting: 'insert-css',
    data: [...state.rule.selectorList, ...ImageAltRule.selectorList],
  })

  const curRule = state.canCopyAll ? ImageAltRule : state.rule
  const selector = curRule.selectorList.join()

  document.body.addEventListener(
    'click',
    (e) => {
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
    },
    true,
  )
}

function eventInit() {
  // turn all svg to image with latex alt
  hotkeys('shift+up,esc', (_, handler) => {
    switch (handler.key) {
      case 'shift+up':
        if (!state.inited || state.canCopyAll) return
        fullPageCopy()
        break
      default:
    }
  })

  document.addEventListener('visibilitychange', () => {
    if (!state.inited && document.visibilityState === 'visible') {
      init(true)
    }
  })

  document.addEventListener('scroll', () => {
    if (!state.canCopyAll) return
    const ruleSelector = state.rule?.selectorList.join()
    if (!ruleSelector?.length) return
    const elList = Array.from(document.querySelectorAll(ruleSelector)).filter(
      (item) => !item.getAttribute('data-uuid'),
    ) as HTMLElement[]
    if (!elList.length) return
    fullPageCopy(elList)
  })

  document.addEventListener('copy', () => {
    if (!state.canCopyAll) return
    formatCopiedText()
  })
}

async function fullPageCopy(targetList: HTMLElement[] = []) {
  state.canCopyAll = true
  if (!state.rule) return
  const ruleSelector = state.rule?.selectorList.join()
  if (!ruleSelector?.length) return
  const elList = targetList.length ? targetList : document.querySelectorAll(ruleSelector)
  for (const el of elList as HTMLElement[]) {
    if (el.tagName === 'IMG' || !el.offsetHeight) continue
    const uuid = crypto.randomUUID()
    const parent = el.parentNode as HTMLElement
    if (!parent) return
    const parentPosition = window.getComputedStyle(parent).position
    if (parentPosition === 'static') parent.style.position = 'relative'
    const content = await state.rule.parse(el)
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