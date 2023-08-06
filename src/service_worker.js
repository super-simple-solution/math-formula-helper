import { initEventHandler } from '@/utils/extension-action'
import generateCSS from '@/utils/style'

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
