import { copyLatex, copyLatexAsImage, svgToImage } from './util'

export const rules = {
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
    parser: (el) => {
      if (!el) return
      const scriptEl = el.nextElementSibling
      if (scriptEl.tagName === 'SCRIPT' && scriptEl.type.includes('math/tex')) {
        const latexContent = scriptEl.textContent.trim()
        if (!latexContent.length) return
        copyLatex(latexRefine(latexContent), el)
      }
    },
  },
  math_ml: {
    testUrl: [
      'https://juejin.cn/post/7210175991837507621',
      'http://wujiawen.xyz/posts/notes/articles/%E7%AC%94%E8%AE%B0llama_note.html',
    ],
    selectorList: ['.katex'],
    parser: (el) => {
      if (!el) return
      const annotationEl = el.querySelector('.katex-mathml annotation')
      // https://mathsolver.microsoft.com/en/solve-problem/4%20%60sin%20%60theta%20%60cos%20%60theta%20%3D%202%20%60sin%20%60theta
      const hiddenTexEl = el.closest('.answer')?.previousElementSibling
      // https://leetcode.cn/problems/single-number/solutions/2481594/li-yong-yi-huo-de-xing-zhi-fu-ti-dan-pyt-oizc/?envType=study-plan-v2&envId=top-100-liked
      const mathTexEl = el.querySelector('.katex-mathml')
      // 获取数学公式dom及属性
      let latexContent = ''
      if (annotationEl?.getAttribute('encoding').includes('application/x-tex')) {
        latexContent = annotationEl.textContent.trim()
      } else if (hiddenTexEl?.classList.contains('hidden')) {
        latexContent = hiddenTexEl.textContent.trim()
      } else if (mathTexEl && window.location.host.indexOf('leetcode') > -1) {
        const nodeList = mathTexEl.childNodes
        latexContent = nodeList[nodeList.length - 1]
      }
      if (!latexContent.length) return
      copyLatex(latexRefine(latexContent), el)
    },
  },
  math_jax_html: {
    key: 'math_jax_html',
    testUrl: ['https://www.mathreference.org/'],
    selectorList: ['mjx-container.MathJax'],
    parser: (el) => {
      if (!el) return
      const mathEl = el.querySelector('mjx-assistive-mml')
      // svg with no content
      if (!mathEl) {
        const svgEl = el.querySelector('svg')
        // TODO: overlay, and convert image to latex
        svgToImage(svgEl).then((blob) => {
          copyLatexAsImage(blob, el)
        })
        return
      }
      // MathML2LaTeX
      if (!window.Mathml2latex) return
      const latexContent = window.Mathml2latex.convert(mathEl.innerHTML)
      copyLatex(latexRefine(latexContent), el)
    },
  },
  math_img: {
    testUrl: [
      'https://zh.wikipedia.org/wiki/%E5%AF%B9%E6%95%B0%E5%BE%AE%E5%88%86%E6%B3%95',
      'https://developer.nvidia.com/blog/improving-diffusion-models-as-an-alternative-to-gans-part-1/',
    ],
    selectorList: ['.mwe-math-element', 'img[class*="tex-img"]', 'img[class*="latex"]'],
    parser: (el) => {
      if (!el) return
      const imgEl = el.querySelector('img') || el.closest('img')
      if (!imgEl || !imgEl.alt) return
      copyLatex(latexRefine(imgEl.alt), el)
    },
  },
  // wolfram_math_img: {
  //   testUrl: ['https://mathworld.wolfram.com/HilbertSpace.html'],
  //   selectorList: ['img.numberedequation'],
  //   parser: (el) => {
  //     if (!el) return
  //     if (!el.alt) return
  //     TODO: el.alt is TexForm, not latex
  //     copyLatex(el.alt, el)
  //   },
  // },
}

function latexRefine(content) {
  if (content.includes('\\\\') && !content.startsWith('\\begin')) {
    return `\\begin{array}{c} ${content} \\end{array}`
  }
  return content.replace(/&nbsp;/g, '\\enspace ')
}
