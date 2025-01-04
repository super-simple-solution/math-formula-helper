import { copyLatex, copyLatexAsImage, addCopiedStyle, svgToImage, initMathml } from './util'
import { getEle } from '@/utils'

export const ImageAltRule = {
  selectorList: ['.sss-img-latex'],
  parse: async (el) => el.children[0].getAttribute('alt'),
  pre,
  post,
}

export const rules = {
  math_ltx: {
    testUrl: ['https://dlmf.nist.gov/5.12'],
    selectorList: ['.ltx_equation .ltx_Math'],
    parse: async (el) => el.getAttribute('alttext'),
    pre,
    post,
  },
  math_jax: {
    testUrl: [
      'https://www.andlearning.org/math-formula/',
      'https://zhuanlan.zhihu.com/p/115277553',
      'https://wuli.wiki/online/ODEa1.html',
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
      } else {
        return scriptEl.textContent
      }
    },
    pre,
    post,
  },
  math_ml: {
    testUrl: [
      'https://juejin.cn/post/7210175991837507621',
      'http://wujiawen.xyz/posts/notes/articles/%E7%AC%94%E8%AE%B0llama_note.html',
      'https://blog.csdn.net/qq_35357274/article/details/109935169',
    ],
    selectorList: ['.katex'],
    parse: async (el) => {
      const annotationEl = el.querySelector('.katex-mathml annotation')
      // https://mathsolver.microsoft.com/en/solve-problem/4%20%60sin%20%60theta%20%60cos%20%60theta%20%3D%202%20%60sin%20%60theta
      const hiddenTexEl = el.closest('.answer')?.previousElementSibling
      // https://leetcode.cn/problems/single-number/solutions/2481594/li-yong-yi-huo-de-xing-zhi-fu-ti-dan-pyt-oizc/?envType=study-plan-v2&envId=top-100-liked
      const mathTexEl = el.querySelector('.katex-mathml') || el.querySelector('.katex-html')
      const host = location.host
      // 获取数学公式dom及属性
      let latexContent = ''
      if (annotationEl?.getAttribute('encoding').includes('application/x-tex')) {
        latexContent = annotationEl.textContent
      } else if (hiddenTexEl?.classList.contains('hidden')) {
        latexContent = hiddenTexEl.textContent
      } else if (mathTexEl) {
        if (host.includes('leetcode.')) {
          const lastChild = mathTexEl.lastChild
          if (lastChild.nodeType === 3) {
            latexContent = lastChild.textContent
          }
        } else if (host.includes('csdn.net')) {
          latexContent = katexContentExtra(mathTexEl.textContent)
        }
      }
      return latexContent
    },
    pre,
    post,
  },
  math_jax_html: {
    testUrl: ['https://www.mathreference.org/', 'https://www.sciencedirect.com/science/article/pii/S2095809919302279'],
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
  content = content.replace(reg1, '').trim()
  if (content.includes(latexPattern) && content.match(reg2)) {
    content = content.match(reg2)[0]
  }
  return content
}

function latexRefine(content) {
  content = content.trim()
  if (!content.length) return ''
  if (content.includes('\\\\') && !content.startsWith('\\begin')) {
    return `\\begin{array}{c} ${content} \\end{array}`
  }
  return content.replace(/&nbsp;/g, '\\enspace ')
}
