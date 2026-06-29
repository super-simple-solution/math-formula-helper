import {
  LatexSymbol,
  NormalizationType,
  OutputProfile,
  defaultLatexSymbol,
  defaultNormalization,
  defaultOutputProfile,
} from '@/lib/latex'
import { z } from 'zod'

export const latexDemo = '\\begin{equation}\n  E = mc^2 \\tag{1}\n\\end{equation}'

type SymbolItem = {
  symbol: LatexSymbol
  title: string
  desc: string
}

export const outputProfileList = [
  {
    value: OutputProfile.MarkdownKatex,
    title: 'Markdown + KaTeX',
    desc: 'Default for most Markdown editors and KaTeX renderers.',
  },
  {
    value: OutputProfile.MarkdownMathJax,
    title: 'Markdown + MathJax',
    desc: 'Keeps more display math structure for MathJax-based pages.',
  },
  {
    value: OutputProfile.LatexDocument,
    title: 'LaTeX Document',
    desc: 'Copies content without Markdown math delimiters.',
  },
  {
    value: OutputProfile.Raw,
    title: 'Raw Source',
    desc: 'No wrapping or normalization; useful for debugging.',
  },
]

export const symbolList: SymbolItem[] = [
  {
    symbol: LatexSymbol.Inline,
    title: '$...$',
    desc: 'Inline math delimiters.',
  },
  {
    symbol: LatexSymbol.Block,
    title: '$$...$$',
    desc: 'Display math delimiters for Markdown.',
  },
  {
    symbol: LatexSymbol.Square,
    title: '\\[...\\]',
    desc: 'Display math delimiters for LaTeX and MathJax.',
  },
  {
    symbol: LatexSymbol.Empty,
    title: 'Do Nothing, Pure Latex',
    desc: 'Copy only the formula source.',
  },
]

export const normalizationList = [
  {
    value: NormalizationType.KaTex,
    title: 'KaTeX Optimized',
    desc: 'Remove \\begin{equation}, \\tag, \\label and newlines. Best for Markdown.',
  },
  {
    value: NormalizationType.MathJax,
    title: 'MathJax / LaTeX',
    desc: 'Keep environments, clean up multiple newlines.',
  },
  {
    value: NormalizationType.Original,
    title: 'Original Text',
    desc: 'Keep everything as parsed from the web.',
  },
]

// export const FormSchema = z.object({
//   format_signs: z
//     .enum(Object.values(LatexSymbol) as [LatexSymbol, ...LatexSymbol[]])
//     .default(defaultLatexSymbol),
//   show_toast: z.boolean().default(true),
// })
export const FormSchema = z.object({
  output_profile: z
    .enum(Object.values(OutputProfile) as [OutputProfile, ...OutputProfile[]])
    .default(defaultOutputProfile),
  format_signs: z
    .enum(Object.values(LatexSymbol) as [LatexSymbol, ...LatexSymbol[]])
    .default(defaultLatexSymbol),
  // 新增字段验证
  normalization: z
    .enum(Object.values(NormalizationType) as [NormalizationType, ...NormalizationType[]])
    .default(defaultNormalization),
  show_toast: z.boolean().default(true),
})
