import type { LatexSymbol } from "../latex"

export type Prefer = {
  show_toast: boolean
  format_signs: LatexSymbol
}

export type LatexHistory = {
  url: string,
  content: string
} 