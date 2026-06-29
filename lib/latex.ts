import type { Prefer } from './storage'

export enum LatexSymbol {
  Inline = 'inline',
  Block = 'block',
  Square = 'square',
  Empty = 'empty',
}

export enum OutputProfile {
  MarkdownKatex = 'markdown-katex',
  MarkdownMathJax = 'markdown-mathjax',
  LatexDocument = 'latex-document',
  Raw = 'raw',
}

export enum NormalizationType {
  Original = 'original', // 原样，不做任何处理
  KaTex = 'katex', // KaTeX 优化 (去换行、去环境标签、去 tag)
  MathJax = 'mathjax', // MathJax/LaTeX 标准 (保留环境，但去除多余空行)
}

export const parserMap: Record<LatexSymbol, (content: string) => string> = {
  inline: (content: string) => `$${content}$`,
  block: (content: string) => `$$${content}$$`,
  square: (content: string) => `\\[${content}\\]`,
  empty: (content: string) => content,
}

export const defaultLatexSymbol: LatexSymbol = LatexSymbol.Inline

export const defaultOutputProfile: OutputProfile = OutputProfile.MarkdownKatex

export const defaultNormalization: NormalizationType = NormalizationType.KaTex

export type LatexFormatOptions = {
  output_profile?: OutputProfile
  format_signs?: LatexSymbol
  normalization?: NormalizationType
}

const profileDefaults: Record<
  OutputProfile,
  { format_signs: LatexSymbol; normalization: NormalizationType }
> = {
  [OutputProfile.MarkdownKatex]: {
    format_signs: LatexSymbol.Inline,
    normalization: NormalizationType.KaTex,
  },
  [OutputProfile.MarkdownMathJax]: {
    format_signs: LatexSymbol.Inline,
    normalization: NormalizationType.MathJax,
  },
  [OutputProfile.LatexDocument]: {
    format_signs: LatexSymbol.Empty,
    normalization: NormalizationType.MathJax,
  },
  [OutputProfile.Raw]: {
    format_signs: LatexSymbol.Empty,
    normalization: NormalizationType.Original,
  },
}

export function getOutputProfileDefaults(profile: OutputProfile) {
  return profileDefaults[profile] ?? profileDefaults[defaultOutputProfile]
}

function normalizeContent(content: string, type: NormalizationType): string {
  let res = content

  switch (type) {
    case NormalizationType.KaTex:
      // 移除 \begin{equation} 和 \end{equation} (包括 equation*)
      res = res.replace(/\\begin\{equation\*?\}/g, '').replace(/\\end\{equation\*?\}/g, '')
      // 移除 \begin{align} 外层 (KaTeX 在 $$ 内部通常不需要 align 再次包裹，或者需要改成 aligned)
      // 这里简单粗暴去除 display 级环境，保留内容。如果需要保留对齐，应替换为 aligned，视需求而定。
      // 暂时只处理 equation，因为它是导致换行问题的罪魁祸首。

      // 移除 \tag{...}
      res = res.replace(/\\tag\{.*?\}/g, '')
      // 移除 \label{...}
      res = res.replace(/\\label\{.*?\}/g, '')
      // 移除换行符 (KaTeX 行内模式不喜欢换行，Block模式下换行符也可能导致 Markdown 渲染器解析错误)
      res = res.replace(/\n/g, ' ')
      // 合并多个空格
      res = res.replace(/\s+/g, ' ')
      break

    case NormalizationType.MathJax:
      // MathJax 通常容忍度很高，主要去除多余的空行
      res = res.replace(/\n\s*\n/g, '\n')
      break

    default:
      break
  }

  return res.trim()
}

export function resolveLatexFormatOptions(prefer: LatexFormatOptions) {
  const profile = prefer.output_profile ?? defaultOutputProfile
  const defaults = getOutputProfileDefaults(profile)

  return {
    output_profile: profile,
    format_signs: prefer.format_signs ?? defaults.format_signs,
    normalization: prefer.normalization ?? defaults.normalization,
  }
}

export function latexFormat(content: string, prefer: Prefer | LatexFormatOptions) {
  const { format_signs, normalization } = resolveLatexFormatOptions(prefer)

  // 第一步：规范化内容
  const cleanContent = normalizeContent(content, normalization)

  // 第二步：外层包裹
  return parserMap[format_signs](cleanContent)
}
