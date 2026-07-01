const defaultSites = [
  ['arXiv HTML', 'https://arxiv.org/html/2408.07081v3'],
  ['ar5iv', 'https://ar5iv.labs.arxiv.org/html/1304.5475'],
  ['PMC', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4211654/'],
  ['eLife', 'https://elifesciences.org/articles/105065'],
  [
    'PLOS Comp Bio',
    'https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005177',
  ],
  ['Frontiers', 'https://www.frontiersin.org/journals/applied-mathematics-and-statistics/articles/10.3389/fams.2023.1160250/full'],
  ['Stacks', 'https://stacks.math.columbia.edu/tag/00UH'],
  ['nLab', 'https://ncatlab.org/nlab/show/homology'],
  ['KaTeX docs', 'https://katex.org/docs/supported'],
  ['Distill', 'https://distill.pub/2017/ctc/'],
  ['Jupyter Book', 'https://jupyterbook.org/en/stable/content/math.html'],
  ['Quarto', 'https://quarto.org/docs/authoring/markdown-basics.html#equations'],
  ['Kerodon', 'https://kerodon.net/tag/0001'],
  ['PMLR', 'https://proceedings.mlr.press/v119/chen20j.html'],
  ['Quantum Journal', 'https://quantum-journal.org/papers/q-2020-02-06-226/'],
  ['AIMS Press', 'https://www.aimspress.com/article/doi/10.3934/math.20241360'],
  ['Royal Society', 'https://royalsocietypublishing.org/doi/full/10.1098/rsta.2024.0356'],
  ['ProofWiki', 'https://proofwiki.org/wiki/Definition%3AEuler-Lagrange_Equation'],
  ['Math StackExchange', 'https://math.stackexchange.com/questions/1434/what-is-the-euler-lagrange-equation'],
  ['SciPost', 'https://scipost.org/SciPostPhys.14.5.102'],
]

const patterns = {
  katex: /class=["'][^"']*katex/g,
  katexHtml: /katex-html/g,
  katexMathml: /katex-mathml/g,
  annotation: /<annotation\b/gi,
  mathTag: /<math\b/gi,
  mathTexScript: /type=["'][^"']*math\/tex/gi,
  mjxContainer: /<mjx-container\b/gi,
  mathJax: /MathJax/g,
  dataMath: /data-(?:math|tex|latex)=/gi,
  latexMarkers: /\\\(|\\\)|\\\[|\\\]|\$\$/g,
}

const cliSites = process.argv
  .slice(2)
  .filter((url) => url !== '--')
  .map((url, index) => [`custom-${index + 1}`, url])
const sites = cliSites.length ? cliSites : defaultSites
const rows = []

for (const [name, url] of sites) {
  rows.push(await probeSite(name, url))
}

printTable(rows)

async function probeSite(name, url) {
  let response
  let html = ''

  try {
    response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 formula-source-probe',
      },
    })
    html = await response.text()
  } catch (error) {
    return {
      name,
      url,
      status: 'ERR',
      kind: 'network-error',
      title: String(error).slice(0, 70),
      counts: emptyCounts(),
    }
  }

  const counts = Object.fromEntries(
    Object.entries(patterns).map(([key, pattern]) => [key, (html.match(pattern) || []).length]),
  )
  const title = decodeHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 70)

  return {
    name,
    url,
    status: response.status,
    kind: classify(response.status, title, counts, html),
    title,
    counts,
  }
}

function classify(status, title, counts, html) {
  const protectedSignals = /just a moment|verifying your browser|not a bot|captcha|access denied/i
  if (status === 403 || protectedSignals.test(title) || protectedSignals.test(html.slice(0, 5000))) {
    return 'protected'
  }

  if (counts.katexMathml > 0 && counts.annotation > 0) return 'katex-annotation'
  if (counts.mathTexScript > 0) return 'math-tex-script'
  if (counts.annotation > 0 || counts.mathTag > 0) return 'mathml'
  if (counts.dataMath > 0) return 'data-source'
  if (counts.katexHtml > 0) return 'katex-html-only'
  if (counts.mathJax > 0 || counts.mjxContainer > 0 || counts.latexMarkers > 0) {
    return 'runtime-likely'
  }

  return 'unknown'
}

function printTable(items) {
  console.log('| Site | Kind | Status | Title | Source Signals | URL |')
  console.log('| --- | --- | ---: | --- | --- | --- |')

  for (const item of items) {
    const signals = Object.entries(item.counts)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `${key}:${value}`)
      .join(', ')
    console.log(
      `| ${escapeCell(item.name)} | ${item.kind} | ${item.status} | ${escapeCell(item.title || '-')} | ${escapeCell(signals || '-')} | ${item.url} |`,
    )
  }
}

function emptyCounts() {
  return Object.fromEntries(Object.keys(patterns).map((key) => [key, 0]))
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
}

function escapeCell(value) {
  return String(value).replaceAll('|', '\\|')
}
