import {
  parserMap,
  resolveLatexFormatOptions,
  type LatexFormatContext,
  type LatexFormatOptions,
} from './latex-options'
import { normalizeLatexContent } from './latex-normalize'

export function formatLatex(
  content: string,
  prefer: LatexFormatOptions,
  context: LatexFormatContext = {},
) {
  const options = resolveLatexFormatOptions(prefer, context)
  const cleanContent = normalizeLatexContent(content, options)
  return parserMap[options.format_signs](cleanContent)
}

export const latexFormat = formatLatex
