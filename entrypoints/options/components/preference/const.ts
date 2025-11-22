import { LatexSymbol, NormalizationType, defaultLatexSymbol, defaultNormalization } from '@/lib/latex'
import { z } from 'zod'

export const latexDemo = '\\begin{equation}\n  E = mc^2 \\tag{1}\n\\end{equation}'

type SymbolItem = {
  symbol: LatexSymbol
  title: string
}

export const symbolList: SymbolItem[] = [
  {
    symbol: LatexSymbol.Inline,
    title: '$...$',
  },
  {
    symbol: LatexSymbol.Block,
    title: '$$...$$',
  },
  {
    symbol: LatexSymbol.Square,
    title: '\\[...\\]',
  },
  {
    symbol: LatexSymbol.Empty,
    title: 'Do Nothing, Pure Latex',
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
  format_signs: z
    .enum(Object.values(LatexSymbol) as [LatexSymbol, ...LatexSymbol[]])
    .default(defaultLatexSymbol),
  // 新增字段验证
  normalization: z
    .enum(Object.values(NormalizationType) as [NormalizationType, ...NormalizationType[]])
    .default(defaultNormalization),
  show_toast: z.boolean().default(true),
})