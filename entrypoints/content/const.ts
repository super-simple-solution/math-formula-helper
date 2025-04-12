import { getEle } from '@/lib'
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
  math_ltx: {
    testUrl: ['https://dlmf.nist.gov/5.12', 'https://arxiv.org/html/2412.11563v1'],
    selectorList: ['.ltx_equation .ltx_Math', 'math.ltx_math_unparsed', 'math.ltx_Math'],
    parse: async (el: HTMLElement) => el.getAttribute('alttext'),
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
      '.MathJax_Preview + .MathJax',
      '.MathJax_Preview + .MathJax_SVG_Display',
      '.MathJax_Preview + .MathJax_SVG',
      '.MathJax_Preview + .MathJax_Display',
      '.MathJax_Preview + .MathJax_CHTML',
      '.MathJax_Preview + .mjx-chtml',
    ],
    parse: async (el: HTMLElement) => {
      const scriptEl = el.nextElementSibling as HTMLScriptElement
      if (!scriptEl || scriptEl.tagName !== 'SCRIPT' || !scriptEl.type.includes('math/')) return
      // https://www.sciencedirect.com/science/article/pii/S2095809919302279
      if (scriptEl.type.includes('math/mml')) {
        return initMathml().then(() => {
          const latexContent = window.Mathml2latex.convert(scriptEl.innerHTML)
          return latexContent
        })
      }
      return scriptEl.textContent
    },
    pre,
    post,
  },
  math_ml: {
    testUrl: [],
    selectorList: ['.katex', '.maruku-mathml'],
    parse: async (el: HTMLElement) => {
      const annotationEl =
        el.querySelector('.katex-mathml annotation') || el.querySelector('math annotation')

      const mathTexEl = el.querySelector('.katex-mathml') || el.querySelector('.katex-html')
      // TODO: 'moonshot.cn'， 'yiyan.baidu.com'无法解析'.katex-html'里的内容; 因katex output为htmlonly https://katex.org/docs/options.html
      const mathTexElDomainList = ['chat.deepseek', 'csdn.net', 'bananaspace.org']

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
    testUrl: [
      'https://www.mathreference.org/',
      'https://www.sciencedirect.com/science/article/pii/S2095809919302279',
    ],
    selectorList: ['mjx-container.MathJax'],
    parse: async (el: HTMLElement) => {
      const mathEl = el.querySelector('mjx-assistive-mml')
      // svg with no content
      if (!mathEl) {
        const svgEl = el.querySelector('svg')
        if (svgEl) {
          // TODO: overlay, and convert image to latex
          return svgToImage(svgEl)
        }
      } else {
        return initMathml().then(() => {
          const latexContent = window.Mathml2latex.convert(mathEl.innerHTML)
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
      'div[data-type="formula"]:has(img[dataset-id="formula"])',
    ],
    parse: async (el: HTMLElement) => {
      const host = location.host
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
