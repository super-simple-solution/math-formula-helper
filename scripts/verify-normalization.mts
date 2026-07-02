import assert from 'node:assert/strict'
import katex from 'katex'
import {
  buildFormulaClipboardPayload,
  normalizeMathmlForClipboard,
} from '../lib/clipboard-payload.ts'
import { hasUnknownLatexMacros } from '../lib/latex-macros.ts'
import {
  BracePolicy,
  EnvironmentPolicy,
  LatexSymbol,
  NormalizationType,
  OutputProfile,
  TagPolicy,
  latexFormat,
} from '../lib/latex.ts'

type Case = {
  name: string
  input: string
  prefer: Parameters<typeof latexFormat>[1]
  context?: Parameters<typeof latexFormat>[2]
  expected: string
  katexSmoke?: boolean
}

const cases: Case[] = [
  {
    name: 'Auto delimiters fall back to Markdown KaTeX profile when display mode is unknown',
    input: String.raw`\begin{equation} E = mc^2 \tag{1} \end{equation}`,
    prefer: {
      output_profile: OutputProfile.MarkdownKatex,
      format_signs: LatexSymbol.Auto,
      normalization: NormalizationType.Auto,
    },
    expected: String.raw`$E = mc^2$`,
    katexSmoke: true,
  },
  {
    name: 'Auto delimiters use display mode for Markdown KaTeX display formulas',
    input: String.raw`\begin{equation} E = mc^2 \tag{1} \end{equation}`,
    prefer: {
      output_profile: OutputProfile.MarkdownKatex,
      format_signs: LatexSymbol.Auto,
      normalization: NormalizationType.Auto,
    },
    context: { displayMode: 'display' },
    expected: String.raw`$$E = mc^2$$`,
    katexSmoke: true,
  },
  {
    name: 'Auto delimiters use inline mode for Markdown KaTeX inline formulas',
    input: String.raw`E = mc^2`,
    prefer: {
      output_profile: OutputProfile.MarkdownKatex,
      format_signs: LatexSymbol.Auto,
      normalization: NormalizationType.Auto,
    },
    context: { displayMode: 'inline' },
    expected: String.raw`$E = mc^2$`,
    katexSmoke: true,
  },
  {
    name: 'Auto delimiters use square display math for LaTeX document display formulas',
    input: String.raw`\begin{equation} E = mc^2 \tag{1} \label{eq:mass} \end{equation}`,
    prefer: {
      output_profile: OutputProfile.LatexDocument,
      format_signs: LatexSymbol.Auto,
      normalization: NormalizationType.Auto,
    },
    context: { displayMode: 'display' },
    expected: String.raw`\[E = mc^2\]`,
  },
  {
    name: 'Auto delimiters convert LaTeX document display align for square display math',
    input: String.raw`\begin{align} a&=b\\ c&=d \end{align}`,
    prefer: {
      output_profile: OutputProfile.LatexDocument,
      format_signs: LatexSymbol.Auto,
      normalization: NormalizationType.Auto,
    },
    context: { displayMode: 'display' },
    expected: String.raw`\[\begin{aligned} a&=b\\ c&=d \end{aligned}\]`,
  },
  {
    name: 'Auto defaults follow Raw profile',
    input: String.raw`  \begin{equation} x \tag{1} \end{equation}  `,
    prefer: {
      output_profile: OutputProfile.Raw,
      format_signs: LatexSymbol.Auto,
      normalization: NormalizationType.Auto,
    },
    context: { displayMode: 'display' },
    expected: String.raw`\begin{equation} x \tag{1} \end{equation}`,
  },
  {
    name: 'Word Native profile uses cleaned pure LaTeX as plain-text fallback',
    input: String.raw`\begin{equation} {{E}} = mc^2 \tag{1} \label{eq:mass} \end{equation}`,
    prefer: {
      output_profile: OutputProfile.WordNative,
      format_signs: LatexSymbol.Auto,
      normalization: NormalizationType.Auto,
    },
    context: { displayMode: 'display' },
    expected: String.raw`E = mc^2`,
    katexSmoke: true,
  },
  {
    name: 'KaTeX markdown removes equation wrapper, tag, label, and newlines',
    input: String.raw`\begin{equation}
  E = mc^2 \tag{1}
  \label{eq:mass}
\end{equation}`,
    prefer: {
      output_profile: OutputProfile.MarkdownKatex,
      format_signs: LatexSymbol.Inline,
      normalization: NormalizationType.KaTex,
    },
    expected: String.raw`$E = mc^2$`,
    katexSmoke: true,
  },
  {
    name: 'KaTeX markdown preserves display body and strips unsafe tags',
    input: String.raw`\begin{equation} E = mc^2 \tag{1} \end{equation}`,
    prefer: {
      output_profile: OutputProfile.MarkdownKatex,
      format_signs: LatexSymbol.Block,
      normalization: NormalizationType.KaTex,
    },
    expected: String.raw`$$E = mc^2$$`,
    katexSmoke: true,
  },
  {
    name: 'MathJax markdown keeps tag in display mode but removes equation wrapper',
    input: String.raw`\begin{equation} E = mc^2 \tag{1} \label{eq:mass} \end{equation}`,
    prefer: {
      output_profile: OutputProfile.MarkdownMathJax,
      format_signs: LatexSymbol.Block,
      normalization: NormalizationType.MathJax,
    },
    expected: String.raw`$$E = mc^2 \tag{1}$$`,
  },
  {
    name: 'Inline MathJax removes tag because tags are display-only',
    input: String.raw`\begin{equation} E = mc^2 \tag{1} \end{equation}`,
    prefer: {
      output_profile: OutputProfile.MarkdownMathJax,
      format_signs: LatexSymbol.Inline,
      normalization: NormalizationType.MathJax,
    },
    expected: String.raw`$E = mc^2$`,
  },
  {
    name: 'KaTeX converts align to aligned inside display delimiters',
    input: String.raw`\begin{align}
  a&=b\\
  c&=d
\end{align}`,
    prefer: {
      output_profile: OutputProfile.MarkdownKatex,
      format_signs: LatexSymbol.Block,
      normalization: NormalizationType.KaTex,
    },
    expected: String.raw`$$\begin{aligned} a&=b\\ c&=d \end{aligned}$$`,
    katexSmoke: true,
  },
  {
    name: 'Redundant simple braces are removed without breaking macro arguments',
    input: String.raw`{{x}} + {\alpha} + \frac{{a}}{{b}} + \mathbb{{R}}`,
    prefer: {
      output_profile: OutputProfile.MarkdownKatex,
      format_signs: LatexSymbol.Inline,
      normalization: NormalizationType.KaTex,
    },
    expected: String.raw`$x + \alpha + \frac{a}{b} + \mathbb{R}$`,
    katexSmoke: true,
  },
  {
    name: 'Scripts keep braces while cleaning nested redundant groups',
    input: String.raw`H_{{n}}(S^{{k}}; {\mathbb{{Z}}})`,
    prefer: {
      output_profile: OutputProfile.MarkdownKatex,
      format_signs: LatexSymbol.Inline,
      normalization: NormalizationType.KaTex,
    },
    expected: String.raw`$H_{n}(S^{k}; \mathbb{Z})$`,
    katexSmoke: true,
  },
  {
    name: 'Cases environment is preserved while nested braces are cleaned',
    input: String.raw`\begin{cases} \mathbb{{Z}}, & k=0 \\ 0, & k\ne0 \end{cases}`,
    prefer: {
      output_profile: OutputProfile.MarkdownKatex,
      format_signs: LatexSymbol.Block,
      normalization: NormalizationType.KaTex,
    },
    expected: String.raw`$$\begin{cases} \mathbb{Z}, & k=0 \\ 0, & k\ne0 \end{cases}$$`,
    katexSmoke: true,
  },
  {
    name: 'Text macro content is preserved',
    input: String.raw`x \text{ if and only if } y`,
    prefer: {
      output_profile: OutputProfile.MarkdownKatex,
      format_signs: LatexSymbol.Inline,
      normalization: NormalizationType.KaTex,
    },
    expected: String.raw`$x \text{ if and only if } y$`,
    katexSmoke: true,
  },
  {
    name: 'Existing delimiters are stripped before applying the selected wrapper',
    input: String.raw`$$x+1$$`,
    prefer: {
      output_profile: OutputProfile.MarkdownKatex,
      format_signs: LatexSymbol.Square,
      normalization: NormalizationType.KaTex,
    },
    expected: String.raw`\[x+1\]`,
    katexSmoke: true,
  },
  {
    name: 'LaTeX document profile keeps equation environments and labels',
    input: String.raw`\begin{equation}
  E = mc^2 \tag{1}
  \label{eq:mass}
\end{equation}`,
    prefer: {
      output_profile: OutputProfile.LatexDocument,
      format_signs: LatexSymbol.Empty,
      normalization: NormalizationType.MathJax,
    },
    expected: String.raw`\begin{equation}
 E = mc^2 \tag{1}
 \label{eq:mass}
\end{equation}`,
  },
  {
    name: 'Raw profile applies no wrapping or cleanup beyond edge trim',
    input: String.raw`  \begin{equation} x \tag{1} \end{equation}  `,
    prefer: {
      output_profile: OutputProfile.Raw,
      format_signs: LatexSymbol.Empty,
      normalization: NormalizationType.Original,
    },
    expected: String.raw`\begin{equation} x \tag{1} \end{equation}`,
  },
  {
    name: 'Explicit tag keep preserves display-only tag even for inline output',
    input: String.raw`\begin{equation} E = mc^2 \tag{1} \end{equation}`,
    prefer: {
      output_profile: OutputProfile.MarkdownMathJax,
      format_signs: LatexSymbol.Inline,
      normalization: NormalizationType.MathJax,
      tag_policy: TagPolicy.Keep,
    },
    expected: String.raw`$E = mc^2 \tag{1}$`,
  },
  {
    name: 'Explicit environment keep preserves wrappers in markdown output',
    input: String.raw`\begin{equation} E = mc^2 \tag{1} \end{equation}`,
    prefer: {
      output_profile: OutputProfile.MarkdownKatex,
      format_signs: LatexSymbol.Block,
      normalization: NormalizationType.KaTex,
      environment_policy: EnvironmentPolicy.Keep,
    },
    expected: String.raw`$$\begin{equation} E = mc^2 \end{equation}$$`,
  },
  {
    name: 'Explicit environment unwrap removes align wrapper without converting it',
    input: String.raw`\begin{align} a&=b\\ c&=d \end{align}`,
    prefer: {
      output_profile: OutputProfile.MarkdownKatex,
      format_signs: LatexSymbol.Block,
      normalization: NormalizationType.KaTex,
      environment_policy: EnvironmentPolicy.Unwrap,
    },
    expected: String.raw`$$a&=b\\ c&=d$$`,
  },
  {
    name: 'Explicit brace keep preserves publisher brace groups',
    input: String.raw`{{x}} + \mathbb{{R}}`,
    prefer: {
      output_profile: OutputProfile.MarkdownKatex,
      format_signs: LatexSymbol.Inline,
      normalization: NormalizationType.KaTex,
      brace_policy: BracePolicy.Keep,
    },
    expected: '${{x}} + \\mathbb{{R}}$',
  },
  {
    name: 'Explicit brace clean works outside markdown profiles',
    input: String.raw`{{x}} + \mathbb{{R}}`,
    prefer: {
      output_profile: OutputProfile.LatexDocument,
      format_signs: LatexSymbol.Empty,
      normalization: NormalizationType.MathJax,
      brace_policy: BracePolicy.Clean,
    },
    expected: String.raw`x + \mathbb{R}`,
  },
]

