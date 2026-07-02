import { getEle } from '@/lib'
import type { MathJaxPageSource } from '@/lib/extension-action'
import { refineLatexSource } from '@/lib/latex'
import { hasUnknownLatexMacros } from '@/lib/latex-macros'
import { cleanMathml } from '@/lib/mathml'
import delay from 'delay'
import { copyLatex, copyLatexAsImage, getMathJaxSourceFromPage } from './copy-pipeline'
import {
  addCopiedStyle,
  initMathml,
  svgToImage,
} from './util'
import {
  CopySourceKind,
  copyResult,
  detectDisplayMode,
  type CopyQuality,
  type CopyResult,
  type RuleParseResult,
} from './copy-result'
import { katexHtmlToLatex, recoverLatexFromKatexText } from './katex-html-fallback'

export const ImageAltRule = {
  selectorList: ['.sss-img-latex'],
  parse: async (el: HTMLElement) => {
    const content = el.children[0]?.getAttribute('alt')
    return content
      ? copyResult(content, {
          sourceKind: CopySourceKind.ImageAlt,
          quality: 'fallback',
          displayMode: detectDisplayMode(el),
        })
      : null
  },
  pre,
  post,
}

export type Rule = {
  testUrl: string[]
  selectorList: string[]
  parse: (el: HTMLElement) => Promise<RuleParseResult>
  pre: <T extends string | Blob>(content: T) => T
  post: <T extends string | Blob>(el: HTMLElement, content: T, result?: CopyResult) => Promise<void>
}

