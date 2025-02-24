import type { LatexSymbol } from "../latex"

export type Prefer = {
  show_toast: boolean
  format_signs: LatexSymbol
  trim_punctuation: boolean
}

export type LatexHistory = {
  url: string,
  id: string
  value: string
} 