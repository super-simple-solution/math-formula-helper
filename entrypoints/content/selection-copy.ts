import { buildHtmlClipboardDocument } from '@/lib/clipboard-payload'
import { OutputProfile } from '@/lib/latex'
import { toast } from '@/lib/toast'
import type { Rule } from './const'
import { toCopyResult, type CopyResult } from './copy-result'
import {
  buildFormulaClipboardPayloadForCopy,
  getPreferData,
  writeFormulaClipboardPayload,
} from './copy-pipeline'
import {
  cleanSelectionFragmentHtml,
  cleanSelectionFragmentText,
  findFormulaFragmentElement,
  markSelectionTargets,
  shouldKeepSpaceAfterFormula,
  shouldKeepSpaceBeforeFormula,
  unmarkSelectionTargets,
} from './selection-fragment'
import { collectSelectionFormulaTargets, expandRangeToWholeFormulas } from './selection-targets'

// Replaces formulas inside a mixed text selection with formatted LaTeX or Word MathML.
export async function handleMixedCopy(e: ClipboardEvent, activeRules: Rule[]) {
  const preferData = getPreferData()
  if (!preferData.selection_copy) return

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return

  const range = expandRangeToWholeFormulas(selection.getRangeAt(0), activeRules)
  const targets = collectSelectionFormulaTargets(range, activeRules)
  if (!targets.length) return

  e.preventDefault()

  const markedTargets = markSelectionTargets(targets)

  try {
    const fragment = range.cloneContents()
    const div = document.createElement('div')
    div.appendChild(fragment)
    const htmlDiv = div.cloneNode(true) as HTMLElement

    let hasFormulaReplacement = false
    let hasHtmlReplacement = false

    for (const { rule, el: liveEl, marker } of markedTargets) {
      const fragEl = findFormulaFragmentElement(div, marker)
      const htmlFragEl = findFormulaFragmentElement(htmlDiv, marker)
      if (!fragEl && !htmlFragEl) continue

      let latex: CopyResult | null = null
      try {
        latex = toCopyResult(await rule.parse(liveEl), { displayMode: 'unknown' })
      } catch {
        latex = null
      }

      if (!latex || typeof latex.content !== 'string') continue

      const refinedLatex = rule.pre(latex.content)
      const wordNativeTrailingSpace =
        !htmlFragEl || shouldKeepSpaceAfterFormula(htmlFragEl)
      const { payload } = await buildFormulaClipboardPayloadForCopy(refinedLatex, {
        ...latex,
        wordNativeTrailingSpace,
      })

      if (fragEl?.parentNode) {
        fragEl.parentNode.replaceChild(document.createTextNode(` ${payload.text} `), fragEl)
        hasFormulaReplacement = true
      }

      if (htmlFragEl?.parentNode) {
        if (payload.htmlFragment && getPreferData().output_profile === OutputProfile.WordNative) {
          const htmlNode = document.createElement('span')
          const leadingSpace = shouldKeepSpaceBeforeFormula(htmlFragEl) ? ' ' : ''
          htmlNode.innerHTML = `${leadingSpace}${payload.htmlFragment}`
          htmlFragEl.parentNode.replaceChild(htmlNode, htmlFragEl)
          hasHtmlReplacement = true
        } else {
          htmlFragEl.parentNode.replaceChild(document.createTextNode(` ${payload.text} `), htmlFragEl)
        }
      }
    }

    const currentPrefer = getPreferData()
    const text = cleanSelectionFragmentText(div, selection.toString())
    await writeFormulaClipboardPayload({
      text,
      html:
        currentPrefer.output_profile === OutputProfile.WordNative && hasHtmlReplacement
          ? buildHtmlClipboardDocument(cleanSelectionFragmentHtml(htmlDiv))
          : undefined,
    })

    if (hasFormulaReplacement && currentPrefer.show_toast) {
      toast({ text: 'Copied with LaTeX' })
    }
  } finally {
    unmarkSelectionTargets(markedTargets)
  }
}
