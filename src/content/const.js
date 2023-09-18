import { copyLatex, copyLatexAsImage, svgToImage } from './util'

const isVIP = false

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
      // 获取数学公式dom及属性
      if (annotationEl.getAttribute('encoding').includes('application/x-tex')) {
        const latexContent = annotationEl.textContent.trim()
        if (!latexContent.length) return
        copyLatex(latexRefine(latexContent), el)
      }
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
          if (isVIP) {
            // TODO: send blob to server
          } else {
            copyLatexAsImage(blob, el)
          }
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
    testUrl: ['https://zh.wikipedia.org/wiki/%E5%AF%B9%E6%95%B0%E5%BE%AE%E5%88%86%E6%B3%95'],
    selectorList: ['.mwe-math-element'],
    parser: (el) => {
      if (!el) return
      const imgEl = el.querySelector('img')
      if (!imgEl) return
      if (!imgEl.alt) return
      copyLatex(imgEl.alt, el)
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
