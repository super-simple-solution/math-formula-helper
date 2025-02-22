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

export const defaultLatexSymbol: LatexSymbol = LatexSymbol.Inline

export function latexFormat(content: string, format_signs: LatexSymbol) {
  return parserMap[format_signs](content)
}
