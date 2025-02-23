import { initEventHandler } from '@/lib/extension-action'
import generateCSS from '@/lib/style'
import { browser } from 'wxt/browser'

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id })

  const contentReq = {
    'insert-css': insertCSS,
  }

  function insertCSS(data, __, tabId) {
    browser.scripting.insertCSS({
      css: generateCSS(data),
      target: { tabId },
    })
  }

  initEventHandler(contentReq)
})

// browser.sidePanel
//   .setPanelBehavior({ openPanelOnActionClick: true })
//   .catch((error) => console.error(error))