export const rules: Record<string, Rule> = {
  //arxiv的元素结构如下
  math_ltx: {
    testUrl: ['https://dlmf.nist.gov/5.12', 'https://arxiv.org/html/2412.11563v1'],
    selectorList: [
      '.ltx_equation .ltx_Math',
      'math.ltx_math_unparsed',
      'math.ltx_Math',
      'ltx_math',
    ],
    parse: async (el: HTMLElement) => {
      const content = el.getAttribute('alttext')
      return content
        ? copyResult(content, {
            sourceKind: CopySourceKind.Annotation,
            quality: 'exact',
            displayMode: detectDisplayMode(el),
          })
        : null
    },
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
      const targetId = el.id
      if (!targetId) {
        return null
      }
      // 在整个文档中查找具有相同 ID 的元素
      const candidates = document.querySelectorAll(`#${CSS.escape(targetId)}`)
      if (!candidates.length) return null

      for (const candidate of candidates) {
        // 3.1 跳过自己 (即跳过 tex-math 内部的这个克隆体)
        // if (el.contains(candidate)) {
        //   continue;
        // }
        if (el.isConnected && el === candidate) {
          continue
        }
        // 3.2 检查这个候选元素的“真身”环境
        // 目标结构: <div class="MathJax_Display"><span id="目标ID">...</span></div> <script>...</script>  && (parent.classList.contains('MathJax_Display') || parent.classList.contains('MathJax'))
        const parent = candidate.parentElement
        if (parent) {
          // 4. 核心逻辑：公式代码在父节点的兄弟 script 标签里
          if (parent.classList.contains('MathJax_Display')) {
            const script = parent.parentElement?.querySelector('script')
            if (
              script &&
              script.tagName === 'SCRIPT' &&
              script.getAttribute('type')?.includes('math/tex')
            ) {
              return script.textContent
                ? copyResult(script.textContent, {
                    sourceKind: CopySourceKind.MathTexScript,
                    quality: 'exact',
                    displayMode: 'display',
                  })
                : null
            }
          } else {
            const script = parent.querySelector('script')
            if (
              script &&
              script.tagName === 'SCRIPT' &&
              script.getAttribute('type')?.includes('math/tex')
            ) {
              return script.textContent
                ? copyResult(script.textContent, {
                    sourceKind: CopySourceKind.MathTexScript,
                    quality: 'exact',
                    displayMode: 'inline',
                  })
                : null
            }
          }
        }
      }
      return null
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
      '.mathjax-tex',
      '.MathJax_Preview + .MathJax',
      '.MathJax_Preview + .MathJax_SVG_Display',
      '.MathJax_Preview + .MathJax_SVG',
      '.MathJax_Preview + .MathJax_Display',
      'tex-math + .MathJax_Display',
      '.MathJax_Preview + .MathJax_CHTML',
      '.MathJax_Preview + .mjx-chtml',
      '.MathJax',
      '.MathJax_Display',
      '.MathJax_SVG_Display',
      '.MathJax_SVG',
      '.MathJax_CHTML',
      '.mjx-chtml',
      'mjx-container.MathJax',
    ],
    parse: async (el: HTMLElement) => {
      if (el.closest('.immersive-translate-target-inner')) return null

      const scriptEl = findMathScript(el)
      if (scriptEl) {
        if (scriptEl.type.includes('math/mml')) {
          const converted = await convertMathml(scriptEl.innerHTML || scriptEl.textContent || '')
          return copyResult(converted.latex, {
            sourceKind: CopySourceKind.MathML,
            quality: 'converted',
            displayMode: detectDisplayMode(el),
            mathml: converted.mathml,
          })
        }
        const embeddedMathml = getCleanEmbeddedMathml(el)
        return scriptEl.textContent
          ? copyResult(scriptEl.textContent, {
              sourceKind: CopySourceKind.MathTexScript,
              quality: 'exact',
              displayMode: detectDisplayMode(el),
              mathml: embeddedMathml,
            })
          : null
      }

      const dataMath =
        el.getAttribute('data-math') ||
        el.getAttribute('data-latex') ||
        el.closest('[data-math]')?.getAttribute('data-math') ||
        el.closest('[data-latex]')?.getAttribute('data-latex')
      if (dataMath) {
        return copyResult(dataMath, {
          sourceKind: CopySourceKind.DataAttribute,
          quality: 'exact',
          displayMode: detectDisplayMode(el),
          mathml: getCleanEmbeddedMathml(el),
        })
      }

      const targetId = ensureElementId(el)
      const apiResult = targetId ? await getMathJaxSourceFromPage(targetId) : null
      if (apiResult) {
        const embeddedMathml = findEmbeddedMathml(el)
        const source = await normalizeMathJaxSource(apiResult)
        const sourceMathml = source.mathml ?? (embeddedMathml ? cleanMathml(embeddedMathml) : undefined)
        if (sourceMathml && hasUnknownLatexMacros(source.latex)) {
          const converted = await convertMathml(sourceMathml)
          return copyResult(converted.latex, {
            sourceKind: CopySourceKind.MathML,
            quality: 'converted',
            displayMode: detectDisplayMode(el),
            mathml: converted.mathml,
            warnings: ['Converted from MathJax MathML because raw TeX appears to use site macros.'],
          })
        }

        return copyResult(source.latex, {
          sourceKind: source.sourceKind,
          quality: source.quality,
          displayMode: detectDisplayMode(el),
          mathml: sourceMathml,
        })
      }

      const fallback =
        el.getAttribute('alt') ||
        el.querySelector('img')?.getAttribute('alt') ||
        el.getAttribute('aria-label') ||
        null
      return fallback
        ? copyResult(fallback, {
            sourceKind: CopySourceKind.ImageAlt,
            quality: 'fallback',
            displayMode: detectDisplayMode(el),
          })
        : null
    },
    pre,
    post,
  },
  math_ml: {
    testUrl: [],
    selectorList: ['.katex', '.katex-display', '.maruku-mathml', '.display-math', 'MJX-TEX'],
    parse: async (el: HTMLElement) => {
      const annotationEl =
        el.querySelector('.katex-mathml annotation') || el.querySelector('math annotation')

      const mathTexEl = el.querySelector('.katex-mathml') || el.querySelector('.katex-html')
      const mathTexElDomainList = ['chat.deepseek', 'csdn.net', 'bananaspace.org']
      const mathHTMLDomainList = ['moonshot.cn', 'yuanbao.tencent.com']

      const host = location.hostname
      let latexContent = ''
      let sourceKind = CopySourceKind.Unknown
      let quality: CopyQuality = 'exact'
      let mathml: string | undefined
      let warnings: string[] | undefined
      if (annotationEl?.getAttribute('encoding')?.includes('application/x-tex')) {
        latexContent = annotationEl.textContent as string
        sourceKind = CopySourceKind.Annotation
        const mathEl = annotationEl.closest('math')
        mathml = mathEl ? cleanMathml(mathEl.outerHTML) : undefined
      } else if (pageHostMatches('gemini.google')) {
        const geminiTexEl = el.closest('.math-block,.math-inline')
        latexContent = geminiTexEl?.getAttribute('data-math') as string
        sourceKind = CopySourceKind.DataAttribute
      } else if (pageHostMatches('mathsolver.microsoft')) {
        const microsoftTexEl = el
          .closest(
            '[class^="Answer_resultsAnswer"]:has(.hidden),[class^="Step_stepExpression"]:has(.hidden)',
          )
          ?.querySelector('.hidden')
        latexContent = microsoftTexEl?.textContent as string
        sourceKind = CopySourceKind.DataAttribute
      } else if (mathHTMLDomainList.find((domain) => pageHostMatches(domain))) {
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
                return copyResult(targetLatexItem[1], {
                  sourceKind: CopySourceKind.SiteClipboard,
                  quality: 'exact',
                  displayMode: detectDisplayMode(el),
                })
              }
            }
          }
        }
      } else if (mathTexEl) {
        if (mathTexElDomainList.find((domain) => pageHostMatches(domain))) {
          const htmlLatex = katexHtmlToLatex(el)
          latexContent = htmlLatex || recoverLatexFromKatexText(mathTexEl.textContent as string)
          sourceKind = CopySourceKind.HtmlFallback
          quality = 'fallback'
          warnings = [
            htmlLatex
              ? 'Recovered from KaTeX HTML; complex structures may be incomplete.'
              : 'Recovered from visible KaTeX text; complex structures may be incomplete.',
          ]
        } else if (host.includes('leetcode.')) {
          const lastChild = mathTexEl.lastChild
          if (lastChild?.nodeType === 3) {
            latexContent = lastChild.textContent as string
            sourceKind = CopySourceKind.HtmlFallback
            quality = 'fallback'
            warnings = ['Recovered from visible KaTeX text; complex structures may be incomplete.']
          }
        }
      }
      return latexContent
        ? copyResult(latexContent, {
            sourceKind,
            quality,
            displayMode: detectDisplayMode(el),
            mathml,
            warnings,
          })
        : null
    },
    pre,
    post,
  },
  math_jax_html: {
    testUrl: [],
    selectorList: [
      'mjx-container.MathJax',
      'mjx-assistive-mml math',
      'math',
      'STX-N',
      '.STX-N',
      'article-fulltext-disp-eq',
      '.article-fulltext-disp-eq',
      'inline-formula',
      '.inline-formula',
    ],
    parse: async (el: HTMLElement) => {
      const mathEl = el.tagName.toLowerCase() === 'math' ? el : el.querySelector('math')
      if (mathEl) {
        const converted = await convertMathml(mathEl.outerHTML)
        return copyResult(converted.latex, {
          sourceKind: CopySourceKind.MathML,
          quality: 'converted',
          displayMode: detectDisplayMode(el),
          mathml: converted.mathml,
        })
      }

      const targetId = ensureElementId(el)
      const apiResult = targetId ? await getMathJaxSourceFromPage(targetId) : null
      if (apiResult) {
        const source = await normalizeMathJaxSource(apiResult)
        return copyResult(source.latex, {
          sourceKind: source.sourceKind,
          quality: source.quality,
          displayMode: detectDisplayMode(el),
          mathml: source.mathml ?? getCleanEmbeddedMathml(el),
        })
      }

      const svgEl = el.querySelector('svg')
      if (svgEl) {
        return copyResult(await svgToImage(svgEl), {
          sourceKind: CopySourceKind.Image,
          quality: 'image',
          displayMode: detectDisplayMode(el),
        })
      }
      return null
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
      'img[class*="mwe-math"]',
      'img[class*="latex"]',
      'img[class*="formula"]',
      '[data-attrid^="variable"] img',
      '[data-attrid="formula-image"]',
      'div[data-type="formula"]:has(img[dataset-id="formula"])',
    ],
    parse: async (el: HTMLElement) => {
      let latexContent = ''
      if (pageHostMatches('baike.')) {
        latexContent = getEle('img[dataset-id="formula"]', el)?.getAttribute(
          'dataset-value',
        ) as string
      } else {
        const imgEl = el.querySelector('img') || el.closest('img')
        if (!imgEl || !imgEl.alt) return ''
        latexContent = imgEl.alt
      }
      return latexContent
        ? copyResult(latexContent, {
            sourceKind: CopySourceKind.ImageAlt,
            quality: 'fallback',
            displayMode: detectDisplayMode(el),
          })
        : null
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
      return copyResult(element.alt, {
        sourceKind: CopySourceKind.ImageAlt,
        quality: 'fallback',
        displayMode: 'display',
        warnings: ['Wolfram MathWorld image alt text is TexForm, not LaTeX.'],
      })
    },
    pre,
    post: async <T extends string | Blob>(el: HTMLElement, content: T, result?: CopyResult) => {
      if (typeof content === 'string') {
        await copyLatex(
          content,
          {
            text: 'Copied as TexForm(not LaTeX)',
          },
          result,
        )
      }
      addCopiedStyle(el)
    },
  },
}

