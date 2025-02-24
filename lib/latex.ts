import type { Prefer } from "./storage"

export enum LatexSymbol {
  Inline = 'inline',
  Block = 'block',
  Square = 'square',
  Empty = 'empty',
}

export const parserMap: Record<LatexSymbol, (content: string) => string> = {
  inline: (content: string) => `$${content}$`,
  block: (content: string) => `$$${content}$$`,
  square: (content: string) => `\\[${content}\\]`,
  empty: (content: string) => content,
}

export function trimPunctuation(str: string) {
const punctionStr = ',`:!.;~`?\'"'
const escapedPunctionStr = punctionStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// 使用 RegExp 构造函数动态创建正则表达式
const reg = new RegExp(`^[${escapedPunctionStr}]+|[${escapedPunctionStr}]+$`, 'g');
return str.replace(reg, '')
}

export const defaultLatexSymbol: LatexSymbol = LatexSymbol.Inline

export function latexFormat(content: string, prefer: Prefer) {
  const { format_signs, trim_punctuation } = prefer
  let str = content
  if (trim_punctuation) {
    str = trimPunctuation(content)
  }
  return parserMap[format_signs](str)
}
