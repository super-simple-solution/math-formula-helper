import { createEle } from '@/utils'
import list from './list'

const hiddenEl = createEle({
  tag: 'span',
  class: 'hidden-el',
})
document.body.appendChild(hiddenEl)

const handler = () => {
  list('.hidden-el')
}

setTimeout(() => handler(), 3000)

const rules = {
  zhihu: {
    selector: 'MathJax_SVG',
    parser: (el) => {
      console.log(el.getAttribute('data-mathml'))
    },
  },
}

function createCopyIcon(target) {
  const img = document.createElement('img')
  img.src = '/public/assets/images/copy.png'
  img.className = 'sss-copy'
  target.appendChild(img)
}

document.addEventListener('mouseover', (e) => {
  const target = e.target
  console.log(target, 'target')
  if (target.classList?.contains(rules.zhihu.selector)) {
    createCopyIcon(target)
    console.log(target, 44)
  }
})

document.addEventListener('click', (e) => {
  const target = e.target
  if (target.classList?.contains('sss-copy')) {
    rules.zhihu.parser(target)
  }
})
