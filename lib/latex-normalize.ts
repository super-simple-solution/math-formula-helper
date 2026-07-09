import {
  BracePolicy,
  EnvironmentPolicy,
  LatexSymbol,
  NormalizationType,
  OutputProfile,
  TagPolicy,
  type ResolvedLatexFormatOptions,
} from './latex-options'
import { unwrapOuterMathDelimiters } from './latex-delimiters'

// Runs the full LaTeX cleanup pipeline for a resolved output target.
export function normalizeLatexContent(content: string, options: ResolvedLatexFormatOptions): string {
  let res = decodeLatexEntities(unwrapOuterMathDelimiters(content))

  // Original is an explicit "no cleanup" mode: keep source structure after entity/delimiter trim.
  if (options.normalization === NormalizationType.Original) return res.trim()

  const isInline = options.format_signs === LatexSymbol.Inline
  const isDelimited = options.format_signs !== LatexSymbol.Empty
  const isLatexDocumentDelimited =
    options.output_profile === OutputProfile.LatexDocument && isDelimited
  const isMarkdownProfile =
    options.output_profile === OutputProfile.MarkdownKatex ||
    options.output_profile === OutputProfile.MarkdownMathJax
  const isWordNativeProfile = options.output_profile === OutputProfile.WordNative

  const removeTags =
    options.tag_policy === TagPolicy.Remove ||
    (options.tag_policy === TagPolicy.Auto &&
      (options.normalization === NormalizationType.KaTex ||
        isInline ||
        isLatexDocumentDelimited ||
        isWordNativeProfile))
  const removeLabels =
    options.tag_policy === TagPolicy.Remove ||
    (options.tag_policy === TagPolicy.Auto &&
      (options.normalization === NormalizationType.KaTex ||
        isMarkdownProfile ||
        isInline ||
        isLatexDocumentDelimited ||
        isWordNativeProfile))

  if (removeTags || removeLabels) {
    const commandsWithArgs = [
      ...(removeTags ? ['tag'] : []),
      ...(removeLabels ? ['label'] : []),
    ]
    if (commandsWithArgs.length) {
      res = removeLatexCommandsWithOneArg(res, commandsWithArgs)
    }
  }

  if (removeTags) {
    res = removeLatexCommandsWithoutArgs(res, ['notag', 'nonumber'])
  }

  const normalizeEnvironments =
    options.environment_policy === EnvironmentPolicy.Unwrap ||
    options.environment_policy === EnvironmentPolicy.Convert ||
    (options.environment_policy === EnvironmentPolicy.Auto &&
      (options.normalization === NormalizationType.KaTex ||
        isMarkdownProfile ||
        isInline ||
        isLatexDocumentDelimited ||
        isWordNativeProfile))

  if (normalizeEnvironments) {
    res = unwrapLatexEnvironments(res, ['equation', 'equation*', 'displaymath'])
  }

  if (options.environment_policy === EnvironmentPolicy.Unwrap) {
    res = unwrapLatexEnvironments(res, [
      'align',
      'align*',
      'flalign',
      'flalign*',
      'gather',
      'gather*',
      'multline',
      'multline*',
    ])
  } else if (
    options.environment_policy === EnvironmentPolicy.Convert ||
    (options.environment_policy === EnvironmentPolicy.Auto &&
      (options.normalization === NormalizationType.KaTex ||
        isMarkdownProfile ||
        isInline ||
        isLatexDocumentDelimited ||
        isWordNativeProfile))
  ) {
    res = convertLatexEnvironment(res, ['align', 'align*', 'flalign', 'flalign*'], 'aligned')
    res = convertLatexEnvironment(res, ['gather', 'gather*', 'multline', 'multline*'], 'gathered')
  }

  const cleanBraces =
    options.brace_policy === BracePolicy.Clean ||
    (options.brace_policy === BracePolicy.Auto &&
      (options.normalization === NormalizationType.KaTex || isMarkdownProfile || isWordNativeProfile))

  if (cleanBraces) {
    res = collapseRedundantBraceGroups(res)
  }

  return normalizeLatexWhitespace(res, options.normalization === NormalizationType.KaTex).trim()
}

// Converts common HTML entities and Unicode math symbols into portable LaTeX tokens.
function decodeLatexEntities(content: string) {
  return normalizeLatexUnicodeSymbols(
    content
      .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
        String.fromCodePoint(Number.parseInt(code, 16)),
      )
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
      .replace(/\\&\\text\{nbsp;\}/g, '\\enspace')
      .replace(/&nbsp;|&#160;|&#xA0;/gi, '\\enspace')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>'),
  )
}

