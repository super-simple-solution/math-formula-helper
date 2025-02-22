import { initEventHandler } from '@/lib/extension-action'
import generateCSS from '@/lib/style'

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id })

  const contentReq = {
    'insert-css': insertCSS,
  }

  function insertCSS(data, __, tabId) {
    chrome.scripting.insertCSS({
      css: generateCSS(data),
      target: { tabId },
    })
  }

  initEventHandler(contentReq)

  // browser.runtime.onInstalled.addListener(({ reason }) => {
  //   if (details.reason === 'uninstall') {
  //     chrome.tabs.create({
  //       url: 'https://docs.google.com/forms/d/e/1FAIpQLScID-Uviu6jAaq-bL2lN01lg4H1eEFszzsKa8q7MtAhzRZKMg/viewform?usp=dialog',
  //     })
  //   }
  // })
})