function isMathScript(node: Element | null | undefined): node is HTMLScriptElement {
  return node?.tagName === 'SCRIPT' && node.getAttribute('type')?.includes('math/') === true
}

function findMathScript(el: HTMLElement) {
  const directSibling = el.nextElementSibling
  if (isMathScript(directSibling)) return directSibling

  const parentSibling = el.parentElement?.nextElementSibling
  if (isMathScript(parentSibling)) return parentSibling

  const wrapper = el.closest('.mathjax-tex') || el.parentElement?.parentElement || el.parentElement
  const nestedScript = wrapper?.querySelector('script[type^="math/"]')
  if (isMathScript(nestedScript)) return nestedScript

  return null
}

function findEmbeddedMathml(el: HTMLElement) {
  const dataMathml =
    el.getAttribute('data-mathml') || el.closest('[data-mathml]')?.getAttribute('data-mathml')
  if (dataMathml?.trim().startsWith('<math')) return dataMathml

  const selector = '.MJX_Assistive_MathML math, mjx-assistive-mml math'
  const localMath = el.querySelector(selector)
  if (localMath) return localMath.outerHTML

  const mathJaxRoot = el.closest('.MathJax, mjx-container.MathJax')
  const rootMath = mathJaxRoot?.querySelector(selector)
  return rootMath?.outerHTML || null
}

