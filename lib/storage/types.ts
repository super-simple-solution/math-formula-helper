import type {
  BracePolicy,
  EnvironmentPolicy,
  HistoryValueMode,
  LatexSymbol,
  NormalizationType,
  OutputProfile,
  TagPolicy,
} from '../latex'

export type Prefer = {
  show_toast: boolean
  show_source_quality: boolean
  selection_copy: boolean
  history_value: HistoryValueMode
  output_profile: OutputProfile
  format_signs: LatexSymbol
  normalization: NormalizationType
  tag_policy: TagPolicy
  environment_policy: EnvironmentPolicy
  brace_policy: BracePolicy
}

export type LatexHistory = {
  url: string
  id: string
  value: string
  valueMode?: HistoryValueMode
  formatted?: string
  sourceKind?: string
  quality?: string
  displayMode?: string
  warnings?: string[]
}

export type Pattern = {
  rule_key: string
  domain: string[]
  updated_at: string
}

export type PatternCache = {
  time: number
  data: Pattern[]
}
