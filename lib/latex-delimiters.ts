// Removes one outer math delimiter pair and trims the remaining TeX source.
export function unwrapOuterMathDelimiters(source: string) {
  let value = source.trim()
  if (!value) return ''

  const wrappers: Array<[RegExp, string]> = [
    [/^\$\$([\s\S]*)\$\$$/u, '$1'],
    [/^\\\[([\s\S]*)\\\]$/u, '$1'],
    [/^\\\(([\s\S]*)\\\)$/u, '$1'],
    [/^\$([\s\S]*)\$$/u, '$1'],
  ]

  for (const [pattern, replacement] of wrappers) {
    if (pattern.test(value)) {
      value = value.replace(pattern, replacement).trim()
      break
    }
  }

  return value
}
