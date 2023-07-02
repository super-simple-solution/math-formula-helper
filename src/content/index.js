import { createEle } from '@/utils'
import list from './list'

const hiddenEl = createEle({
  tag: 'span',
  class: 'hidden-el',
})
document.body.appendChild(hiddenEl)

setTimeout(() => list('.hidden-el'), 3000)
