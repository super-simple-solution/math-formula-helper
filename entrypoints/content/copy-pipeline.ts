import { uuid } from '@/lib'
import {
  buildFormulaClipboardPayload,
  writeClipboardPayload,
  type FormulaClipboardPayload,
} from '@/lib/clipboard-payload'
import {
  type MathJaxPageSource,
  type MathJaxTexToMathmlRequest,
  sendBrowserMessage,
} from '@/lib/extension-action'
import {
  defaultBracePolicy,
  defaultEnvironmentPolicy,
  defaultHistoryValueMode,
  defaultLatexSymbol,
  defaultNormalization,
  defaultOutputProfile,
  defaultTagPolicy,
  HistoryValueMode,
  OutputProfile,
  latexFormat,
} from '@/lib/latex'
import { cleanMathml } from '@/lib/mathml'
import { LatexQueue, type Prefer, getPreference, watchPreference } from '@/lib/storage'
import { toast } from '@/lib/toast'
import * as clipboardPolyfill from 'clipboard-polyfill'
import type { Unwatch } from 'wxt/utils/storage'
import {
  describeCopyResult,
  getRichClipboardFallbackWarnings,
  getWordNativeFallbackWarnings,
  type CopyResultMetadata,
} from './copy-result'
import { handleContentError, runContentTask } from './util'

let preferData: Prefer = {
  show_toast: true,
  show_source_quality: true,
  selection_copy: true,
  history_value: defaultHistoryValueMode,
  output_profile: defaultOutputProfile,
  format_signs: defaultLatexSymbol,
  normalization: defaultNormalization,
  tag_policy: defaultTagPolicy,
  environment_policy: defaultEnvironmentPolicy,
  brace_policy: defaultBracePolicy,
}

const clipboard: Clipboard =
  navigator.clipboard ||
  ({
    ...clipboardPolyfill,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  } as Clipboard)

export type ClipboardCopyMetadata = CopyResultMetadata & {
  wordNativeTrailingSpace?: boolean
}

// Returns the current resolved preference snapshot used by content-script copy operations.
export function getPreferData() {
  return preferData
}

// Loads preferences once and subscribes to later option-page changes.
export function watchPrefer(): Unwatch {
  initPrefer()
  try {
    return watchPreference(setPrefer)
  } catch (error) {
    handleContentError(error, 'watch preference')
    return () => {}
  }
}

// Rewrites the current clipboard text through the browser clipboard API.
export async function formatCopiedText() {
  const text = await clipboard.readText()
  await clipboard.writeText(text)
}

// Builds the final clipboard payload, resolving Word Native MathML when that profile needs it.
export async function buildFormulaClipboardPayloadForCopy(
  latexContent: string,
  metadata: ClipboardCopyMetadata = {},
) {
  const mathml = await resolveWordNativeMathml(latexContent, metadata)
  return {
    mathml,
    payload: buildFormulaClipboardPayload(latexContent, preferData, {
      displayMode: metadata.displayMode,
      mathml,
      wordNativeTrailingSpace: metadata.wordNativeTrailingSpace,
    }),
  }
}

// Writes a prepared payload and reports whether rich HTML or plain text was accepted.
export async function writeFormulaClipboardPayload(payload: FormulaClipboardPayload) {
  return writeClipboardPayload(clipboard, payload)
}

// Requests TeX/MathML source from the page MAIN world through the background service worker.
export async function getMathJaxSourceFromPage(elementId: string): Promise<MathJaxPageSource | null> {
  try {
    const source = await sendBrowserMessage({
      greeting: 'get-mathjax-source',
      data: { elementId },
    })
    if (typeof source === 'string') return source || null
    if (
      source &&
      typeof source === 'object' &&
      ('tex' in source || 'mathml' in source)
    ) {
      return source as MathJaxPageSource
    }
  } catch {}

  return null
}

