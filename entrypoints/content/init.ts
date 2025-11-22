import './style.css'
import { sendBrowserMessage } from '@/lib/extension-action'
import hotkeys from 'hotkeys-js'
import { ImageAltRule, type Rule, rules } from './const'
import { createOpacityImage, formatCopiedText, initClipboard, handleMixedCopy } from './util'

export function latexInit() {
  init(true)
}

let count = 0
let inited = false
let canCopyAll = false
let rule: Rule | undefined
async function init(isReset: boolean) {
  if (inited) return
  if (isReset) count = 0
  if (document.visibilityState === 'hidden') return
  // const ruleKey = await sendBrowserMessage({
  //   greeting: 'get-pattern',
  //   data: {
  //     domain: location.hostname,
  //   },
  // })
  // console.log(ruleKey, 'ruleKey')
  // if (ruleKey) {
  //   rule = rules[ruleKey as string]
  // } else {
  //   rule = Object.values(rules).find((item) => document.querySelector(item.selectorList.join()))
  // }
  // 尝试获取远程配置（可选）
  let ruleKey: string | null = null;
  try {
    const res = await sendBrowserMessage({
      greeting: 'get-pattern',
      data: { domain: location.hostname },
    }).catch(() => null);
    ruleKey = res as string | null;
  } catch (e) { console.log(e) }

  console.log(ruleKey, 'ruleKey')

  // 2. 初始化“主要规则” (rule)，用于 Shift+Up 全页复制
  if (ruleKey) {
    rule = rules[ruleKey]
  } else {
    rule = Object.values(rules).find((item) => document.querySelector(item.selectorList.join()))
  }
  if (count > 5) return
  count++
  if (!rule) {
    setTimeout(() => init(false), 2000)
    return
  }
  // 注意：即使 rule 为空，我们也继续初始化，因为沉浸式翻译可能是后加载的
  inited = true
  initClipboard()
  eventInit()
  // 注入所有规则的 CSS
  const allSelectors = Object.values(rules).flatMap(r => r.selectorList);
  sendBrowserMessage({
    greeting: 'insert-css',
    data: [...rule.selectorList, ...ImageAltRule.selectorList],
  })

  // const curRule = canCopyAll ? ImageAltRule : rule
  // const selector = curRule.selectorList.join()

  // document.body.addEventListener(
  //   'click',
  //   (e) => {
  //     const target = e.target as HTMLElement
  //     const finalTarget = (target as HTMLElement).closest(selector) as HTMLElement
  //     if (!finalTarget) return
  //     curRule.parse(finalTarget).then((res) => {
  //       if (res) {
  //         let content: string | Blob
  //         if (typeof res === 'string') {
  //           content = curRule.pre(res) as string
  //           curRule.post(finalTarget, content)
  //         } else if (res instanceof Blob) {
  //           content = curRule.pre(res) as Blob
  //           curRule.post(finalTarget, content)
  //         }
  //       }
  //     })
  //   },
  //   true,
  // )
  document.body.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement
      if (canCopyAll) return; // 全页复制模式下由覆盖层处理

      // 遍历所有已知规则进行匹配
      for (const key of Object.keys(rules)) {
        const curRule = rules[key];
        const selector = curRule.selectorList.join(',');

        // 检查点击的目标是否符合该规则
        const finalTarget = target.closest(selector) as HTMLElement;

        if (finalTarget) {
          console.log(`[LatexCopy] Matched Rule: ${key}`, finalTarget);
          curRule.parse(finalTarget).then((res) => {
            if (res) {
              let content: string | Blob
              if (typeof res === 'string') {
                content = curRule.pre(res) as string
                curRule.post(finalTarget, content)
              } else if (res instanceof Blob) {
                content = curRule.pre(res) as Blob
                curRule.post(finalTarget, content)
              }
            }
          });
          e.stopPropagation(); // 阻止冒泡，避免被其他逻辑重复处理
          break; // 找到一个匹配规则后就停止
        }
      }
    },
    true,
  )
}

