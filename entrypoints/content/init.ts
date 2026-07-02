import './style.css'
import { sendBrowserMessage } from '@/lib/extension-action'
import hotkeys from 'hotkeys-js'
import { ImageAltRule, type Rule, rules } from './const'
import { createOpacityImage, formatCopiedText } from './copy-pipeline'
import { toCopyResult } from './copy-result'
import { handleMixedCopy } from './selection-copy'
import { runContentTask } from './util'

type CopyRule = Omit<Rule, 'testUrl'> & { testUrl?: string[] }
type FormulaTarget = {
  rule: CopyRule
  el: HTMLElement
}

const ruleList = Object.values(rules) as CopyRule[]
const overlayRule = ImageAltRule as CopyRule
const allSelectors = Array.from(
  new Set([...ruleList.flatMap((item) => item.selectorList), ...overlayRule.selectorList]),
)

let inited = false
let visibilityWatcherInited = false
let canCopyAll = false
let primaryRule: CopyRule | undefined

export function latexInit() {
  if (!visibilityWatcherInited) {
    visibilityWatcherInited = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        runContentTask(init(), 'visibility init')
      }
    })
  }

  runContentTask(init(), 'initial init')
}

async function init() {
  if (inited || document.visibilityState === 'hidden') return

  if (!document.body) {
    document.addEventListener('DOMContentLoaded', () => runContentTask(init(), 'dom init'), {
      once: true,
    })
    return
  }

  primaryRule = await resolvePrimaryRule()
  inited = true

  eventInit()
  insertRuleStyles()
  document.body.addEventListener('click', handleFormulaClick, true)
}

async function resolvePrimaryRule(): Promise<CopyRule | undefined> {
  let ruleKey = ''

  try {
    const res = await sendBrowserMessage({
      greeting: 'get-pattern',
      data: { domain: location.hostname },
    }).catch(() => '')
    ruleKey = typeof res === 'string' ? res : ''
  } catch {
    ruleKey = ''
  }

  if (ruleKey && rules[ruleKey]) {
    return rules[ruleKey]
  }

  return ruleList.find((item) => findFirstMatch(item))
}

function insertRuleStyles() {
  runContentTask(
    () => sendBrowserMessage({
      greeting: 'insert-css',
      data: allSelectors,
    }),
    'insert rule styles',
  )
}

function findFirstMatch(rule: CopyRule): HTMLElement | null {
  try {
    return document.querySelector(rule.selectorList.join(',')) as HTMLElement | null
  } catch {
    return null
  }
}

function findMatchingRule(target: Element, activeRules: CopyRule[]): FormulaTarget | undefined {
  for (const curRule of activeRules) {
    try {
      const finalTarget = target.closest(curRule.selectorList.join(',')) as HTMLElement | null
      if (finalTarget) return { rule: curRule, el: finalTarget }
    } catch {}
  }
}

function handleFormulaClick(e: MouseEvent) {
  if (canCopyAll) return
  if (!(e.target instanceof Element)) return

  const match = findMatchingRule(e.target, ruleList)
  if (!match) return

  e.stopPropagation()
  runContentTask(copyByRule(match.rule, match.el), 'copy formula')
}

async function copyByRule(curRule: CopyRule, el: HTMLElement) {
  const res = toCopyResult(await curRule.parse(el), { displayMode: 'unknown' })
  if (!res) return

  if (typeof res.content === 'string') {
    const content = curRule.pre(res.content)
    await curRule.post(el, content, res)
  } else if (res.content instanceof Blob) {
    const content = curRule.pre(res.content)
    await curRule.post(el, content, res)
  }
}

function eventInit() {
  hotkeys('shift+up,esc', (_, handler) => {
    switch (handler.key) {
      case 'shift+up':
        if (!inited || canCopyAll) return
        runContentTask(enterFullPageCopy(), 'enter full page copy')
        break
      case 'esc':
        if (canCopyAll) exitFullPageCopy()
        break
      default:
        break
    }
  })

  document.addEventListener('scroll', () => {
    if (!canCopyAll) return
    runContentTask(renderFormulaOverlays(), 'render formula overlays')
  })

  document.addEventListener('copy', (e) => {
    if (canCopyAll) {
      runContentTask(formatCopiedText(), 'format copied text')
      return
    }

    runContentTask(handleMixedCopy(e, Object.values(rules)), 'mixed copy')
  })
}

async function enterFullPageCopy() {
  canCopyAll = true
  await renderFormulaOverlays()
}

function exitFullPageCopy() {
  canCopyAll = false

  document.querySelectorAll('.sss-img-latex').forEach((item) => item.remove())
  document.querySelectorAll('[data-uuid].sss-none-select').forEach((item) => {
    item.removeAttribute('data-uuid')
    item.classList.remove('sss-none-select')
  })
}

async function renderFormulaOverlays() {
  const targets = collectFormulaTargets()

  for (const { rule, el } of targets) {
    if (!isVisible(el)) continue

    const result = toCopyResult(await rule.parse(el), { displayMode: 'unknown' })
    if (!result || typeof result.content !== 'string') continue
    const content = rule.pre(result.content)

    const parent = el.parentElement
    if (!parent) continue

    const uuid = crypto.randomUUID()
    const parentPosition = window.getComputedStyle(parent).position
    if (parentPosition === 'static') parent.style.position = 'relative'

    const rect = el.getBoundingClientRect()
    const parentRect = parent.getBoundingClientRect()
    const img = createOpacityImage({
      width: Math.max(1, Math.ceil(rect.width)),
      height: Math.max(1, Math.ceil(rect.height)),
      alt: content,
      displayMode: result.displayMode,
      id: uuid,
    })
    if (!img) continue

    el.setAttribute('data-uuid', uuid)
    el.classList.add('sss-none-select')

    const imgContainer = document.createElement('span')
    imgContainer.className = 'sss-img-latex'
    imgContainer.style.left = `${rect.left - parentRect.left + parent.scrollLeft}px`
    imgContainer.style.top = `${rect.top - parentRect.top + parent.scrollTop}px`
    imgContainer.appendChild(img)
    parent.insertBefore(imgContainer, el)
  }
}

function collectFormulaTargets(): FormulaTarget[] {
  const result: FormulaTarget[] = []
  const seen = new Set<Element>()

  for (const curRule of primaryRule
    ? [primaryRule, ...ruleList.filter((item) => item !== primaryRule)]
    : ruleList) {
    let candidates: HTMLElement[] = []

    try {
      candidates = Array.from(
        document.querySelectorAll(curRule.selectorList.join(',')),
      ) as HTMLElement[]
    } catch {}

    for (const el of candidates) {
      if (seen.has(el)) continue
      if (el.closest('.sss-img-latex')) continue
      if (el.closest('[data-uuid]')) continue

      seen.add(el)
      result.push({ rule: curRule, el })
    }
  }

  return result
}

function isVisible(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}
