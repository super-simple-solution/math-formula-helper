import {browser} from "wxt/browser"

type GreetingType = 'insert-css' | 'get-active-tab' | 'get-pattern'

export type BrowserRequest = {
  greeting: GreetingType,
  data?: object | any[]
}

export type handlerParams = {data: BrowserRequest['data'], sendResponse: (message: unknown) => void, tabId?: number}

export type BrowserHandler = Record<GreetingType, (params: handlerParams) => void>

export function initEventHandler(contentReq: Partial<BrowserHandler>) {
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const browserRequest = request as BrowserRequest
    const data = browserRequest.data
    const tabId = sender.tab?.id
    const handler = contentReq[browserRequest.greeting]
    if (handler) {
      handler({
        data, sendResponse, tabId
      })
    }
    return true
  })
}

export function sendBrowserMessage(request: BrowserRequest) {
  return browser.runtime.sendMessage(request)
}
