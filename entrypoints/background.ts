import { type handlerParams, initEventHandler } from '@/lib/extension-action'
import { getPattern, refreshPattern } from '@/lib/pattern'
import generateCSS from '@/lib/style'
import { browser } from 'wxt/browser'

export default defineBackground(() => {
  const contentReq = {
    'get-pattern': getPatternByDomain,
    'insert-css': insertCSS,
    'get-active-tab': getActiveTab,
    'get-mathjax-source': getMathJaxSource,
  }

  async function getPatternByDomain(params: handlerParams) {
    const { data, sendResponse } = params
    // 修复类型错误，确保 data 是对象且有 domain 属性
    const domain =
      data && typeof data === 'object' && 'domain' in data
        ? (data as { domain?: string }).domain
        : undefined
    getPattern({ domain }, sendResponse)
  }

  function insertCSS(params: handlerParams) {
    const { data, tabId } = params
    if (typeof tabId !== 'number') return

    browser.scripting.insertCSS({
      css: generateCSS(data as string[]),
      target: { tabId },
    })
  }

  async function getMathJaxSource(params: handlerParams) {
    const { data, frameId, sendResponse, tabId } = params
    const elementId =
      data && typeof data === 'object' && 'elementId' in data
        ? (data as { elementId?: string }).elementId
        : undefined

    if (typeof tabId !== 'number' || !elementId) {
      sendResponse(null)
      return
    }

    try {
      const target: { tabId: number; frameIds?: number[] } = { tabId }
      if (typeof frameId === 'number') target.frameIds = [frameId]

      const [result] = await browser.scripting.executeScript({
        target,
        world: 'MAIN',
        func: getMathJaxSourceInMainWorld,
        args: [elementId],
      })
      sendResponse(result?.result || null)
    } catch {
      sendResponse(null)
    }
  }

  function getActiveTab(params: handlerParams) {
    const { sendResponse } = params
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs.length > 0) {
        const tab = tabs[0]
        sendResponse(tab)
      }
    })
  }

  initEventHandler(contentReq)
  const tabSet = new Set()
  // 点击图标打开
  browser.action.onClicked.addListener((tab) => {
    const tabId = tab.id as number
    tabSet.add(tabId)
    chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: true,
    })
    chrome.sidePanel.open({
      tabId: tab.id as number,
    })
  })

  browser.tabs.onActivated.addListener(async (activeInfo: { tabId: number }) => {
    const { tabId } = activeInfo
    disablePanel(tabId)
  })

  browser.tabs.onUpdated.addListener(async (tabId) => {
    disablePanel(tabId)
  })

  function disablePanel(tabId: number) {
    if (!tabSet.has(tabId)) {
      chrome.sidePanel.setOptions({
        enabled: false,
      })
    }
  }

  browser.tabs.onRemoved.addListener(async (tabId) => {
    tabSet.delete(tabId)
  })

  browser.runtime.onInstalled.addListener(refreshPattern)

  browser.runtime.setUninstallURL('https://forms.gle/PB5q95cJbxQ6jpQV8')
})

function getMathJaxSourceInMainWorld(elementId: string) {
  type MathJaxMathItem = {
    math?: string
    inputData?: {
      original?: { tex?: string }
      originalMml?: string
      math?: string
    }
    typesetRoot?: Element
    root?: { node?: Element }
    start?: { node?: Element }
    toMathML?: () => string
  }

  type MathJaxDocument = {
    getMathItemsWithin?: (el: Element) => MathJaxMathItem[]
    math?: Iterable<MathJaxMathItem>
  }

  type MathJaxWindow = Window & {
    MathJax?: {
      startup?: { document?: MathJaxDocument }
      Hub?: {
        getJaxFor?: (el: Element) => {
          originalText?: string
          SourceElement?: () => Element | null
        } | null
      }
    }
  }

  const el = document.getElementById(elementId)
  const mathJax = (window as MathJaxWindow).MathJax
  if (!el || !mathJax) return null

  const findMathJax3Item = (doc: MathJaxDocument | undefined, target: Element) => {
    if (!doc) return null

    if (typeof doc.getMathItemsWithin === 'function') {
      const items = doc.getMathItemsWithin(target)
      if (items.length) return items[0]
    }

    if (doc.math && typeof doc.math[Symbol.iterator] === 'function') {
      for (const item of doc.math) {
        const root = item.typesetRoot || item.root?.node || item.start?.node
        if (root && (root === target || root.contains(target) || target.contains(root))) {
          return item
        }
      }
    }

    return null
  }

  const getMathJax3Source = (item: MathJaxMathItem | null) => {
    if (!item) return null
    return (
      item.inputData?.original?.tex ||
      item.inputData?.originalMml ||
      item.inputData?.math ||
      item.math ||
      item.toMathML?.() ||
      null
    )
  }

  const findMathJax2Item = () => {
    if (!mathJax.Hub?.getJaxFor) return null

    const candidates = [el, ...Array.from(el.querySelectorAll('[id]'))]
    for (const candidate of candidates) {
      const jax = mathJax.Hub.getJaxFor(candidate)
      if (jax) return jax
    }

    return null
  }

  const item = findMathJax3Item(mathJax.startup?.document, el)
  const source = getMathJax3Source(item)
  if (source) return source

  const jax = findMathJax2Item()
  return jax?.originalText || jax?.SourceElement?.()?.textContent || null
}