// Rewrites single-character math glyphs that commonly appear in copied text.
function normalizeLatexUnicodeSymbols(content: string) {
  const symbolMap: Record<string, string> = {
    '×': '\\times',
    '∞': '\\infty',
    '∀': '\\forall',
    '∂': '\\partial',
    '∈': '\\in',
    '∉': '\\notin',
    '∪': '\\cup',
    '∩': '\\cap',
    '⊂': '\\subset',
    '⊆': '\\subseteq',
    '≤': '\\le',
    '≥': '\\ge',
    '→': '\\to',
    '↦': '\\mapsto',
    '−': '-',
  }

  return Array.from(content)
    .map((char) => symbolMap[char] ?? char)
    .join('')
}

// Removes complete begin/end wrappers while preserving the environment body.
function unwrapLatexEnvironments(content: string, envNames: string[]) {
  return envNames.reduce(
    (source, envName) =>
      source.replace(environmentPattern(envName), (_, body: string) => body.trim()),
    content,
  )
}

// Rewrites display-only environments into inline-safe inner environments such as aligned.
function convertLatexEnvironment(content: string, envNames: string[], targetEnv: string) {
  return envNames.reduce(
    (source, envName) =>
      source.replace(
        environmentPattern(envName),
        (_, body: string) => `\\begin{${targetEnv}} ${body.trim()} \\end{${targetEnv}}`,
      ),
    content,
  )
}

// Builds a global regex for one exact LaTeX environment name.
function environmentPattern(envName: string) {
  const escaped = escapeRegExp(envName)
  return new RegExp(`\\\\begin\\{${escaped}\\}([\\s\\S]*?)\\\\end\\{${escaped}\\}`, 'g')
}

// Drops commands such as \notag that do not take an explicit argument group.
function removeLatexCommandsWithoutArgs(content: string, commandNames: string[]) {
  const names = new Set(commandNames)
  let result = ''

  for (let i = 0; i < content.length; ) {
    if (content[i] !== '\\') {
      result += content[i]
      i += 1
      continue
    }

    const command = readLatexCommand(content, i)
    if (command && names.has(command.name)) {
      i = command.end
      continue
    }

    result += command?.raw ?? content[i]
    i = command?.end ?? i + 1
  }

  return result
}

// Drops commands such as \tag{...} or \label{...} together with their first braced argument.
function removeLatexCommandsWithOneArg(content: string, commandNames: string[]) {
  const names = new Set(commandNames)
  let result = ''

  for (let i = 0; i < content.length; ) {
    if (content[i] !== '\\') {
      result += content[i]
      i += 1
      continue
    }

    const command = readLatexCommand(content, i)
    if (!command || !names.has(command.name)) {
      result += command?.raw ?? content[i]
      i = command?.end ?? i + 1
      continue
    }

    i = command.end
    while (/\s/.test(content[i] || '')) i += 1
    if (content[i] === '{') {
      const group = readBalancedGroup(content, i, '{', '}')
      i = group?.end ?? i + 1
    }
  }

  return result
}

// Known command arities let brace cleanup keep required macro arguments intact.
const commandArgCounts: Record<string, number> = {
  frac: 2,
  dfrac: 2,
  tfrac: 2,
  binom: 2,
  dbinom: 2,
  tbinom: 2,
  sqrt: 1,
  overline: 1,
  underline: 1,
  widehat: 1,
  widetilde: 1,
  hat: 1,
  tilde: 1,
  bar: 1,
  vec: 1,
  dot: 1,
  ddot: 1,
  mathbb: 1,
  mathbf: 1,
  mathcal: 1,
  mathfrak: 1,
  mathit: 1,
  mathrm: 1,
  mathsf: 1,
  mathtt: 1,
  text: 1,
  textrm: 1,
  textit: 1,
  textbf: 1,
  textnormal: 1,
  mbox: 1,
  operatorname: 1,
  overset: 2,
  underset: 2,
  stackrel: 2,
  overbrace: 1,
  underbrace: 1,
  tag: 1,
  label: 1,
  ref: 1,
  eqref: 1,
  cite: 1,
}

// Text-like commands preserve inner spacing and braces because they are user-visible text.
const preserveCommandArgs = new Set(['text', 'textrm', 'textit', 'textbf', 'textnormal', 'mbox'])

// Entry point for redundant-brace cleanup after tag/environment policies have already run.
function collapseRedundantBraceGroups(content: string) {
  return normalizeBraceSegment(content).trim()
}

