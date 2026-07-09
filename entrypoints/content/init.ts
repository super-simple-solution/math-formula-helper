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

// Starts the content script once the page is visible and retries after visibility changes.
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

// Resolves rules, injects hover styles, and attaches click/copy listeners.
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

// Picks a remote-configured primary rule when available, otherwise uses the first matching rule.
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

// Injects CSS for every known formula selector through the background script.
function insertRuleStyles() {
  runContentTask(
    () => sendBrowserMessage({
      greeting: 'insert-css',
      data: allSelectors,
    }),
    'insert rule styles',
  )
}

// Checks whether a rule has at least one valid selector match on the current page.
function findFirstMatch(rule: CopyRule): HTMLElement | null {
  try {
    return document.querySelector(rule.selectorList.join(',')) as HTMLElement | null
  } catch {
    return null
  }
}

// Finds the first active rule whose selector contains the event target.
function findMatchingRule(target: Element, activeRules: CopyRule[]): FormulaTarget | undefined {
  for (const curRule of activeRules) {
    try {
      const finalTarget = target.closest(curRule.selectorList.join(',')) as HTMLElement | null
      if (finalTarget) return { rule: curRule, el: finalTarget }
    } catch {}
  }
}

// Handles direct formula clicks and routes the matched element through its parser.
function handleFormulaClick(e: MouseEvent) {
  if (canCopyAll) return
  if (!(e.target instanceof Element)) return

  const match = findMatchingRule(e.target, ruleList)
  if (!match) return

  e.stopPropagation()
  runContentTask(copyByRule(match.rule, match.el), 'copy formula')
}

// Parses a formula with its rule, refines the source, and delegates the rule's post-copy action.
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

// Registers keyboard, scroll, and mixed-selection copy handlers.
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

// Enables full-page copy by rendering transparent images over visible formulas.
async function enterFullPageCopy() {
  canCopyAll = true
  await renderFormulaOverlays()
}

// Removes full-page overlay artifacts and restores formula nodes after Esc.
function exitFullPageCopy() {
  canCopyAll = false

  document.querySelectorAll('.sss-img-latex').forEach((item) => item.remove())
  document.querySelectorAll('[data-uuid].sss-none-select').forEach((item) => {
    item.removeAttribute('data-uuid')
    item.classList.remove('sss-none-select')
  })
}

// Creates transparent overlay images whose alt text carries formatted formula source.
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

// Collects formula nodes for full-page overlay mode, prioritizing the page's primary rule.
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

// Filters out hidden or unmeasurable rendered formula nodes.
function isVisible(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}
