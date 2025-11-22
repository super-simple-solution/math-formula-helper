import type { Prefer } from './storage'

export enum LatexSymbol {
  Inline = 'inline',
  Block = 'block',
  Square = 'square',
  Empty = 'empty',
}

export enum NormalizationType {
  Original = 'original', // 原样，不做任何处理
  KaTex = 'katex',       // KaTeX 优化 (去换行、去环境标签、去 tag)
  MathJax = 'mathjax',   // MathJax/LaTeX 标准 (保留环境，但去除多余空行)
}

export const parserMap: Record<LatexSymbol, (content: string) => string> = {
  inline: (content: string) => `$${content}$`,
  block: (content: string) => `$$${content}$$`,
  square: (content: string) => `\\[${content}\\]`,
  empty: (content: string) => content,
}

export const defaultLatexSymbol: LatexSymbol = LatexSymbol.Inline

export const defaultNormalization: NormalizationType = NormalizationType.KaTex

function normalizeContent(content: string, type: NormalizationType): string {
  let res = content;

  switch (type) {
    case NormalizationType.KaTex:
      // 移除 \begin{equation} 和 \end{equation} (包括 equation*)
      res = res.replace(/\\begin\{equation\*?\}/g, '').replace(/\\end\{equation\*?\}/g, '');
      // 移除 \begin{align} 外层 (KaTeX 在 $$ 内部通常不需要 align 再次包裹，或者需要改成 aligned)
      // 这里简单粗暴去除 display 级环境，保留内容。如果需要保留对齐，应替换为 aligned，视需求而定。
      // 暂时只处理 equation，因为它是导致换行问题的罪魁祸首。

      // 移除 \tag{...}
      res = res.replace(/\\tag\{.*?\}/g, '');
      // 移除 \label{...}
      res = res.replace(/\\label\{.*?\}/g, '');
      // 移除换行符 (KaTeX 行内模式不喜欢换行，Block模式下换行符也可能导致 Markdown 渲染器解析错误)
      res = res.replace(/\n/g, ' ');
      // 合并多个空格
      res = res.replace(/\s+/g, ' ');
      break;

    case NormalizationType.MathJax:
      // MathJax 通常容忍度很高，主要去除多余的空行
      res = res.replace(/\n\s*\n/g, '\n');
      break;

    case NormalizationType.Original:
    default:
      break;
  }

  return res.trim();
}

// export function latexFormat(content: string, prefer: Prefer) {
//   const { format_signs } = prefer
//   return parserMap[format_signs](content)
// }
export function latexFormat(content: string, prefer: Prefer) {
  const { format_signs, normalization = defaultNormalization } = prefer

  // 第一步：规范化内容
  const cleanContent = normalizeContent(content, normalization);

  // 第二步：外层包裹
  return parserMap[format_signs](cleanContent)
}