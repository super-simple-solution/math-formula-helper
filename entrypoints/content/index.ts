import './style.css'
import { contentInit } from './init'

export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    contentInit()
  },
})