import { convertTexToMathml } from '../lib/tex-to-mathml.ts'

type Case = {
  name: string
  tex: string
  displayMode?: 'inline' | 'display'
  includes?: string[]
  returnsNull?: boolean
}

const cases: Case[] = [
  {
    name: 'subscripted greek identifier',
    tex: String.raw`\pi_0(X)`,
    includes: ['<math', '<msub>', '<mn>0</mn>'],
  },
  {
    name: 'fraction',
    tex: String.raw`\frac{a}{b}`,
    includes: ['<mfrac>', '<mi>a</mi>', '<mi>b</mi>'],
  },
  {
    name: 'display mode',
    tex: String.raw`x^2`,
    displayMode: 'display',
    includes: ['display="block"', '<msup>'],
  },
  {
    name: 'physics package command',
    tex: String.raw`\dv{x}{t}`,
    includes: ['<mfrac>', '<mi>x</mi>', '<mi>t</mi>'],
  },
  {
    name: 'unknown site macro is rejected',
    tex: String.raw`\definitelyUnknownMacro{x}`,
    returnsNull: true,
  },
]

for (const item of cases) {
  const mathml = convertTexToMathml(item.tex, item.displayMode || 'inline')

  if (item.returnsNull) {
    if (mathml !== null) {
      throw new Error(`${item.name}: expected null, got ${mathml}`)
    }
    continue
  }

  if (!mathml) {
    throw new Error(`${item.name}: expected MathML, got null`)
  }
  if (/<merror\b/i.test(mathml)) {
    throw new Error(`${item.name}: converter returned merror`)
  }

  for (const expected of item.includes || []) {
    if (!mathml.includes(expected)) {
      throw new Error(`${item.name}: expected MathML to include ${expected}`)
    }
  }
}

console.log(`verify-tex-to-mathml: ${cases.length} cases passed`)
