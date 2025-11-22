import { getEle } from '@/lib'
import delay from 'delay'
import { addCopiedStyle, copyLatex, copyLatexAsImage, initMathml, svgToImage } from './util'

export const ImageAltRule = {
  selectorList: ['.sss-img-latex'],
  parse: async (el: HTMLElement) => el.children[0].getAttribute('alt'),
  pre,
  post,
}

export type Rule = {
  testUrl: string[]
  selectorList: string[]
  parse: (el: HTMLElement) => Promise<string | Blob | null>
  pre: <T extends string | Blob>(content: T) => T
  post: <T extends string | Blob>(el: HTMLElement, content: T) => Promise<void>
}

export const rules: Record<string, Rule> = {
  //arxiv的元素结构如下
  math_ltx: {
    testUrl: ['https://dlmf.nist.gov/5.12', 'https://arxiv.org/html/2412.11563v1'],
    selectorList: ['.ltx_equation .ltx_Math', 'math.ltx_math_unparsed', 'math.ltx_Math', 'ltx_math'],
    parse: async (el: HTMLElement) => el.getAttribute('alttext'),
    pre,
    post,
  },
  // immersive translate注入的元素如下，从外到内嵌套分别是：1. <font class="notranslate immersive-translate-target-inner immersive-translate-target-translation-theme-none-inner">; 1.1 <tex-math>; 1.1.1 <tex-math>的子节点<div class="MathJax_Display"> 用于displaystyle，也就是单独成行的公式 1.1.2 <tex-math>的子节点<span class="MathJax">，用于行内公式。公式代码在1.1.1和1.1.2 同id的第一个的父节点的兄弟节点<script>里。如何解析？
  immersive_translate: {
    testUrl: [],
    selectorList: [
      '.immersive-translate-target-inner tex-math .MathJax_Display',
      '.immersive-translate-target-inner tex-math .MathJax',
      '.immersive-translate-target-inner .MathJax_SVG',
    ],
    parse: async (el: HTMLElement) => {
      const targetId = el.id;
      console.log('👉 目标 ID:', targetId);
      if (!targetId) {
        console.warn('❌ 没有 ID，无法回溯原始公式', el);
        return null;
      }
      // 在整个文档中查找具有相同 ID 的元素
      const candidates = document.querySelectorAll(`#${CSS.escape(targetId)}`);
      console.log(`🔍 找到 ${candidates.length} 个同 ID 候选元素`);
      if (!candidates.length) return null;

      for (const candidate of candidates) {
        // 3.1 跳过自己 (即跳过 tex-math 内部的这个克隆体)
        // if (el.contains(candidate)) {
        //   continue;
        // }
        if (el.isConnected && el === candidate) {
          console.log('  跳过自己');
          continue;
        }
        // 3.2 检查这个候选元素的“真身”环境
        // 目标结构: <div class="MathJax_Display"><span id="目标ID">...</span></div> <script>...</script>  && (parent.classList.contains('MathJax_Display') || parent.classList.contains('MathJax'))
        const parent = candidate.parentElement;
        if (parent) {
          console.log('   -> 找到疑似真身父级:', parent.tagName, parent.className);
          // 4. 核心逻辑：公式代码在父节点的兄弟 script 标签里
          if (parent.classList.contains('MathJax_Display')) {
            const script = parent.parentElement?.querySelector('script');
            if (script && script.tagName === 'SCRIPT' && script.getAttribute('type')?.includes('math/tex')) {
              console.log('✅ 成功找到 Script:', script);
              return script.textContent;
            }
          }
          else {
            const script = parent.querySelector('script');
            // console.log('   -> script parent:', script.tagName, script.className);
            if (script && script.tagName === 'SCRIPT' && script.getAttribute('type')?.includes('math/tex')) {
              console.log('✅ 成功找到 Script:', script);
              return script.textContent;
            }
          }
        }
      }
      console.warn('❌ 遍历结束，未找到匹配的 Script');
      return null;
    },
    pre,
    post,
  },
  math_jax: {
    testUrl: [
      'https://www.andlearning.org/math-formula/',
      'https://zhuanlan.zhihu.com/p/115277553',
      'https://wuli.wiki/online/ODEa1.html',
      'https://ieeexplore.ieee.org/document/9072123',
      'https://math.stackexchange.com/questions/4819923/solving-the-system-frac1x-frac12y-x23y23x2y2-frac1',
    ],
    selectorList: [
      // '.MathJax_SVG_Display',
      // '.MathJax_SVG',
      // '.MathJax_Display',
      // '.MathJax',
      '.mathjax-tex',
      '.MathJax_Preview + .MathJax',
      '.MathJax_Preview + .MathJax_SVG_Display',
      '.MathJax_Preview + .MathJax_SVG',
      '.MathJax_Preview + .MathJax_Display',
      '.MathJax_Preview + .MathJax_CHTML',
      '.MathJax_Preview + .mjx-chtml',
    ],
    parse: async (el: HTMLElement) => {
      // 辅助函数：判断是否是有效的 Math 脚本
      const isValidScript = (node: Element | null | undefined) => {
        return node && node.tagName === 'SCRIPT' && node.getAttribute('type')?.includes('math/');
      };

      // 1. 卫语句：检查这个元素是否在沉浸式翻译容器内
      // 如果找到了父级容器，说明这个元素归 'immersive_translate' 规则管
      if (el.closest('.immersive-translate-target-inner')) {
        return; // 直接退出，不处理，也不报错
      }

      // 策略 1: 标准 MathJax，Script 是当前元素的下一个兄弟
      let scriptEl = el.nextElementSibling as HTMLScriptElement;

      // 策略 2: Nature 变体，Script 是“父元素”的下一个兄弟
      // 场景: el(.MathJax_SVG) -> parent(.MathJax_SVG_Display) -> nextSibling(Script)
      if (!isValidScript(scriptEl)) {
        scriptEl = el.parentElement?.nextElementSibling as HTMLScriptElement;
      }

      // 策略 3: 深度嵌套/包装器结构 (兜底)
      // 尝试在更外层的 .mathjax-tex 容器中查找
      if (!isValidScript(scriptEl)) {
        const wrapper = el.closest('.mathjax-tex') || el.parentElement?.parentElement;
        if (wrapper) {
          scriptEl = wrapper.querySelector('script[type^="math/tex"]') as HTMLScriptElement;
        }
      }

      // 最终检查
      if (!isValidScript(scriptEl)) {
        return null;
      }

      // 处理 MathML
      if (scriptEl.type.includes('math/mml')) {
        return initMathml().then(() => {
          return window.Mathml2latex.convert(scriptEl.innerHTML);
        });
      }

      // 返回 LaTeX 文本
      return scriptEl.textContent;

      //Debug1

      // console.log('--- Latex Copy Debug Start ---');
      // console.log('1. 用户点击的元素:', el);
      // // 策略 1: 尝试获取紧邻的下一个兄弟节点
      // let scriptEl = el.nextElementSibling as HTMLScriptElement

      // // 策略 2: 父容器查找 (Nature 专用)
      // if (!scriptEl || scriptEl.tagName !== 'SCRIPT') {
      //   console.log('2. 兄弟节点未找到 Script，尝试在父容器中查找...');
      //   // 打印父元素看看结构
      //   console.log('   父元素:', el.parentElement);
      //   scriptEl = el.parentElement?.querySelector('script[type^="math/tex"]') as HTMLScriptElement
      // }

      // console.log('3. 最终找到的 Script 元素:', scriptEl);

      // if (!scriptEl) {
      //   console.error('❌ 未找到任何 Script 标签，解析终止');
      //   return null;
      // }

      // console.log('4. Script 类型:', scriptEl.type);
      // const rawContent = scriptEl.innerHTML || scriptEl.textContent || '';
      // console.log('5. Script 原始内容 (Raw):', JSON.stringify(rawContent));

      // if (!scriptEl.type.includes('math/')) {
      //   console.error('❌ Script 类型不符合 math/ 要求');
      //   return null
      // }

      // // MathML 特殊处理
      // if (scriptEl.type.includes('math/mml')) {
      //   console.log('   检测到 MathML，正在转换...');
      //   return initMathml().then(() => {
      //     const latex = window.Mathml2latex.convert(scriptEl.innerHTML)
      //     console.log('   MathML 转换结果:', latex);
      //     return latex;
      //   })
      // }

      // console.log('6. 返回的 LaTeX 内容:', rawContent);
      // console.log('--- Latex Copy Debug End ---');
      // return rawContent

      // Original

      // const scriptEl = el.nextElementSibling as HTMLScriptElement
      // if (!scriptEl || scriptEl.tagName !== 'SCRIPT' || !scriptEl.type.includes('math/')) return
      // // https://www.sciencedirect.com/science/article/pii/S2095809919302279
      // if (scriptEl.type.includes('math/mml')) {
      //   return initMathml().then(() => {
      //     const latexContent = window.Mathml2latex.convert(scriptEl.innerHTML)
      //     return latexContent
      //   })
      // }
      // // 对于 math/tex 和 math/tex; mode=display，textContent 就是纯 LaTeX 代码
      // return scriptEl.textContent
    },
    pre,
    post,
  },
  math_ml: {
    testUrl: [],
    selectorList: ['.katex', '.maruku-mathml', 'katex-display', 'display-math'],
    parse: async (el: HTMLElement) => {
      const annotationEl =
        el.querySelector('.katex-mathml annotation') || el.querySelector('math annotation')

      const mathTexEl = el.querySelector('.katex-mathml') || el.querySelector('.katex-html')
      const mathTexElDomainList = ['chat.deepseek', 'csdn.net', 'bananaspace.org']
      // TODO: 'moonshot.cn', 'yiyan.baidu.com', 'yuanbao.tencent.com'无法解析'.katex-html'里的内容; 因katex output为htmlonly https://katex.org/docs/options.html
      const mathHTMLDomainList = ['moonshot.cn', 'yuanbao.tencent.com']

      const host = location.hostname
      // 获取数学公式dom及属性
      let latexContent = ''
      if (annotationEl?.getAttribute('encoding')?.includes('application/x-tex')) {
        latexContent = annotationEl.textContent as string
      } else if (host.includes('mathsolver.microsoft')) {
        const microsoftTexEl = el
          .closest(
            '[class^="Answer_resultsAnswer"]:has(.hidden),[class^="Step_stepExpression"]:has(.hidden)',
          )
          ?.querySelector('.hidden')
        // https://mathsolver.microsoft.com/en/solve-problem/4%20%60sin%20%60theta%20%60cos%20%60theta%20%3D%202%20%60sin%20%60theta
        latexContent = microsoftTexEl?.textContent as string
      } else if (mathHTMLDomainList.find((domain) => host.includes(domain))) {
        // 当前聊天泡泡
        const chatBubbleContainer = el.closest(
          '.agent-chat__list__item, .chat-content-item, .dialogue_card_item',
        )
        const copyButton = chatBubbleContainer?.querySelector(
          '.agent-chat__toolbar__copy, .segment-assistant-actions-content>.simple-button',
        ) as HTMLElement
        const targetIndex = Array.from(
          chatBubbleContainer?.querySelectorAll('.katex') || [],
        ).findIndex((item) => item === el)
        copyButton?.click()
        await delay(50)
        const clipboardContents = await navigator.clipboard.read()
        for (const item of clipboardContents) {
          for (const mimeType of item.types) {
            if (mimeType === 'text/plain') {
              const blob = await item.getType('text/plain')
              const blobText = await blob.text()
              const pureText = blobText.includes('```latex')
                ? blobText.replaceAll(/\`\`\`latex(.|\n|\s)+?\`\`\`/gm, '')
                : blobText
              const latexList = [...pureText.matchAll(/\\[\[\(]((?:.|\n|\s)+?)\\[\]\)]/gm)]
              const targetLatexItem = latexList[targetIndex]
              if (targetLatexItem) {
                return targetLatexItem[1]
              }
            }
          }
        }
      } else if (mathTexEl) {
        if (mathTexElDomainList.find((domain) => host.includes(domain))) {
          latexContent = katexContentExtra(mathTexEl.textContent as string)
        } else if (host.includes('leetcode.')) {
          // https://leetcode.cn/problems/single-number/solutions/2481594/li-yong-yi-huo-de-xing-zhi-fu-ti-dan-pyt-oizc/?envType=study-plan-v2&envId=top-100-liked
          const lastChild = mathTexEl.lastChild
          if (lastChild?.nodeType === 3) {
            latexContent = lastChild.textContent as string
          }
        }
      }
      return latexContent
    },
    pre,
    post,
  },
  math_jax_html: {
    testUrl: [],
    selectorList: ['mjx-container.MathJax', 'math'],
    parse: async (el: HTMLElement) => {
      const mathEl = el.tagName.toLowerCase() === 'math' ? el : el.querySelector('math')
      // svg with no content
      if (!mathEl) {
        const svgEl = el.querySelector('svg')
        if (svgEl) {
          // TODO: overlay, and convert image to latex
          return svgToImage(svgEl)
        }
      } else {
        return initMathml().then(() => {
          const latexContent = window.Mathml2latex.convert(mathEl.outerHTML)
          return latexContent
        })
      }
    },
    pre,
    post,
  },
  math_img: {
    testUrl: [
      'https://zh.wikipedia.org/wiki/%E5%AF%B9%E6%95%B0%E5%BE%AE%E5%88%86%E6%B3%95',
      'https://developer.nvidia.com/blog/improving-diffusion-models-as-an-alternative-to-gans-part-1/',
      'https://www.baike.com/wikiid/7822307514691700917?query=%E6%95%B0%E5%AD%A6%E8%A1%A8%E8%BE%BE%E5%BC%8F',
    ],
    selectorList: [
      '.mwe-math-element',
      'img[class*="tex-img"]',
      'img[class*="latex"]',
      'img[class*="formula"]',
      '[data-attrid^="variable"] img',
      '[data-attrid="formula-image"]',
      'div[data-type="formula"]:has(img[dataset-id="formula"])',
    ],
    parse: async (el: HTMLElement) => {
      const host = location.hostname
      let latexContent = ''
      if (host.includes('baike.')) {
        latexContent = getEle('img[dataset-id="formula"]', el)?.getAttribute(
          'dataset-value',
        ) as string
      } else {
        const imgEl = el.querySelector('img') || el.closest('img')
        if (!imgEl || !imgEl.alt) return ''
        latexContent = imgEl.alt
      }
      return latexContent
    },
    pre,
    post,
  },
  wolfram_math_img: {
    testUrl: ['https://mathworld.wolfram.com/HilbertSpace.html'],
    selectorList: ['img.numberedequation'],
    parse: async (el: HTMLElement) => {
      const element = el as HTMLImageElement
      if (!element.alt) return ''
      // element.alt is TexForm, not latex
      return element.alt
    },
    pre,
    post: async <T extends string | Blob>(el: HTMLElement, content: T) => {
      if (typeof content === 'string') {
        copyLatex(content, {
          text: 'Copied as TexForm(not LaTeX)',
        })
      }
      addCopiedStyle(el)
    },
  },
}

function pre<T extends string | Blob>(content: T): T {
  if (typeof content === 'string') {
    return latexRefine(content) as T // 处理 string 类型
    // biome-ignore lint/style/noUselessElse: <explanation>
  } else {
    return content // 直接返回 Blob 类型
  }
}

async function post<T extends string | Blob>(el: HTMLElement, content: T) {
  if (!content) return
  let copyPromise: Promise<void>
  if (content instanceof Blob) {
    copyPromise = copyLatexAsImage(content)
  } else {
    copyPromise = copyLatex(content)
  }
  await copyPromise
  addCopiedStyle(el)
}

// https://blog.csdn.net/qq_35357274/article/details/109935169
function katexContentExtra(content: string) {
  const reg1 = /\s+[^\s\n]{1}[\s|\n][\s|\n]/g
  const reg2 = /\\begin{.+?end{\w+?}$/
  const latexPattern = 'begin{'
  let refinedContent = content.replace(reg1, '').trim()
  if (refinedContent.includes(latexPattern)) {
    const matchRes = refinedContent.match(reg2)
    if (matchRes?.length) {
      refinedContent = matchRes[0]
    }
  }
  return refinedContent
}

function latexRefine(content: string) {
  const trimmedContent = trimPunctuation(content.trim())
    .replace(/\\&\\text{nbsp};/g, '\\enspace')
    .replace(/&nbsp;/g, '\\enspace')
  if (!trimmedContent.length) return ''
  if (trimmedContent.includes('\\\\') && !trimmedContent.startsWith('\\begin')) {
    return `\\begin{array}{c} ${trimmedContent} \\end{array}`
  }
  return trimmedContent
}

function trimPunctuation(str: string) {
  const punctionStr = ',`:!.;~`?\'"'
  const reg = new RegExp(`^[${punctionStr}]+|[${punctionStr}]+$`, 'g')
  return str.replace(reg, '').trim()
}
