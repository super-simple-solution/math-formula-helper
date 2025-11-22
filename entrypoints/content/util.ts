import { uuid } from '@/lib'
import { latexFormat } from '@/lib/latex'
import { LatexQueue, type Prefer, getPreference, watchPreference } from '@/lib/storage'
import { toast } from '@/lib/toast'
import * as clipboardPolyfill from 'clipboard-polyfill'
import { MathMLToLaTeX } from 'mathml-to-latex'
import type { Unwatch } from 'wxt/utils/storage'
import type { Rule } from './const'
let preferData: Prefer

function initPrefer() {
  getPreference().then(setPrefer)
}

function setPrefer(prefer: Prefer) {
  preferData = prefer
}

export function watchPrefer(): Unwatch {
  initPrefer()
  return watchPreference(setPrefer)
}

let clipboard: Clipboard =
  navigator.clipboard ||
  ({
    ...clipboardPolyfill,
    addEventListener: () => { },
    removeEventListener: () => { },
    dispatchEvent: () => true,
  } as Clipboard)

export async function initClipboard() {
  if (!clipboard) {
    clipboard = {
      ...clipboardPolyfill,
      addEventListener: () => { },
      removeEventListener: () => { },
      dispatchEvent: () => true,
    } as Clipboard
  }
}

export async function initMathml() {
  if (!window.Mathml2latex) {
    window.Mathml2latex = MathMLToLaTeX
  }
}

export async function formatCopiedText() {
  const text = await clipboard.readText()
  await clipboard.writeText(text)
}

export async function copyLatex(latexContent: string, options = { text: 'Copied' }) {
  const content = latexFormat(latexContent, preferData)
  await clipboard.writeText(content)
  if (preferData.show_toast) {
    toast(options)
  }
  LatexQueue.enqueue({
    url: location.href.replace(location.hash, ''),
    value: latexContent, // 存储不带格式的latex, 使用时再带格式
    id: uuid(),
  })
}

export async function copyLatexAsImage(
  latexBlob: Blob,
  options = { text: 'LaTeX content not found, Copied it as Image' },
) {
  await clipboard.write([
    new ClipboardItem({
      [latexBlob.type]: latexBlob,
    }),
  ])
  if (preferData.show_toast) {
    toast(options)
  }
}

export function addCopiedStyle(el: HTMLElement) {
  el.classList.add('sss-copied')
  el.addEventListener(
    'mouseout',
    () => {
      setTimeout(() => el.classList.remove('sss-copied'), 500)
    },
    { once: true },
  )
}

export async function svgToImage(svgElement: SVGSVGElement): Promise<Blob> {
  const { clientWidth: width, clientHeight: height } = svgElement
  const clonedSvgElement = svgElement.cloneNode(true) as HTMLElement
  const outerHTML = clonedSvgElement.outerHTML
  const blob = new Blob([outerHTML], { type: 'image/svg+xml;charset=utf-8' })
  const blobURL = URL.createObjectURL(blob)

  const image = await loadImage(blobURL)
  const canvas = document.createElement('canvas')
  // 高分屏
  // increase the actual size of our canvas
  canvas.width = width * devicePixelRatio
  canvas.height = height * devicePixelRatio

  // ensure all drawing operations are scaled
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not get canvas context')
  context.scale(devicePixelRatio, devicePixelRatio)
  // draw image in canvas starting left-0 , top - 0
  context.drawImage(image, 0, 0, width, height)

  return getCanvasBlob(canvas)
}

function getCanvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
    })
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = url
  })
}

export function createOpacityImage(options: {
  width: number
  height: number
  id: string
  alt: string
}): HTMLImageElement | undefined {
  const { width, height, id, alt } = options
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = 'rgba(255, 0, 0, 0)'
  ctx.fillRect(0, 0, width, height)

  const imageDataURL = canvas.toDataURL('image/png')
  const img = new Image()
  img.src = imageDataURL
  img.id = id
  img.alt = latexFormat(alt, preferData)
  return img
}

