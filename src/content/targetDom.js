export function handleTargetDom(e, canCopyAll, ImageAltRule, rule, latexPopover) {
  const target = e.target
  const curRule = canCopyAll ? ImageAltRule : rule
  const selector = curRule.selectorList.join()
  const finalTarget = target.closest(selector)

  latexPopover.style.display = 'none'
  if (!finalTarget) return

  const rect = target.getBoundingClientRect()
  const left = rect.left + window.scrollX
  const top = rect.top + window.scrollY

  setPopoverContent(latexPopover, left, top, curRule, finalTarget)
}

function setPopoverContent(latexPopover, left, top, curRule, finalTarget) {
  latexPopover.innerHTML = `
    <div class="latex-popover-content">
      <img
        src="${chrome.runtime.getURL('assets/images/svg/book.svg')}"
        class="latex-popover-btn"
        id="book-btn"
      />        
      <img
        src="${chrome.runtime.getURL('assets/images/svg/copy.svg')}"
        class="latex-popover-btn"
        id="copy-btn"
      />
    </div>
  `

  latexPopover.style.left = `${left}px`
  latexPopover.style.top = `${top + 30}px`
  latexPopover.style.display = 'block'

  // TODO: parse is a promise
  const finalContent = curRule.pre(curRule.parse(finalTarget))
  document
    .getElementById('book-btn')
    .addEventListener('click', (event) => handleExplain(event, left, top, finalContent, latexPopover))
  document
    .getElementById('copy-btn')
    .addEventListener('click', (event) => handleCopy(event, curRule, finalTarget, finalContent, latexPopover))
}

function handleExplain(event, left, top, finalContent, latexPopover) {
  event.stopPropagation()

  latexPopover.style.display = 'none'
  latexPopover.innerHTML = `
    <div>
      <div>解释</div>
      <div>${finalContent} </div>
    <div>
  `
  latexPopover.style.left = `${left}px`
  latexPopover.style.top = `${top + 30}px`
  latexPopover.style.display = 'block'
}

function handleCopy(event, curRule, finalTarget, finalContent, latexPopover) {
  event.stopPropagation()

  curRule.post(finalTarget, finalContent)

  latexPopover.style.display = 'none'
}
