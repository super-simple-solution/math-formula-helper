import {
  OutputProfile,
  resolveLatexFormatOptions,
  type LatexDisplayMode,
  type LatexFormatContext,
  type LatexFormatOptions,
} from './latex-options'
import { formatLatex } from './latex-format'
import { normalizeMathmlRoot } from './mathml'

export type FormulaClipboardPayload = {
  text: string
  html?: string
  htmlFragment?: string
}

export type ClipboardWriteMode = 'rich' | 'text'

export type FormulaClipboardContext = LatexFormatContext & {
  mathml?: string | null
  wordNativeTrailingSpace?: boolean
}

// Builds the text payload for every target and optional MathML HTML for Word Native copies.
export function buildFormulaClipboardPayload(
  rawLatex: string,
  prefer: LatexFormatOptions,
  context: FormulaClipboardContext = {},
): FormulaClipboardPayload {
  const text = formatLatex(rawLatex, prefer, context)
  const resolved = resolveLatexFormatOptions(prefer, context)
  const htmlFragment =
    resolved.output_profile === OutputProfile.WordNative && context.mathml
      ? normalizeMathmlForClipboard(context.mathml, context.displayMode, {
          trailingSpace: context.wordNativeTrailingSpace ?? true,
        })
      : ''

  return {
    text,
    htmlFragment: htmlFragment || undefined,
    html: htmlFragment ? buildHtmlClipboardDocument(htmlFragment) : undefined,
  }
}

// Normalizes MathML for clipboard HTML and appends spacing for inline Word paste behavior.
export function normalizeMathmlForClipboard(
  mathml: string,
  displayMode: LatexDisplayMode = 'unknown',
  options: { trailingSpace?: boolean } = {},
) {
  let result = normalizeMathmlRoot(mathml, { displayMode })
  if (!result) return ''

  if (options.trailingSpace !== false && displayMode !== 'display') {
    result += '&nbsp;'
  }
  return result
}

// Wraps a fragment so rich clipboard consumers receive a complete HTML document.
export function buildHtmlClipboardDocument(fragment: string) {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>${fragment}</body></html>`
}

// Writes rich text/html + text/plain when supported, falling back to plain text otherwise.
export async function writeClipboardPayload(
  clipboard: Clipboard,
  payload: FormulaClipboardPayload,
): Promise<ClipboardWriteMode> {
  if (
    payload.html &&
    typeof ClipboardItem !== 'undefined' &&
    typeof clipboard.write === 'function'
  ) {
    try {
      await clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([payload.text], { type: 'text/plain' }),
          'text/html': new Blob([payload.html], { type: 'text/html' }),
        }),
      ])
      return 'rich'
    } catch {}
  }

  await clipboard.writeText(payload.text)
  return 'text'
}