function eventInit() {
  // turn all svg to image with latex alt
  hotkeys('shift+up,esc', (_, handler) => {
    switch (handler.key) {
      case 'shift+up':
        if (!inited || canCopyAll) return
        fullPageCopy()
        break
      default:
    }
  })

  document.addEventListener('visibilitychange', () => {
    if (!inited && document.visibilityState === 'visible') {
      init(true)
    }
  })

  // document.addEventListener('scroll', () => {
  //   if (!canCopyAll) return
  //   const ruleSelector = rule?.selectorList.join()
  //   if (!ruleSelector?.length) return
  //   const elList = Array.from(document.querySelectorAll(ruleSelector)).filter(
  //     (item) => !item.getAttribute('data-uuid'),
  //   ) as HTMLElement[]
  //   if (!elList.length) return
  //   fullPageCopy(elList)
  // })
  // 滚动监听 (仍然使用主要规则，性能考虑)
  document.addEventListener('scroll', () => {
    if (!canCopyAll) return
    // 这里的 rule 可能为空，如果为空就不执行全页复制的滚动更新
    const ruleSelector = rule?.selectorList.join()
    if (!ruleSelector?.length) return
    const elList = Array.from(document.querySelectorAll(ruleSelector)).filter(
      (item) => !item.getAttribute('data-uuid'),
    ) as HTMLElement[]
    if (!elList.length) return
    fullPageCopy(elList)
  })

  // document.addEventListener('copy', () => {
  //   if (!canCopyAll) return
  //   formatCopiedText()
  // })
  // 5. 复制事件监听：传入所有规则
  document.addEventListener('copy', (e) => {
    if (!canCopyAll) {
      // 传入 Object.values(rules) 让 handleMixedCopy 尝试匹配所有已知规则
      handleMixedCopy(e, Object.values(rules));
    }
  })
}

// async function fullPageCopy(targetList: HTMLElement[] = []) {
//   canCopyAll = true
//   if (!rule) return
//   const ruleSelector = rule?.selectorList.join()
//   if (!ruleSelector?.length) return
//   const elList = targetList.length ? targetList : document.querySelectorAll(ruleSelector)
//   for (const el of elList as HTMLElement[]) {
//     if (el.tagName === 'IMG' || !el.offsetHeight) continue
//     const uuid = crypto.randomUUID()
//     const parent = el.parentNode as HTMLElement
//     if (!parent) return
//     const parentPosition = window.getComputedStyle(parent).position
//     if (parentPosition === 'static') parent.style.position = 'relative'
//     const content = await rule.parse(el)
//     el.setAttribute('data-uuid', uuid)
//     el.classList.add('sss-none-select')
//     if (!content || content instanceof Blob) continue
//     const img = createOpacityImage({
//       width: el.offsetWidth,
//       height: el.offsetHeight,
//       alt: content,
//       id: uuid,
//     })
//     if (!img) return
//     const imgContainer = document.createElement('span')
//     imgContainer.className = 'sss-img-latex'
//     imgContainer.style.left = `${el.offsetLeft}px`
//     imgContainer.style.top = `${el.offsetTop}px`
//     imgContainer.appendChild(img)
//     el.parentNode?.insertBefore(imgContainer, el)
//   }
// }
async function fullPageCopy(targetList: HTMLElement[] = []) {
  canCopyAll = true

  // 全页复制目前简单处理，只使用初始化时探测到的主要规则
  // 如果需要支持沉浸式翻译的全页复制，这里也需要改成遍历 rules
  if (!rule) return

  const ruleSelector = rule.selectorList.join()
  if (!ruleSelector?.length) return
  const elList = targetList.length ? targetList : document.querySelectorAll(ruleSelector)

  // ... 后续逻辑保持不变 (循环 elList 处理 opacity image)
  for (const el of elList as HTMLElement[]) {
    if (el.tagName === 'IMG' || !el.offsetHeight) continue
    const uuid = crypto.randomUUID()
    const parent = el.parentNode as HTMLElement
    if (!parent) return
    const parentPosition = window.getComputedStyle(parent).position
    if (parentPosition === 'static') parent.style.position = 'relative'

    // 使用主要规则解析
    const content = await rule.parse(el)

    el.setAttribute('data-uuid', uuid)
    el.classList.add('sss-none-select')
    if (!content || content instanceof Blob) continue
    const img = createOpacityImage({
      width: el.offsetWidth,
      height: el.offsetHeight,
      alt: content,
      id: uuid,
    })
    if (!img) return
    const imgContainer = document.createElement('span')
    imgContainer.className = 'sss-img-latex'
    imgContainer.style.left = `${el.offsetLeft}px`
    imgContainer.style.top = `${el.offsetTop}px`
    imgContainer.appendChild(img)
    el.parentNode?.insertBefore(imgContainer, el)
  }
}
