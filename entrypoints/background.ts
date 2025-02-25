import { type handlerParams, initEventHandler } from '@/lib/extension-action'
import generateCSS from '@/lib/style'
import { browser } from 'wxt/browser'

export default defineBackground(() => {
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
})
