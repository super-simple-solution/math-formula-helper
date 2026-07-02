export enum LatexSymbol {
  Auto = 'auto',
  Inline = 'inline',
  Block = 'block',
  Square = 'square',
  Empty = 'empty',
}

export enum OutputProfile {
  MarkdownKatex = 'markdown-katex',
  MarkdownMathJax = 'markdown-mathjax',
  LatexDocument = 'latex-document',
  WordNative = 'word-native',
  Raw = 'raw',
}

export enum NormalizationType {
  Auto = 'auto',
  Original = 'original',
  KaTex = 'katex',
  MathJax = 'mathjax',
}

export enum TagPolicy {
  Auto = 'auto',
  Keep = 'keep',
  Remove = 'remove',
}

export enum EnvironmentPolicy {
  Auto = 'auto',
  Keep = 'keep',
  Unwrap = 'unwrap',
  Convert = 'convert',
}

export enum BracePolicy {
  Auto = 'auto',
  Keep = 'keep',
  Clean = 'clean',
}

export enum HistoryValueMode {
  Raw = 'raw',
  Formatted = 'formatted',
  Both = 'both',
}

export type ConcreteLatexSymbol = Exclude<LatexSymbol, LatexSymbol.Auto>
export type ConcreteNormalizationType = Exclude<NormalizationType, NormalizationType.Auto>
export type LatexDisplayMode = 'inline' | 'display' | 'unknown'

export type LatexFormatContext = {
  displayMode?: LatexDisplayMode
}

export const parserMap: Record<ConcreteLatexSymbol, (content: string) => string> = {
  inline: (content: string) => `$${content}$`,
  block: (content: string) => `$$${content}$$`,
  square: (content: string) => `\\[${content}\\]`,
  empty: (content: string) => content,
}

export const defaultLatexSymbol: LatexSymbol = LatexSymbol.Auto

export const defaultOutputProfile: OutputProfile = OutputProfile.MarkdownKatex

export const defaultNormalization: NormalizationType = NormalizationType.Auto

export const defaultTagPolicy: TagPolicy = TagPolicy.Auto

export const defaultEnvironmentPolicy: EnvironmentPolicy = EnvironmentPolicy.Auto

export const defaultBracePolicy: BracePolicy = BracePolicy.Auto

export const defaultHistoryValueMode: HistoryValueMode = HistoryValueMode.Raw

export type LatexFormatOptions = {
  output_profile?: OutputProfile
  format_signs?: LatexSymbol
  normalization?: NormalizationType
  tag_policy?: TagPolicy
  environment_policy?: EnvironmentPolicy
  brace_policy?: BracePolicy
}

export type ResolvedLatexFormatOptions = {
  output_profile: OutputProfile
  format_signs: ConcreteLatexSymbol
  normalization: ConcreteNormalizationType
  tag_policy: TagPolicy
  environment_policy: EnvironmentPolicy
  brace_policy: BracePolicy
}

const profileDefaults: Record<
  OutputProfile,
  { format_signs: ConcreteLatexSymbol; normalization: ConcreteNormalizationType }
> = {
  [OutputProfile.MarkdownKatex]: {
    format_signs: LatexSymbol.Inline,
    normalization: NormalizationType.KaTex,
  },
  [OutputProfile.MarkdownMathJax]: {
    format_signs: LatexSymbol.Inline,
    normalization: NormalizationType.MathJax,
  },
  [OutputProfile.LatexDocument]: {
    format_signs: LatexSymbol.Empty,
    normalization: NormalizationType.MathJax,
  },
  [OutputProfile.WordNative]: {
    format_signs: LatexSymbol.Empty,
    normalization: NormalizationType.KaTex,
  },
  [OutputProfile.Raw]: {
    format_signs: LatexSymbol.Empty,
    normalization: NormalizationType.Original,
  },
}

export function getOutputProfileDefaults(profile: OutputProfile) {
  return profileDefaults[profile] ?? profileDefaults[defaultOutputProfile]
}

function resolveLatexSymbol(
  profile: OutputProfile,
  formatSigns?: LatexSymbol,
  displayMode: LatexDisplayMode = 'unknown',
): ConcreteLatexSymbol {
  if (formatSigns && formatSigns !== LatexSymbol.Auto) return formatSigns

  if (profile === OutputProfile.Raw || profile === OutputProfile.WordNative) {
    return LatexSymbol.Empty
  }
  if (displayMode === 'inline') return LatexSymbol.Inline
  if (displayMode === 'display') {
    return profile === OutputProfile.LatexDocument ? LatexSymbol.Square : LatexSymbol.Block
  }

  return getOutputProfileDefaults(profile).format_signs
}

function resolveNormalization(
  profile: OutputProfile,
  normalization?: NormalizationType,
): ConcreteNormalizationType {
  if (normalization && normalization !== NormalizationType.Auto) return normalization
  return getOutputProfileDefaults(profile).normalization
}

export function resolveLatexFormatOptions(
  prefer: LatexFormatOptions,
  context: LatexFormatContext = {},
): ResolvedLatexFormatOptions {
  const profile = prefer.output_profile ?? defaultOutputProfile

  return {
    output_profile: profile,
    format_signs: resolveLatexSymbol(profile, prefer.format_signs, context.displayMode),
    normalization: resolveNormalization(profile, prefer.normalization),
    tag_policy: prefer.tag_policy ?? defaultTagPolicy,
    environment_policy: prefer.environment_policy ?? defaultEnvironmentPolicy,
    brace_policy: prefer.brace_policy ?? defaultBracePolicy,
  }
}
