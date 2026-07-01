import {
  BracePolicy,
  EnvironmentPolicy,
  HistoryValueMode,
  LatexSymbol,
  NormalizationType,
  OutputProfile,
  TagPolicy,
  defaultBracePolicy,
  defaultEnvironmentPolicy,
  defaultHistoryValueMode,
  defaultLatexSymbol,
  defaultNormalization,
  defaultOutputProfile,
  defaultTagPolicy,
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

export const tagPolicyList = [
  {
    value: TagPolicy.Auto,
    title: 'Auto',
    desc: 'Follow the selected output target.',
  },
  {
    value: TagPolicy.Keep,
    title: 'Keep Tags',
    desc: 'Preserve \\tag, \\notag, \\nonumber and \\label.',
  },
  {
    value: TagPolicy.Remove,
    title: 'Remove Tags',
    desc: 'Drop equation tags and labels.',
  },
]

export const environmentPolicyList = [
  {
    value: EnvironmentPolicy.Auto,
    title: 'Auto',
    desc: 'Follow the selected output target.',
  },
  {
    value: EnvironmentPolicy.Keep,
    title: 'Keep Environments',
    desc: 'Preserve equation, align and gather environments.',
  },
  {
    value: EnvironmentPolicy.Unwrap,
    title: 'Unwrap',
    desc: 'Remove environment wrappers and copy the body.',
  },
  {
    value: EnvironmentPolicy.Convert,
    title: 'Convert',
    desc: 'Convert display environments to inline-safe aligned or gathered forms.',
  },
]

export const bracePolicyList = [
  {
    value: BracePolicy.Auto,
    title: 'Auto',
    desc: 'Follow the selected output target.',
  },
  {
    value: BracePolicy.Keep,
    title: 'Keep Braces',
    desc: 'Preserve parsed brace groups.',
  },
  {
    value: BracePolicy.Clean,
    title: 'Clean Braces',
    desc: 'Collapse redundant single-token groups.',
  },
]

export const historyValueList = [
  {
    value: HistoryValueMode.Raw,
    title: 'Raw',
    desc: 'Store parsed source and format it when copied from history.',
  },
  {
    value: HistoryValueMode.Formatted,
    title: 'Formatted',
    desc: 'Store the exact text copied to the clipboard.',
  },
  {
    value: HistoryValueMode.Both,
    title: 'Both',
    desc: 'Store parsed source plus the formatted clipboard text.',
  },
]

export const FormSchema = z.object({
  output_profile: z
    .enum(Object.values(OutputProfile) as [OutputProfile, ...OutputProfile[]])
    .default(defaultOutputProfile),
  format_signs: z
    .enum(Object.values(LatexSymbol) as [LatexSymbol, ...LatexSymbol[]])
    .default(defaultLatexSymbol),
  normalization: z
    .enum(Object.values(NormalizationType) as [NormalizationType, ...NormalizationType[]])
    .default(defaultNormalization),
  tag_policy: z.enum(Object.values(TagPolicy) as [TagPolicy, ...TagPolicy[]]).default(defaultTagPolicy),
  environment_policy: z
    .enum(Object.values(EnvironmentPolicy) as [EnvironmentPolicy, ...EnvironmentPolicy[]])
    .default(defaultEnvironmentPolicy),
  brace_policy: z
    .enum(Object.values(BracePolicy) as [BracePolicy, ...BracePolicy[]])
    .default(defaultBracePolicy),
  history_value: z
    .enum(Object.values(HistoryValueMode) as [HistoryValueMode, ...HistoryValueMode[]])
    .default(defaultHistoryValueMode),
  show_toast: z.boolean().default(true),
  show_source_quality: z.boolean().default(true),
  selection_copy: z.boolean().default(true),
})
