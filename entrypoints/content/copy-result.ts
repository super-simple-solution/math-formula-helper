import type { LatexDisplayMode } from '@/lib/latex'

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

export function isCopyResult(input: RuleParseResult): input is CopyResult {
  return typeof input === 'object' && input !== null && 'content' in input
}

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

export function describeCopyResult(result: CopyResultMetadata) {
  const source = result.sourceKind ?? CopySourceKind.Unknown
  const quality = result.quality ?? 'exact'
  return `${source}, ${quality}`
}

function isBlob(content: string | Blob): content is Blob {
  return typeof Blob !== 'undefined' && content instanceof Blob
}
