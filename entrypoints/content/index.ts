import './style.css'
import { latexInit } from './init'
import { handleContentError, watchPrefer } from './util'

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
