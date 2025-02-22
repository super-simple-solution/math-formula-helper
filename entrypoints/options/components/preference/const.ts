import { LatexSymbol, defaultLatexSymbol } from '@/lib/latex'
import { z } from 'zod'

export const latexDemo = '\\sqrt{x}'

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

export const FormSchema = z.object({
  format_signs: z
    .enum(Object.values(LatexSymbol) as [string, ...string[]])
    .default(defaultLatexSymbol),
  show_toast: z.boolean().default(true),
})
