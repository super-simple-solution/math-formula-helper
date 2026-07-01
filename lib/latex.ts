import type { Prefer } from './storage'

export enum LatexSymbol {
  Inline = 'inline',
  Block = 'block',
  Square = 'square',
  Empty = 'empty',
}

export enum OutputProfile {
  MarkdownKatex = 'markdown-katex',
  MarkdownMathJax = 'markdown-mathjax',
  LatexDocument = 'latex-document',
  Raw = 'raw',
}

export enum NormalizationType {
  Original = 'original', // 原样，不做任何处理
  KaTex = 'katex', // KaTeX 优化 (去换行、去环境标签、去 tag)
  MathJax = 'mathjax', // MathJax/LaTeX 标准 (保留环境，但去除多余空行)
}

export enum TagPolicy {
  Auto = 'auto',
  Keep = 'keep',
  Remove = 'remove',
}

export enum EnvironmentPolicy {
  Auto = 'auto',
  Keep = 'keep',
  Unwrap = 'unwrap',
  Convert = 'convert',
}

export enum BracePolicy {
  Auto = 'auto',
  Keep = 'keep',
  Clean = 'clean',
}

export enum HistoryValueMode {
  Raw = 'raw',
  Formatted = 'formatted',
  Both = 'both',
}

export const parserMap: Record<LatexSymbol, (content: string) => string> = {
  inline: (content: string) => `$${content}$`,
  block: (content: string) => `$$${content}$$`,
  square: (content: string) => `\\[${content}\\]`,
  empty: (content: string) => content,
}

export const defaultLatexSymbol: LatexSymbol = LatexSymbol.Inline

export const defaultOutputProfile: OutputProfile = OutputProfile.MarkdownKatex

export const defaultNormalization: NormalizationType = NormalizationType.KaTex

export const defaultTagPolicy: TagPolicy = TagPolicy.Auto

export const defaultEnvironmentPolicy: EnvironmentPolicy = EnvironmentPolicy.Auto

export const defaultBracePolicy: BracePolicy = BracePolicy.Auto

export const defaultHistoryValueMode: HistoryValueMode = HistoryValueMode.Raw

export type LatexFormatOptions = {
  output_profile?: OutputProfile
  format_signs?: LatexSymbol
  normalization?: NormalizationType
  tag_policy?: TagPolicy
  environment_policy?: EnvironmentPolicy
  brace_policy?: BracePolicy
}

export type ResolvedLatexFormatOptions = {
  output_profile: OutputProfile
  format_signs: LatexSymbol
  normalization: NormalizationType
  tag_policy: TagPolicy
  environment_policy: EnvironmentPolicy
  brace_policy: BracePolicy
}

const profileDefaults: Record<
  OutputProfile,
  { format_signs: LatexSymbol; normalization: NormalizationType }
> = {
  [OutputProfile.MarkdownKatex]: {
    format_signs: LatexSymbol.Inline,
    normalization: NormalizationType.KaTex,
  },
  [OutputProfile.MarkdownMathJax]: {
    format_signs: LatexSymbol.Inline,
    normalization: NormalizationType.MathJax,
  },
  [OutputProfile.LatexDocument]: {
    format_signs: LatexSymbol.Empty,
    normalization: NormalizationType.MathJax,
  },
  [OutputProfile.Raw]: {
    format_signs: LatexSymbol.Empty,
    normalization: NormalizationType.Original,
  },
}

export function getOutputProfileDefaults(profile: OutputProfile) {
  return profileDefaults[profile] ?? profileDefaults[defaultOutputProfile]
}

export function resolveLatexFormatOptions(prefer: LatexFormatOptions): ResolvedLatexFormatOptions {
  const profile = prefer.output_profile ?? defaultOutputProfile
  const defaults = getOutputProfileDefaults(profile)

  return {
    output_profile: profile,
    format_signs: prefer.format_signs ?? defaults.format_signs,
    normalization: prefer.normalization ?? defaults.normalization,
    tag_policy: prefer.tag_policy ?? defaultTagPolicy,
    environment_policy: prefer.environment_policy ?? defaultEnvironmentPolicy,
    brace_policy: prefer.brace_policy ?? defaultBracePolicy,
  }
}