// Walks a LaTeX fragment and recursively removes only groups that are syntactically safe.
function normalizeBraceSegment(content: string) {
  let result = ''
  let pendingCommand: { count: number; preserve: boolean } | null = null
  let scriptPending = false

  for (let i = 0; i < content.length; ) {
    const char = content[i]

    if (char === '\\') {
      const command = readLatexCommand(content, i)
      if (!command) {
        result += char
        i += 1
        scriptPending = false
        continue
      }

      result += command.raw
      i = command.end

      if (pendingCommand?.count) {
        pendingCommand.count -= 1
        if (pendingCommand.count <= 0) pendingCommand = null
      }

      const argCount = commandArgCounts[command.name] ?? 0
      if (argCount > 0) {
        pendingCommand = {
          count: argCount,
          preserve: preserveCommandArgs.has(command.name),
        }
      }
      scriptPending = false
      continue
    }

    if (pendingCommand && char === '[') {
      const optional = readBalancedGroup(content, i, '[', ']')
      if (optional) {
        result += `[${optional.content}]`
        i = optional.end
        continue
      }
    }

    if (char === '^' || char === '_') {
      result += char
      i += 1
      scriptPending = true
      continue
    }

    if (char === '{') {
      const group = readBalancedGroup(content, i, '{', '}')
      if (!group) {
        result += char
        i += 1
        scriptPending = false
        continue
      }

      if (pendingCommand?.count) {
        const inner = pendingCommand.preserve
          ? group.content
          : normalizeBraceSegment(group.content).trim()
        result += `{${inner}}`
        pendingCommand.count -= 1
        if (pendingCommand.count <= 0) pendingCommand = null
      } else if (scriptPending) {
        result += `{${normalizeBraceSegment(group.content).trim()}}`
      } else {
        const inner = normalizeBraceSegment(group.content).trim()
        result += shouldUnwrapBraceGroup(inner) ? inner : `{${inner}}`
      }

      i = group.end
      scriptPending = false
      continue
    }

    result += char
    i += 1

    if (!/\s/.test(char)) {
      if (pendingCommand?.count) {
        pendingCommand.count -= 1
        if (pendingCommand.count <= 0) pendingCommand = null
      }
      scriptPending = false
    }
  }

  return result
}

// Decides whether a standalone group is redundant without changing command arguments or scripts.
function shouldUnwrapBraceGroup(content: string) {
  if (!content) return true
  if (/^[a-zA-Z0-9]$/.test(content)) return true
  if (/^\\[a-zA-Z]+$/.test(content)) return true
  if (/^\\[a-zA-Z]+\{[^{}]+\}$/.test(content)) return true
  return false
}

// Reads a balanced {...} or [...] group while ignoring escaped delimiters.
function readBalancedGroup(content: string, start: number, open: string, close: string) {
  if (content[start] !== open) return null

  let depth = 0
  for (let i = start; i < content.length; i += 1) {
    if (content[i] === '\\') {
      i += 1
      continue
    }
    if (content[i] === open) depth += 1
    if (content[i] === close) depth -= 1
    if (depth === 0) {
      return {
        content: content.slice(start + 1, i),
        end: i + 1,
      }
    }
  }

  return null
}

// Reads a LaTeX command token, including one-character commands and starred command names.
function readLatexCommand(content: string, start: number) {
  if (content[start] !== '\\') return null
  const next = content[start + 1]
  if (!next) return null

  if (!/[a-zA-Z]/.test(next)) {
    return {
      raw: content.slice(start, start + 2),
      name: next,
      end: start + 2,
    }
  }

  let end = start + 2
  while (/[a-zA-Z]/.test(content[end] || '')) end += 1

  const name = content.slice(start + 1, end)
  if (content[end] === '*') end += 1

  return {
    raw: content.slice(start, end),
    name,
    end,
  }
}

// Normalizes whitespace differently for compact KaTeX output and document-like output.
function normalizeLatexWhitespace(content: string, compact: boolean) {
  if (compact) {
    const protectedContent = protectPreservedCommandArgs(content)
    return protectedContent.content
      .replace(/\s*([\r\n])+\s*/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s+([,;:.)\]}])/g, '$1')
      .replace(/([([{])\s+/g, '$1')
      .replace(
        /__MFH_LATEX_TEXT_(\d+)__/g,
        (_, index: string) => protectedContent.values[Number(index)] ?? '',
      )
  }

  return content
    .replace(/\r\n/g, '\n')
    .replace(/\n\s*\n+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
}

// Temporarily replaces text command arguments so compact whitespace cleanup cannot alter prose.
function protectPreservedCommandArgs(content: string) {
  const values: string[] = []
  let result = ''

  for (let i = 0; i < content.length; ) {
    if (content[i] !== '\\') {
      result += content[i]
      i += 1
      continue
    }

    const command = readLatexCommand(content, i)
    if (!command || !preserveCommandArgs.has(command.name)) {
      result += command?.raw ?? content[i]
      i = command?.end ?? i + 1
      continue
    }

    let groupStart = command.end
    while (/\s/.test(content[groupStart] || '')) groupStart += 1
    const group = readBalancedGroup(content, groupStart, '{', '}')
    if (!group) {
      result += command.raw
      i = command.end
      continue
    }

    values.push(content.slice(i, group.end))
    result += `__MFH_LATEX_TEXT_${values.length - 1}__`
    i = group.end
  }

  return { content: result, values }
}

// Escapes user-provided environment names before embedding them in a regular expression.
function escapeRegExp(content: string) {
  return content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