// Formats, writes, notifies, and stores one LaTeX copy action.
export async function copyLatex(
  latexContent: string,
  options = { text: 'Copied' },
  metadata: CopyResultMetadata = {},
) {
  const { mathml, payload } = await buildFormulaClipboardPayloadForCopy(latexContent, metadata)
  const content = payload.text
  const writeMode = await writeFormulaClipboardPayload(payload)
  const warnings = Array.from(
    new Set([
      ...(metadata.warnings ?? []),
      ...getWordNativeFallbackWarnings({
        outputProfile: preferData.output_profile,
        mathml,
      }),
      ...getRichClipboardFallbackWarnings({
        attemptedRichClipboard: Boolean(payload.html),
        writeMode,
      }),
    ]),
  )
  const copyMetadata = warnings.length ? { ...metadata, warnings } : metadata

  if (preferData.show_toast) {
    toast({
      ...options,
      text:
        preferData.show_source_quality &&
        (copyMetadata.sourceKind || copyMetadata.warnings?.length)
          ? `${options.text} (${describeCopyResult(copyMetadata)})`
          : options.text,
    })
  }

  const historyValueMode = preferData.history_value ?? HistoryValueMode.Raw
  const storesFormatted =
    historyValueMode === HistoryValueMode.Formatted || historyValueMode === HistoryValueMode.Both

  await LatexQueue.enqueue({
    url: location.href.replace(location.hash, ''),
    value: historyValueMode === HistoryValueMode.Formatted ? content : latexContent,
    valueMode: historyValueMode,
    formatted: storesFormatted ? content : undefined,
    id: uuid(),
    sourceKind: preferData.show_source_quality ? copyMetadata.sourceKind : undefined,
    quality: preferData.show_source_quality ? copyMetadata.quality : undefined,
    displayMode: copyMetadata.displayMode,
    mathml,
    warnings: preferData.show_source_quality ? copyMetadata.warnings : undefined,
  }).catch((error) => handleContentError(error, 'save copy history'))
}

// Copies a rendered formula image when no usable text source is available.
export async function copyLatexAsImage(
  latexBlob: Blob,
  options = { text: 'LaTeX content not found, Copied it as Image' },
) {
  await clipboard.write([
    new ClipboardItem({
      [latexBlob.type]: latexBlob,
    }),
  ])
  if (preferData.show_toast) {
    toast(options)
  }
}

// Creates a transparent overlay image whose alt text carries formatted LaTeX for full-page copy.
export function createOpacityImage(options: {
  width: number
  height: number
  id: string
  alt: string
  displayMode?: CopyResultMetadata['displayMode']
}): HTMLImageElement | undefined {
  const { width, height, id, alt, displayMode } = options
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = 'rgba(255, 0, 0, 0)'
  ctx.fillRect(0, 0, width, height)

  const imageDataURL = canvas.toDataURL('image/png')
  const img = new Image()
  img.src = imageDataURL
  img.id = id
  img.alt = latexFormat(alt, preferData, { displayMode })
  return img
}

// Initializes the in-memory preference snapshot from extension storage.
function initPrefer() {
  runContentTask(() => getPreference().then(setPrefer), 'load preference')
}

// Replaces the content-script preference snapshot after storage updates.
function setPrefer(prefer: Prefer) {
  preferData = prefer
}

// Supplies MathML for Word Native copies, preferring parser-provided MathML before conversion.
async function resolveWordNativeMathml(
  latexContent: string,
  metadata: ClipboardCopyMetadata = {},
) {
  if (metadata.mathml) return metadata.mathml
  if (preferData.output_profile !== OutputProfile.WordNative) return undefined

  const pageMathml = await getMathJaxMathmlFromPage(latexContent, metadata.displayMode)
  if (pageMathml) return pageMathml

  return undefined
}

// Requests page-aware TeX-to-MathML conversion; the background handler owns local fallback.
async function getMathJaxMathmlFromPage(
  tex: string,
  displayMode: CopyResultMetadata['displayMode'],
): Promise<string | null> {
  try {
    const request: MathJaxTexToMathmlRequest = { tex, displayMode }
    const mathml = await sendBrowserMessage({
      greeting: 'convert-tex-to-mathjax-mathml',
      data: request,
    })
    return typeof mathml === 'string' && mathml.trim().startsWith('<math')
      ? cleanMathml(mathml)
      : null
  } catch {
    return null
  }
}