export function normalizeLatexContent(content: string, options: ResolvedLatexFormatOptions): string {
  let res = decodeLatexEntities(stripExistingMathDelimiters(content.trim()))

  if (options.normalization === NormalizationType.Original) return res.trim()

  const isInline = options.format_signs === LatexSymbol.Inline
  const isMarkdownProfile =
    options.output_profile === OutputProfile.MarkdownKatex ||
    options.output_profile === OutputProfile.MarkdownMathJax

  const removeTags =
    options.tag_policy === TagPolicy.Remove ||
    (options.tag_policy === TagPolicy.Auto &&
      (options.normalization === NormalizationType.KaTex || isInline))
  const removeLabels =
    options.tag_policy === TagPolicy.Remove ||
    (options.tag_policy === TagPolicy.Auto &&
      (options.normalization === NormalizationType.KaTex || isMarkdownProfile || isInline))

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
      (options.normalization === NormalizationType.KaTex || isMarkdownProfile || isInline))

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
      (options.normalization === NormalizationType.KaTex || isMarkdownProfile || isInline))
  ) {
    res = convertLatexEnvironment(res, ['align', 'align*', 'flalign', 'flalign*'], 'aligned')
    res = convertLatexEnvironment(res, ['gather', 'gather*', 'multline', 'multline*'], 'gathered')
  }

  const cleanBraces =
    options.brace_policy === BracePolicy.Clean ||
    (options.brace_policy === BracePolicy.Auto &&
      (options.normalization === NormalizationType.KaTex || isMarkdownProfile))

  if (cleanBraces) {
    res = collapseRedundantBraceGroups(res)
  }

  return normalizeLatexWhitespace(res, options.normalization === NormalizationType.KaTex).trim()
}

export function latexFormat(content: string, prefer: Prefer | LatexFormatOptions) {
  const options = resolveLatexFormatOptions(prefer)
  const { format_signs } = options

  // 第一步：规范化内容
  const cleanContent = normalizeLatexContent(content, options)

  // 第二步：外层包裹
  return parserMap[format_signs](cleanContent)
}

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

function stripExistingMathDelimiters(content: string) {
  const trimmed = content.trim()
  const delimiterPairs = [
    [/^\$\$([\s\S]*)\$\$$/, '$$'],
    [/^\\\[([\s\S]*)\\\]$/, '\\[\\]'],
    [/^\\\(([\s\S]*)\\\)$/, '\\(\\)'],
    [/^\$([\s\S]*)\$$/, '$'],
  ] as const

  for (const [pattern] of delimiterPairs) {
    const match = trimmed.match(pattern)
    if (match) return match[1].trim()
  }

  return content
}

function unwrapLatexEnvironments(content: string, envNames: string[]) {
  return envNames.reduce(
    (source, envName) =>
      source.replace(environmentPattern(envName), (_, body: string) => body.trim()),
    content,
  )
}

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

function environmentPattern(envName: string) {
  const escaped = escapeRegExp(envName)
  return new RegExp(`\\\\begin\\{${escaped}\\}([\\s\\S]*?)\\\\end\\{${escaped}\\}`, 'g')
}

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

const preserveCommandArgs = new Set(['text', 'textrm', 'textit', 'textbf', 'textnormal', 'mbox'])

function collapseRedundantBraceGroups(content: string) {
  return normalizeBraceSegment(content).trim()
}

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

function shouldUnwrapBraceGroup(content: string) {
  if (!content) return true
  if (/^[a-zA-Z0-9]$/.test(content)) return true
  if (/^\\[a-zA-Z]+$/.test(content)) return true
  if (/^\\[a-zA-Z]+\{[^{}]+\}$/.test(content)) return true
  return false
}

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

function escapeRegExp(content: string) {
  return content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
