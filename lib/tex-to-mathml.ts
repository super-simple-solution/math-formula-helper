import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js'
import { mathjax } from 'mathjax-full/js/mathjax.js'
import { SerializedMmlVisitor } from 'mathjax-full/js/core/MmlTree/SerializedMmlVisitor.js'
import { TeX } from 'mathjax-full/js/input/tex.js'
import 'mathjax-full/js/input/tex/boldsymbol/BoldsymbolConfiguration.js'
import 'mathjax-full/js/input/tex/cancel/CancelConfiguration.js'
import 'mathjax-full/js/input/tex/color/ColorConfiguration.js'
import 'mathjax-full/js/input/tex/configmacros/ConfigMacrosConfiguration.js'
import 'mathjax-full/js/input/tex/mathtools/MathtoolsConfiguration.js'
import 'mathjax-full/js/input/tex/mhchem/MhchemConfiguration.js'
import 'mathjax-full/js/input/tex/physics/PhysicsConfiguration.js'
import 'mathjax-full/js/input/tex/textcomp/TextCompConfiguration.js'
import 'mathjax-full/js/input/tex/textmacros/TextMacrosConfiguration.js'
import 'mathjax-full/js/input/tex/unicode/UnicodeConfiguration.js'
import 'mathjax-full/js/input/tex/upgreek/UpgreekConfiguration.js'
import type { LatexDisplayMode } from './latex-options'

type TexMathDocument = ReturnType<typeof mathjax.document>

let texDocument: TexMathDocument | null = null
let mmlVisitor: SerializedMmlVisitor | null = null

const texPackages = [
  'base',
  'ams',
  'autoload',
  'require',
  'newcommand',
  'boldsymbol',
  'cancel',
  'color',
  'configmacros',
  'mathtools',
  'mhchem',
  'physics',
  'textcomp',
  'textmacros',
  'unicode',
  'upgreek',
]

export function convertTexToMathml(
  texSource: string,
  displayMode: LatexDisplayMode = 'unknown',
) {
  const tex = unwrapTexDelimiters(texSource)
  if (!tex) return null

  try {
    const document = getTexDocument()
    const node = document.convert(tex, {
      display: displayMode === 'display',
    })
    const mathml = getMmlVisitor().visitTree(node)
    return /<merror\b/i.test(mathml) ? null : mathml
  } catch {
    return null
  }
}

function getTexDocument() {
  if (texDocument) return texDocument

  RegisterHTMLHandler(liteAdaptor())
  texDocument = mathjax.document('', {
    InputJax: new TeX({
      packages: texPackages,
    }),
  })
  return texDocument
}

function getMmlVisitor() {
  if (!mmlVisitor) mmlVisitor = new SerializedMmlVisitor()
  return mmlVisitor
}

function unwrapTexDelimiters(source: string) {
  let value = source.trim()
  if (!value) return ''

  const wrappers: Array<[RegExp, string]> = [
    [/^\\\(([\s\S]*)\\\)$/u, '$1'],
    [/^\\\[([\s\S]*)\\\]$/u, '$1'],
    [/^\$\$([\s\S]*)\$\$$/u, '$1'],
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
