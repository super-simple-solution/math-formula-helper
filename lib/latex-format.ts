import {
  parserMap,
  resolveLatexFormatOptions,
  type LatexFormatContext,
  type LatexFormatOptions,
} from './latex-options'
import { normalizeLatexContent } from './latex-normalize'

// Applies cleanup first, then wraps the normalized formula with the resolved delimiter policy.
export function formatLatex(
  content: string,
  prefer: LatexFormatOptions,
  context: LatexFormatContext = {},
) {
  const options = resolveLatexFormatOptions(prefer, context)
  const cleanContent = normalizeLatexContent(content, options)
  return parserMap[options.format_signs](cleanContent)
}

// Backward-compatible export kept for older imports that still use the previous name.
export const latexFormat = formatLatex
