export function refineLatexSource(content: string) {
  const trimmedContent = trimPunctuation(content.trim())
    .replace(/\\&\\text{nbsp};/g, '\\enspace')
    .replace(/&nbsp;/g, '\\enspace')
  if (!trimmedContent.length) return ''
  if (
    trimmedContent.includes('\\\\') &&
    !trimmedContent.startsWith('\\begin') &&
    !trimmedContent.includes('\\begin{')
  ) {
    return `\\begin{array}{c} ${trimmedContent} \\end{array}`
  }
  return trimmedContent
}

function trimPunctuation(str: string) {
  const punctionStr = ',`:!.;~`?\'"'
  const reg = new RegExp(`^[${punctionStr}]+|[${punctionStr}]+$`, 'g')
  return str.replace(reg, '').trim()
}
