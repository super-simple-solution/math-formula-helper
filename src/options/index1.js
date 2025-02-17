import './index.scss'

document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sss-option-siderbar')
  const options = sidebar.querySelectorAll('.sss-section-menu') // 获取所有选项
  const contentSections = document.querySelectorAll('.sss-content-section')
  const activeClass = ['sss-text-blue-600', 'sss-bg-blue-100', 'sss-rounded-md']
  const hiddenClass = 'sss-hidden'

  const switchElement = document.getElementById('tooltipSwitch')
  // Get the tooltip setting from chrome storage
  chrome.storage.sync.get(['showTooltip'], (data) => {
    switchElement.checked = data.showTooltip ?? true
  })
  // Update the tooltip setting when the switch is changed
  switchElement.addEventListener('change', (event) => {
    const isChecked = event.target.checked
    chrome.storage.sync.set({ showTooltip: isChecked }) // 存储状态
    chrome.runtime.sendMessage({ action: 'toggleTooltip', showTooltip: isChecked }) // 发送消息通知 content.js
  })

  if (options.length > 0) {
    // Default highlight the first option and show corresponding content
    options[2].classList.add(...activeClass)
    contentSections[2].classList.remove(hiddenClass)
  }

  sidebar.addEventListener('click', (event) => {
    const target = event.target

    if (target.classList.contains('sss-section-menu')) {
      // biome-ignore lint/complexity/noForEach: <explanation>
      options.forEach((el) => el.classList.remove(...activeClass))
      // 给当前点击的元素添加高亮
      target.classList.add(...activeClass)
      // biome-ignore lint/complexity/noForEach: <explanation>
      contentSections.forEach((section) => section.classList.add(hiddenClass))

      const contentAttr = target.dataset.attr
      const activeContent = document.querySelector(`.${contentAttr}-section`)
      if (activeContent) {
        activeContent.classList.remove(hiddenClass)
      }
    }
  })
})
