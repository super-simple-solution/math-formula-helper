import { type handlerParams, initEventHandler } from '@/lib/extension-action'
import { getPattern, refreshPattern } from '@/lib/pattern'
import generateCSS from '@/lib/style'
import { browser } from 'wxt/browser'
import { accessMathJaxInMainWorld } from './background/mathjax-main-world'

type MathJaxMainWorldRequest = Parameters<typeof accessMathJaxInMainWorld>[0]
type MathmlDisplayMode = 'inline' | 'display'

export default defineBackground(() => {
  const contentReq = {
    'get-pattern': getPatternByDomain,
    'insert-css': insertCSS,
    'get-active-tab': getActiveTab,
    'get-mathjax-source': getMathJaxSource,
    'convert-tex-to-mathjax-mathml': convertTexToMathJaxMathml,
    'convert-tex-to-local-mathml': convertTexToLocalMathml,
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
      sendResponse(await runMathJaxInMainWorld(tabId, frameId, { kind: 'source', elementId }))
    } catch {
      sendResponse(null)
    }
  }

  async function convertTexToMathJaxMathml(params: handlerParams) {
    const { frameId, sendResponse, tabId } = params
    const { tex, displayMode } = parseTexToMathmlRequest(params.data)

    if (typeof tabId !== 'number' || !tex) {
      sendResponse(null)
      return
    }

    try {
      sendResponse(
        (await runMathJaxInMainWorld(tabId, frameId, {
          kind: 'tex-to-mathml',
          tex,
          displayMode,
        })) || (await convertTexToMathmlInBackground(tex, displayMode)),
      )
    } catch {
      sendResponse(await convertTexToMathmlInBackground(tex, displayMode))
    }
  }

  async function convertTexToLocalMathml(params: handlerParams) {
    const { sendResponse } = params
    const { tex, displayMode } = parseTexToMathmlRequest(params.data)

    sendResponse(
      tex ? await convertTexToMathmlInBackground(tex, displayMode) : null,
    )
  }

  async function runMathJaxInMainWorld(
    tabId: number,
    frameId: number | undefined,
    request: MathJaxMainWorldRequest,
  ) {
    const target: { tabId: number; frameIds?: number[] } = { tabId }
    if (typeof frameId === 'number') target.frameIds = [frameId]

    const [result] = await browser.scripting.executeScript({
      target,
      world: 'MAIN',
      func: accessMathJaxInMainWorld,
      args: [request],
    })
    return result?.result || null
  }

  async function convertTexToMathmlInBackground(tex: string, displayMode: MathmlDisplayMode) {
    try {
      const { convertTexToMathml } = await import('@/lib/tex-to-mathml')
      return convertTexToMathml(tex, displayMode)
    } catch {
      return null
    }
  }

  function parseTexToMathmlRequest(data: handlerParams['data']) {
    const source = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
    const tex = typeof source.tex === 'string' ? source.tex : undefined
    const displayMode: MathmlDisplayMode = source.displayMode === 'display' ? 'display' : 'inline'
    return { tex, displayMode }
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
