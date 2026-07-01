import assert from 'node:assert/strict'
import fs from 'node:fs'
import katex from 'katex'
import { MathMLToLaTeX } from 'mathml-to-latex'
import {
  LatexSymbol,
  NormalizationType,
  OutputProfile,
  latexFormat,
} from '../lib/latex.ts'

const fixturePath = process.env.MATHML_FIXTURE || 'docs/mathml-local.htm'
const html = fs.readFileSync(fixturePath, 'utf8')
const mathmlBlocks = [...html.matchAll(/<math\b[\s\S]*?<\/math>/gi)].map((match) => match[0])
const seen = new Set<string>()
const errors: Array<{ index: number; raw: string; formatted: string; error: string }> = []

assert.throws(
  () => katex.renderToString(String.raw`\definitelyNotAMacro`, { throwOnError: true }),
  undefined,
  'KaTeX sanity check did not throw for an unknown command.',
)

for (let index = 0; index < mathmlBlocks.length; index += 1) {
  const raw = MathMLToLaTeX.convert(mathmlBlocks[index])
  if (!raw || seen.has(raw)) continue
  seen.add(raw)

  const formatted = latexFormat(raw, {
    output_profile: OutputProfile.MarkdownKatex,
    format_signs: LatexSymbol.Empty,
    normalization: NormalizationType.KaTex,
  })

  try {
    katex.renderToString(formatted, {
      displayMode: true,
      throwOnError: true,
      strict: 'error',
    })
  } catch (error) {
    errors.push({
      index: index + 1,
      raw,
      formatted,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

if (errors.length) {
  console.error(JSON.stringify({ fixturePath, errors }, null, 2))
  throw new Error(`Local MathML render check failed for ${errors.length} formula(s).`)
}

console.log(
  JSON.stringify(
    {
      fixturePath,
      mathmlBlocks: mathmlBlocks.length,
      uniqueFormulas: seen.size,
      renderer: 'KaTeX strict',
      ok: true,
    },
    null,
    2,
  ),
)
