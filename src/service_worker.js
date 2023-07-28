import { initEventHandler } from '@/utils/extension-action'
import generateCSS from '@/utils/style'

const contentReq = {
  'insert-css': insertCSS,
}

function insertCSS(_, __, tabId) {
  chrome.scripting.insertCSS(
    {
      css: generateCSS(),
      target: { tabId },
    },
    () => console.log('injectres', tabId),
  )
}

initEventHandler(contentReq)
