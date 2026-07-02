import { browser } from 'wxt/browser'
import type { LatexDisplayMode } from './latex-options'

type GreetingType =
  | 'insert-css'
  | 'get-active-tab'
  | 'get-pattern'
  | 'get-mathjax-source'
  | 'convert-tex-to-mathjax-mathml'
  | 'convert-tex-to-local-mathml'

export type MathJaxPageSource = string | { tex?: string | null; mathml?: string | null }

export type MathJaxTexToMathmlRequest = {
  tex?: string
  displayMode?: LatexDisplayMode
}

export type BrowserRequest = {
  greeting: GreetingType
  data?: Record<string, unknown> | unknown[]
}

export type handlerParams = {
  data: BrowserRequest['data']
  sendResponse: (message: unknown) => void
  tabId?: number
  frameId?: number
}

export type BrowserHandler = Record<GreetingType, (params: handlerParams) => void>

export function initEventHandler(contentReq: Partial<BrowserHandler>) {
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const browserRequest = request as BrowserRequest
    const data = browserRequest.data
    const tabId = sender.tab?.id
    const frameId = sender.frameId
    const handler = contentReq[browserRequest.greeting]
    if (handler) {
      handler({
        data,
        sendResponse,
        tabId,
        frameId,
      })
    }
    return true
  })
}

export function sendBrowserMessage(request: BrowserRequest) {
  return browser.runtime.sendMessage(request)
}
