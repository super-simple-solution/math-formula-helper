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

})