for (const item of cases) {
  const actual = latexFormat(item.input, item.prefer, item.context)
  assert.equal(actual, item.expected, item.name)

  if (item.katexSmoke) {
    const { body, displayMode } = unwrapForKatex(actual)
    katex.renderToString(body, {
      displayMode,
      throwOnError: true,
      strict: 'warn',
    })
  }
}

assert.equal(
  hasUnknownLatexMacros(
    String.raw`\frac{a}{b} + \mathbb{R} + \operatorname{Hom}(A,B) + x \simeq y + \begin{cases} a \\ b \end{cases}`,
  ),
  false,
  'standard macro detector should accept common portable LaTeX commands',
)
assert.equal(
  hasUnknownLatexMacros(String.raw`\map A B + \rd t`),
  true,
  'standard macro detector should flag site-specific raw TeX commands',
)

const wordPayload = buildFormulaClipboardPayload(
  String.raw`x^2`,
  {
    output_profile: OutputProfile.WordNative,
    format_signs: LatexSymbol.Auto,
    normalization: NormalizationType.Auto,
  },
  {
    displayMode: 'display',
    mathml: '<math><msup><mi>x</mi><mn>2</mn></msup></math>',
  },
)
assert.equal(wordPayload.text, String.raw`x^2`, 'Word Native plain text should be LaTeX fallback')
assert.match(
  wordPayload.html || '',
  /<math display="block" xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML">/,
  'Word Native payload should include display MathML with namespace',
)
assert.equal(
  normalizeMathmlForClipboard('<math><mi>x</mi></math>', 'inline'),
  '<math display="inline" xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math>&nbsp;',
  'Inline MathML clipboard normalization should add namespace, display mode, and trailing space',
)
assert.equal(
  normalizeMathmlForClipboard('<math><mi>x</mi></math>', 'inline', { trailingSpace: false }),
  '<math display="inline" xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math>',
  'Inline MathML clipboard normalization should allow suppressing trailing space',
)

console.log(`verify-normalization: ${cases.length} cases passed`)

function unwrapForKatex(output: string) {
  if (output.startsWith('$$') && output.endsWith('$$')) {
    return { body: output.slice(2, -2), displayMode: true }
  }

  if (output.startsWith('\\[') && output.endsWith('\\]')) {
    return { body: output.slice(2, -2), displayMode: true }
  }

  if (output.startsWith('$') && output.endsWith('$')) {
    return { body: output.slice(1, -1), displayMode: false }
  }

  return { body: output, displayMode: true }
}
