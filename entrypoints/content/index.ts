import './style.css'
import { latexInit } from './init'

export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    latexInit()
  },
})
