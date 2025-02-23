import './style.css'
import { latexInit } from './init'
import { watchPrefer } from './util'

export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    latexInit()
    const unwatch = watchPrefer()
    window.addEventListener('beforeunload', unwatch)
  },
})
