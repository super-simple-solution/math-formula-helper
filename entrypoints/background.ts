import { type handlerParams, initEventHandler } from '@/lib/extension-action'
import generateCSS from '@/lib/style'
import { browser } from 'wxt/browser'

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id })

  const contentReq = {
    'insert-css': insertCSS,
    'get-active-tab': getActiveTab,
  }

  function insertCSS(params: handlerParams) {
    const { data, tabId } = params
    browser.scripting.insertCSS({
      css: generateCSS(data as string[]),
      target: { tabId: tabId as number },
    })
  }

  function getActiveTab(params: handlerParams) {
    const { sendResponse } = params
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs.length > 0) {
        const tab = tabs[0]
        console.log('Current tab:', tab)
        sendResponse(tab)
      }
    })
  }

  initEventHandler(contentReq)

  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error))
})
