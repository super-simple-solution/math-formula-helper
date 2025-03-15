import type { LatexSymbol } from "../latex"

export type Prefer = {
  show_toast: boolean
  format_signs: LatexSymbol
}

export type LatexHistory = {
  url: string,
  id: string
  value: string
}

export type Pattern = {
  rule_key: string,
  domain: string[]
  updated_at: string
}

export type PatternCache = {
  time: number,
  data: Pattern[]
}