function getCleanEmbeddedMathml(el: HTMLElement) {
  const mathml = findEmbeddedMathml(el)
  return mathml ? cleanMathml(mathml) : undefined
}

type NormalizedMathSource = {
  latex: string
  mathml?: string
  sourceKind: CopySourceKind
  quality: CopyQuality
}

async function normalizeMathJaxSource(source: MathJaxPageSource): Promise<NormalizedMathSource> {
  if (typeof source === 'object') {
    const tex = typeof source.tex === 'string' ? source.tex : ''
    const mathml = typeof source.mathml === 'string' ? cleanMathml(source.mathml) : undefined
    if (tex) {
      return {
        latex: tex,
        mathml,
        sourceKind: CopySourceKind.MathJaxApi,
        quality: 'exact',
      }
    }
    if (mathml) {
      const converted = await convertMathml(mathml)
      return {
        ...converted,
        sourceKind: CopySourceKind.MathML,
        quality: 'converted',
      }
    }
    return {
      latex: '',
      sourceKind: CopySourceKind.Unknown,
      quality: 'fallback',
    }
  }

  const trimmedSource = source.trim()
  if (trimmedSource.startsWith('<math')) {
    const converted = await convertMathml(trimmedSource)
    return {
      ...converted,
      sourceKind: CopySourceKind.MathML,
      quality: 'converted',
    }
  }
  return {
    latex: source,
    sourceKind: CopySourceKind.MathJaxApi,
    quality: 'exact',
  }
}

async function convertMathml(mathml: string): Promise<NormalizedMathSource> {
  await initMathml()
  const cleanedMathml = cleanMathml(mathml)
  return {
    latex: window.Mathml2latex.convert(cleanedMathml),
    mathml: cleanedMathml,
    sourceKind: CopySourceKind.MathML,
    quality: 'converted',
  }
}

let cachedPageHosts: string[] | null = null

function getPageHosts() {
  if (cachedPageHosts) return cachedPageHosts

  const hosts = new Set<string>()
  if (location.hostname) hosts.add(location.hostname)

  const urlCandidates = [
    document.querySelector<HTMLLinkElement>('link[rel~="canonical"]')?.href,
    document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content,
    document.querySelector<HTMLMetaElement>('meta[name="twitter:url"]')?.content,
  ]

  for (const url of urlCandidates) {
    try {
      const host = url ? new URL(url).hostname : ''
      if (host) hosts.add(host)
    } catch {}
  }

  cachedPageHosts = Array.from(hosts)
  return cachedPageHosts
}

function pageHostMatches(domain: string) {
  return getPageHosts().some(
    (host) => host === domain || host.endsWith(`.${domain}`) || host.includes(domain),
  )
}

function ensureElementId(el: HTMLElement) {
  if (el.id) return el.id
  el.id = `sss-math-${crypto.randomUUID()}`
  return el.id
}
function pre<T extends string | Blob>(content: T): T {
  if (typeof content === 'string') {
    return refineLatexSource(content) as T
  }
  return content
}

async function post<T extends string | Blob>(el: HTMLElement, content: T, result?: CopyResult) {
  if (!content) return
  let copyPromise: Promise<void>
  if (content instanceof Blob) {
    copyPromise = copyLatexAsImage(content)
  } else {
    copyPromise = copyLatex(content, undefined, result)
  }
  await copyPromise
  addCopiedStyle(el)
}
