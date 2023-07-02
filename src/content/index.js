import { createEle } from '@/utils'
import list from './list'

const hiddenEl = createEle({
  tag: 'span',
  class: 'hidden-el',
})
document.body.appendChild(hiddenEl)

setTimeout(() => list('.hidden-el'), 3000)

const rules = {
  zhihu: {
    selector: '.MathJax_SVG',
    parser: (el) => {
      console.log(el.getAttribute('data-mathml'))
    },
  },
}

function createCopyIcon(target) {
  const span = document.createElement('span')
  span.textContent = 'copy'
  span.className = 'sss-copy'
  target.appendChild(span)
}

document.addEventListener('mouseover', (e) => {
  const target = e.target
  if (target.className.contains(rules.zhihu.selector)) {
    createCopyIcon(target)
  }
})

document.addEventListener('click', (e) => {
  const target = e.target
  if (target.className.contains('sss-copy')) {
    rules.zhihu.parser(target)
  }
})
