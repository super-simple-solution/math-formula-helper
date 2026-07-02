import './style.css'
import { watchPrefer } from './copy-pipeline'
import { latexInit } from './init'
import { handleContentError } from './util'

export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    try {
      latexInit()
      const unwatch = watchPrefer()
      window.addEventListener('beforeunload', () => {
        try {
          unwatch()
        } catch (error) {
          handleContentError(error, 'unwatch preference')
        }
      })
    } catch (error) {
      handleContentError(error, 'content script init')
    }
  },
})
