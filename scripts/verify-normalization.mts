import assert from 'node:assert/strict'
import katex from 'katex'
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
  expected: string
  katexSmoke?: boolean
}

const cases: Case[] = [
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
  const actual = latexFormat(item.input, item.prefer)
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
