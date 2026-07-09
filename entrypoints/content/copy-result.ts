import { OutputProfile, type LatexDisplayMode } from '@/lib/latex'
import type { ClipboardWriteMode } from '@/lib/clipboard-payload'

export enum CopySourceKind {
  Annotation = 'annotation',
  MathJaxApi = 'mathjax-api',
  MathTexScript = 'math-tex-script',
  MathML = 'mathml',
  DataAttribute = 'data-attribute',
  HtmlFallback = 'html-fallback',
  ImageAlt = 'image-alt',
  SiteClipboard = 'site-clipboard',
  Image = 'image',
  Unknown = 'unknown',
}

export type CopyQuality = 'exact' | 'converted' | 'fallback' | 'image'

export type CopyDisplayMode = LatexDisplayMode

export type CopyResultMetadata = {
  sourceKind?: CopySourceKind
  displayMode?: CopyDisplayMode
  quality?: CopyQuality
  site?: string
  mathml?: string
  warnings?: string[]
}

export type CopyResult = CopyResultMetadata & {
  content: string | Blob
}

export type RuleParseResult = string | Blob | CopyResult | null

export const wordNativeMathmlUnavailableWarning =
  'Word Native MathML was unavailable; copied plain LaTeX text only.'

export const richClipboardWriteFallbackWarning =
  'Rich MathML clipboard write failed; copied plain LaTeX text only.'

// Wraps copied content with source metadata so fallbacks stay visible in toast/history.
export function copyResult(content: string | Blob, metadata: CopyResultMetadata = {}): CopyResult {
  return {
    content,
    sourceKind: metadata.sourceKind ?? CopySourceKind.Unknown,
    quality: metadata.quality ?? (isBlob(content) ? 'image' : 'exact'),
    displayMode: metadata.displayMode ?? 'unknown',
    site: metadata.site,
    mathml: metadata.mathml,
    warnings: metadata.warnings,
  }
}

// Normalizes rule parser output into a CopyResult and applies default metadata if needed.
export function toCopyResult(
  input: RuleParseResult,
  fallbackMetadata: CopyResultMetadata = {},
): CopyResult | null {
  if (!input) return null
  if (isCopyResult(input)) {
    return copyResult(input.content, { ...fallbackMetadata, ...input })
  }
  return copyResult(input, fallbackMetadata)
}

// Distinguishes structured parser output from legacy string/blob parser results.
export function isCopyResult(input: RuleParseResult): input is CopyResult {
  return typeof input === 'object' && input !== null && 'content' in input
}

// Infers display mode from common formula container classes when the source does not expose it.
export function detectDisplayMode(el: HTMLElement): CopyDisplayMode {
  if (
    el.closest(
      '.katex-display,.MathJax_Display,.MathJax_SVG_Display,.ltx_equation,.display-math,article-fulltext-disp-eq',
    )
  ) {
    return 'display'
  }

  return 'inline'
}

// Flags Word Native copy attempts that had to fall back to plain-text LaTeX.
export function getWordNativeFallbackWarnings(options: {
  outputProfile: OutputProfile
  mathml?: string | null
}) {
  if (options.outputProfile !== OutputProfile.WordNative || options.mathml) return []
  return [wordNativeMathmlUnavailableWarning]
}

// Flags rich MathML clipboard payloads that the browser accepted only as plain text.
export function getRichClipboardFallbackWarnings(options: {
  attemptedRichClipboard: boolean
  writeMode: ClipboardWriteMode
}) {
  if (!options.attemptedRichClipboard || options.writeMode !== 'text') return []
  return [richClipboardWriteFallbackWarning]
}

// Formats concise source metadata for user-facing copy notifications.
export function describeCopyResult(result: CopyResultMetadata) {
  const source = result.sourceKind ?? CopySourceKind.Unknown
  const quality = result.quality ?? 'exact'
  const warning = result.warnings?.[0]
  return warning ? `${source}, ${quality}; ${warning}` : `${source}, ${quality}`
}

// Guards Blob checks for browser contexts where Blob may not exist.
function isBlob(content: string | Blob): content is Blob {
  return typeof Blob !== 'undefined' && content instanceof Blob
}
