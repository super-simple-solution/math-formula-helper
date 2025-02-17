import { getEle } from '@/utils'
import { addCopiedStyle, copyLatex, copyLatexAsImage, initMathml, svgToImage } from './util'

export const ImageAltRule = {
  selectorList: ['.sss-img-latex'],
  parse: async (el) => el.children[0].getAttribute('alt'),
  pre,
  post,
}

export const rules = {
  math_ltx: {
    testUrl: ['https://dlmf.nist.gov/5.12', 'https://arxiv.org/html/2412.11563v1'],
    selectorList: ['.ltx_equation .ltx_Math', 'math.ltx_math_unparsed', 'math.ltx_Math'],
    parse: async (el) => el.getAttribute('alttext'),
    pre,
    post,
  },
  math_jax: {
    testUrl: [
      'https://www.andlearning.org/math-formula/',
      'https://zhuanlan.zhihu.com/p/115277553',
      'https://wuli.wiki/online/ODEa1.html',
      'https://ieeexplore.ieee.org/document/9072123',
    ],
    selectorList: [
      '.MathJax_Preview + .MathJax',
      '.MathJax_Preview + .MathJax_SVG_Display',
      '.MathJax_Preview + .MathJax_SVG',
      '.MathJax_Preview + .MathJax_Display',
      '.MathJax_Preview + .MathJax_CHTML',
      '.MathJax_Preview + .mjx-chtml',
    ],
    parse: async (el) => {
      const scriptEl = el.nextElementSibling
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
    testUrl: [
      'https://juejin.cn/post/7210175991837507621',
      'http://wujiawen.xyz/posts/notes/articles/%E7%AC%94%E8%AE%B0llama_note.html',
      'https://blog.csdn.net/qq_35357274/article/details/109935169',
      'https://ncatlab.org/nlab/show/covering+space', //.maruku-mathml
      'https://www.bananaspace.org/wiki/%E8%AE%B2%E4%B9%89:%E6%A6%82%E7%8E%87%E4%B8%8E%E6%95%B0%E7%90%86%E7%BB%9F%E8%AE%A1(PKU-COE)/%E6%A6%82%E7%8E%87%E8%AE%BA%E7%9A%84%E5%9F%BA%E6%9C%AC%E6%A6%82%E5%BF%B5/%E5%8F%A4%E5%85%B8%E6%A6%82%E5%9E%8B',
    ],
    selectorList: ['.katex', '.maruku-mathml'],
    parse: async (el) => {
      const annotationEl =
        el.querySelector('.katex-mathml annotation') || el.querySelector('math annotation')

      const mathTexEl = el.querySelector('.katex-mathml') || el.querySelector('.katex-html')
      const mathTexElDomainList = ['chat.deepseek', 'csdn.net', 'bananaspace.org']

      const host = location.host
      // 获取数学公式dom及属性
      let latexContent = ''
      if (annotationEl?.getAttribute('encoding').includes('application/x-tex')) {
        latexContent = annotationEl.textContent
      } else if (host.includes('mathsolver.microsoft')) {
        const microsoftTexEl = el
          .closest(
            '[class^="Answer_resultsAnswer"]:has(.hidden),[class^="Step_stepExpression"]:has(.hidden)',
          )
          ?.querySelector('.hidden')
        // https://mathsolver.microsoft.com/en/solve-problem/4%20%60sin%20%60theta%20%60cos%20%60theta%20%3D%202%20%60sin%20%60theta
        latexContent = microsoftTexEl.textContent
      } else if (mathTexEl) {
        if (mathTexElDomainList.find((domain) => host.includes(domain))) {
          latexContent = katexContentExtra(mathTexEl.textContent)
        } else if (host.includes('leetcode.')) {
          // https://leetcode.cn/problems/single-number/solutions/2481594/li-yong-yi-huo-de-xing-zhi-fu-ti-dan-pyt-oizc/?envType=study-plan-v2&envId=top-100-liked
          const lastChild = mathTexEl.lastChild
          if (lastChild.nodeType === 3) {
            latexContent = lastChild.textContent
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
    parse: async (el) => {
      const mathEl = el.querySelector('mjx-assistive-mml')
      // svg with no content
      if (!mathEl) {
        const svgEl = el.querySelector('svg')
        // TODO: overlay, and convert image to latex
        return svgToImage(svgEl)
      }
      return initMathml().then(() => {
        const latexContent = window.Mathml2latex.convert(mathEl.innerHTML)
        return latexContent
      })
    },
    pre: (content) => {
      if (!content) return
      if (content instanceof Blob) return content
      return latexRefine(content)
    },
    post: (el, content) => {
      if (!content) return
      let copyPromise
      if (content instanceof Blob) {
        copyPromise = copyLatexAsImage(content)
      } else {
        copyPromise = copyLatex(content)
      }
      copyPromise.then(() => addCopiedStyle(el))
    },
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
    parse: async (el) => {
      const host = location.host
      let latexContent = ''
      if (host.includes('baike.')) {
        latexContent = getEle('img[dataset-id="formula"]', el).getAttribute('dataset-value')
      } else {
        const imgEl = el.querySelector('img') || el.closest('img')
        if (!imgEl || !imgEl.alt) return
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
    parse: async (el) => {
      if (!el.alt) return
      // el.alt is TexForm, not latex
      return el.alt
    },
    pre: (content) => content.trim(),
    post: (el, content) => {
      copyLatex(content, {
        text: 'Copied as TexForm(not LaTeX)',
      }).then(() => addCopiedStyle(el))
    },
  },
}

function pre(content) {
  return latexRefine(content)
}

function post(el, content) {
  copyLatex(content).then(() => addCopiedStyle(el))
}

// https://blog.csdn.net/qq_35357274/article/details/109935169
function katexContentExtra(content) {
  const reg1 = /\s+[^\s\n]{1}[\s|\n][\s|\n]/g
  const reg2 = /\\begin{.+?end{\w+?}$/
  const latexPattern = 'begin{'
  let refinedContent = content.replace(reg1, '').trim()
  if (refinedContent.includes(latexPattern) && refinedContent.match(reg2)) {
    refinedContent = refinedContent.match(reg2)[0]
  }
  return refinedContent
}

function latexRefine(content) {
  const trimmedContent = content.trim()
  if (!trimmedContent.length) return ''
  if (trimmedContent.includes('\\\\') && !trimmedContent.startsWith('\\begin')) {
    return `\\begin{array}{c} ${trimmedContent} \\end{array}`
  }
  return trimmedContent.replace(/&nbsp;/g, '\\enspace ')
}