export async function handleMixedCopy(e: ClipboardEvent, activeRules: Rule[]) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);

  // 1. 获取剪贴板片段 (Fragment) 并放入临时 div
  const fragment = range.cloneContents();
  const div = document.createElement('div');
  div.appendChild(fragment);
  console.log('📋 剪贴板片段结构:', div.innerHTML);

  let hasMatch = false;
  // === 公式处理 (增强版) ===
  for (const currentRule of activeRules) {
    const selector = currentRule.selectorList.join(',');

    // 2. 在“原网页(Live DOM)”中查找选区内的公式
    // 因为原网页结构完整，Select 和 Parse 都能正常工作
    const liveCandidates = document.querySelectorAll(selector);
    const liveMatches: HTMLElement[] = [];

    liveCandidates.forEach((el) => {
      // 判断元素是否在用户选区内
      if (range.intersectsNode(el)) {
        liveMatches.push(el as HTMLElement);
      }
    });

    if (liveMatches.length === 0) continue;

    // 3. 遍历原网页选中的公式，解析并替换 Fragment 中的对应项
    const replaceTasks = liveMatches.map(async (liveEl, index) => {
      // A. 在原网页解析 LaTeX (此时环境完整，能找到 script)
      let latex: string | Blob | null = null;
      try {
        latex = await currentRule.parse(liveEl);
      } catch (err) {
        console.error('Parse error:', err);
      }

      if (typeof latex === 'string' && latex) {
        hasMatch = true;
        const formattedLatex = latexFormat(latex, preferData);
        const textNode = document.createTextNode(` ${formattedLatex} `);

        // 在 Fragment 中找到对应的节点进行替换
        // 优先使用 ID 匹配 (沉浸式翻译公式都有 ID)
        let fragEl: HTMLElement | null = null;
        if (liveEl.id) {
          fragEl = div.querySelector(`#${CSS.escape(liveEl.id)}`);
        }

        // 如果 Fragment 里找到了这个节点，就把它替换掉
        if (fragEl && fragEl.parentNode) {
          // 尝试替换外层的 tex-math 包装器 (如果存在)，保持结果干净
          const wrapper = fragEl.closest('tex-math');
          const targetToReplace = wrapper || fragEl;

          if (targetToReplace.parentNode) {
            targetToReplace.parentNode.replaceChild(textNode, targetToReplace);
          }
        }
      }
    });

    await Promise.all(replaceTasks);
  }

  let hasCleaned = false;
  const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
  let currentNode: Node | null = walker.nextNode();

  // 正则说明: 
  // \s* : 匹配 0 个或多个空白 (包含空格、Tab)
  // [\r\n]+ : 匹配 1 个或多个换行符
  // \s* : 匹配 0 个或多个空白
  // 效果: 把 "word \n word", "word\nword", "word   \n   word" 都变成 "word word"
  const dirtyPattern = /\s*[\r\n]+\s*/g;

  while (currentNode) {
    if (currentNode.nodeValue && dirtyPattern.test(currentNode.nodeValue)) {
      // 只有当节点在 <a> 标签内，或者你希望全局清洗时才执行
      // 这里我们做个检查：如果是 <a> 标签内的文本，或者看起来像是被错误打断的句子
      if (currentNode.parentElement?.tagName === 'A' || true) { // true 表示全局清洗
        currentNode.nodeValue = currentNode.nodeValue.replace(dirtyPattern, ' ');
        hasCleaned = true;
      }
    }
    currentNode = walker.nextNode();
  }
  // === 决定是否拦截复制 ===
  // 策略：
  // 1. 如果包含公式 (hasMatch)，必须拦截以写入 LaTeX。
  // 2. 如果进行了文本清洗 (hasCleaned)，必须拦截以写入干净文本。
  // 3. 如果什么都没发生，放行，让浏览器执行默认复制 (保留富文本格式)。
  if (!hasMatch && !hasCleaned) {
    console.log('全都不会做');
    return;
  }

  // 拦截默认行为
  e.preventDefault();

  // 获取最终文本
  // 提示：div.textContent 会去除所有 HTML 标签，只保留纯文本，非常适合 Markdown 粘贴
  let finalString = div.textContent || '';

  // (可选) 全局兜底清洗：防止某些非 <a> 标签的文本也有这个问题
  if (hasCleaned) {
    finalString = finalString.replace(/\s*[\r\n]+\s*/g, ' ');
  }

  await clipboard.writeText(finalString);

  // 仅在有公式处理时弹窗，或者你可以根据 preferData.show_toast 决定是否提示清洗成功
  if (preferData.show_toast) {
    const msg = hasMatch ? 'Copied with LaTeX! 📋' : 'Text cleaned & copied! 🧹';
    toast({ text: msg });
  }
}
