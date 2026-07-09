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

  // Resolves optional remote selector rule metadata for the sender's domain.
  async function getPatternByDomain(params: handlerParams) {
    const { data, sendResponse } = params
    const domain =
      data && typeof data === 'object' && 'domain' in data
        ? (data as { domain?: string }).domain
        : undefined
    getPattern({ domain }, sendResponse)
  }

  // Injects generated hover/copy CSS into the sender tab.
  function insertCSS(params: handlerParams) {
    const { data, tabId } = params
    if (typeof tabId !== 'number') return

    browser.scripting.insertCSS({
      css: generateCSS(data as string[]),
      target: { tabId },
    })
  }

  // Reads TeX/MathML source from page MathJax by executing a helper in MAIN world.
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

  // Converts TeX to MathML using page MathJax first, then bundled MathJax as fallback.
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

  // Converts TeX to MathML with bundled MathJax only.
  async function convertTexToLocalMathml(params: handlerParams) {
    const { sendResponse } = params
    const { tex, displayMode } = parseTexToMathmlRequest(params.data)

    sendResponse(
      tex ? await convertTexToMathmlInBackground(tex, displayMode) : null,
    )
  }

  // Executes the MAIN-world MathJax accessor in the sender tab and frame.
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

  // Lazily imports bundled MathJax conversion code inside the service worker.
  async function convertTexToMathmlInBackground(tex: string, displayMode: MathmlDisplayMode) {
    try {
      const { convertTexToMathml } = await import('@/lib/tex-to-mathml')
      return convertTexToMathml(tex, displayMode)
    } catch {
      return null
    }
  }

  // Parses and normalizes message payloads for TeX-to-MathML conversion requests.
  function parseTexToMathmlRequest(data: handlerParams['data']) {
    const source = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
    const tex = typeof source.tex === 'string' ? source.tex : undefined
    const displayMode: MathmlDisplayMode = source.displayMode === 'display' ? 'display' : 'inline'
    return { tex, displayMode }
  }

  // Returns the active browser tab for side panel code.
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
  // Opens the side panel for the clicked tab and remembers that it is explicitly enabled.
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

  // Keeps the side panel disabled on tabs where the user has not opened it.
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
