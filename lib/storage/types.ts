import type { LatexSymbol, NormalizationType, OutputProfile } from '../latex'

export type Prefer = {
  show_toast: boolean
  output_profile: OutputProfile
  format_signs: LatexSymbol
  // 新增字段：存储用户的规范化选项
  normalization: NormalizationType
}

export type LatexHistory = {
  url: string
  id: string
  value: string
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
