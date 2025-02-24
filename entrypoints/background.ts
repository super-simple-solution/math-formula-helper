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

  function openPanel(tabId: number) {
    chrome.sidePanel.open({
      tabId,
    })
  }

  function closePanel(tabId: number) {
    chrome.sidePanel.setOptions({
      tabId,
      enabled: false,
    })
  }
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error))

  const tabSidePanelStates: Record<number, boolean> = {}

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const { tabId } = activeInfo
    const sidePanelState = tabSidePanelStates[tabId] || false // 默认侧边面板关闭

    if (sidePanelState) {
      openPanel(tabId)
    } else {
      closePanel(tabId)
    }
  })

  // 监听 Tab 关闭事件，关闭对应的侧边面板
  chrome.tabs.onRemoved.addListener((tabId) => {
    closePanel(tabId)
    delete tabSidePanelStates[tabId]
  })

  // 处理插件图标点击事件
  chrome.action.onClicked.addListener((tab) => {
    const currentState = tabSidePanelStates[tab.id as number] || false
    toggleSidePanel(tab.id as number, !currentState)
  })

  function toggleSidePanel(tabId: number, open: boolean) {
    tabSidePanelStates[tabId] = open
    if (open) {
      openPanel(tabId)
    } else {
      closePanel(tabId)
    }
  }
})
