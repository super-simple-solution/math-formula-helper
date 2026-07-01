#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'

const extensionDist = path.resolve(process.env.EXTENSION_DIST || 'dist/chrome-mv3')
const chromePath = process.env.CHROME_PATH || findChrome()
const keepProfile = process.env.KEEP_VERIFY_PROFILE === '1'
const userDataDir = path.join(os.tmpdir(), `math-formula-helper-selection-${Date.now()}`)
const expectedText = 'Before $x^{2}$ after.'
const expectedMathJaxSelectionText =
  'To any topological space $X$, one can associate the set $\\pi_{0} \\left(X\\right)$ of path components of $X$.'
const expectedMacroSourceText = '$A \\times B$'

if (!chromePath) fail('Chrome executable was not found. Set CHROME_PATH to the Chrome executable.')
if (!existsSync(extensionDist)) fail(`Extension build not found at ${extensionDist}. Run pnpm build first.`)

const server = createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname

  if (pathname === '/macro-source') {
    response.end(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>MathJax site macro fixture</title>
          <script>
            window.MathJax = {
              startup: {
                document: {
                  getMathItemsWithin(target) {
                    if (target?.id === 'macro-source-formula' || target?.querySelector?.('#macro-source-formula')) {
                      return [{ math: '\\\\siteMacro A B' }];
                    }
                    return [];
                  },
                },
              },
            };
          </script>
        </head>
        <body>
          <p>
            <span id="macro-source-formula" class="MathJax">
              <nobr aria-hidden="true">A × B</nobr>
              <span class="MJX_Assistive_MathML" role="presentation">
                <math xmlns="http://www.w3.org/1998/Math/MathML">
                  <mi>A</mi><mo>&#x00D7;</mo><mi>B</mi>
                </math>
              </span>
            </span>
          </p>
        </body>
      </html>`)
    return
  }

  if (pathname === '/mathjax-selection') {
    response.end(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>MathJax selection fixture</title>
        </head>
        <body>
          <p id="mathjax-sample">
            To any topological space
            <span class="MathJax" id="MathJax-Element-1-Frame">
              <nobr aria-hidden="true">X</nobr>
              <span class="MJX_Assistive_MathML" role="presentation">
                <math xmlns="http://www.w3.org/1998/Math/MathML">
                  <mi>X</mi>
                </math>
              </span>
            </span><script type="math/tex" id="MathJax-Element-1">X</script>,
            one can associate the set
            <span class="MathJax" id="MathJax-Element-2-Frame">
              <nobr aria-hidden="true">π0(X)</nobr>
              <span class="MJX_Assistive_MathML" role="presentation">
                <math xmlns="http://www.w3.org/1998/Math/MathML">
                  <msub><mi>π</mi><mn>0</mn></msub><mo>(</mo><mi>X</mi><mo>)</mo>
                </math>
              </span>
            </span><script type="math/tex" id="MathJax-Element-2">\\pi _0(X)</script>
            of path components of
            <span class="MathJax" id="MathJax-Element-3-Frame">
              <nobr aria-hidden="true">X</nobr>
              <span class="MJX_Assistive_MathML" role="presentation">
                <math xmlns="http://www.w3.org/1998/Math/MathML">
                  <mi>X</mi>
                </math>
              </span>
            </span><script type="math/tex" id="MathJax-Element-3">X</script>.
          </p>
        </body>
      </html>`)
    return
  }

  response.end(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Selection copy fixture</title>
      </head>
      <body>
        <p id="sample">
          Before
          <span class="katex">
            <span class="katex-mathml">
              <math>
                <semantics>
                  <mrow><msup><mi>x</mi><mn>2</mn></msup></mrow>
                  <annotation encoding="application/x-tex">x^2</annotation>
                </semantics>
              </math>
            </span>
            <span class="katex-html" aria-hidden="true">x2</span>
          </span>
          after.
        </p>
      </body>
    </html>`)
})

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
const targetUrl = `http://127.0.0.1:${port}/`

await mkdir(userDataDir, { recursive: true })

const chrome = spawn(
  chromePath,
  [
    `--user-data-dir=${userDataDir}`,
    '--remote-debugging-pipe',
    '--enable-unsafe-extension-debugging',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], windowsHide: true },
)

const cdp = createPipeTransport(chrome)

try {
  const version = await cdp.send('Browser.getVersion')
  const extension = await cdp.send('Extensions.loadUnpacked', { path: extensionDist })
  const target = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', {
    targetId: target.targetId,
    flatten: true,
  })

  await cdp.send('Target.activateTarget', { targetId: target.targetId })
  await cdp.send('Runtime.enable', {}, sessionId)
  await cdp.send('Page.enable', {}, sessionId)
  await cdp.send('Browser.grantPermissions', {
    origin: targetUrl,
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
  })
  await cdp.send('Page.navigate', { url: targetUrl }, sessionId)
  await waitForSelector(cdp, sessionId, '.katex')
  await sleep(1200)

  const sampleRect = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const sample = document.querySelector('#sample');
      sample.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = sample.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`,
  )
  await cdp.send(
    'Input.dispatchMouseEvent',
    { type: 'mouseMoved', x: sampleRect.x, y: sampleRect.y, button: 'none' },
    sessionId,
  )
  await cdp.send(
    'Input.dispatchMouseEvent',
    { type: 'mousePressed', x: sampleRect.x, y: sampleRect.y, button: 'left', clickCount: 1 },
    sessionId,
  )
  await cdp.send(
    'Input.dispatchMouseEvent',
    { type: 'mouseReleased', x: sampleRect.x, y: sampleRect.y, button: 'left', clickCount: 1 },
    sessionId,
  )

  const selectedText = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const sample = document.querySelector('#sample');
      const range = document.createRange();
      range.selectNodeContents(sample);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return selection.toString();
    })()`,
  )
  if (!selectedText.includes('Before') || !selectedText.includes('after.')) {
    throw new Error(`Could not select sample text: ${selectedText}`)
  }

  await cdp.send(
    'Input.dispatchKeyEvent',
    {
      type: 'rawKeyDown',
      key: 'c',
      code: 'KeyC',
      windowsVirtualKeyCode: 67,
      nativeVirtualKeyCode: 67,
      modifiers: 2,
    },
    sessionId,
  )
  await cdp.send(
    'Input.dispatchKeyEvent',
    {
      type: 'keyUp',
      key: 'c',
      code: 'KeyC',
      windowsVirtualKeyCode: 67,
      nativeVirtualKeyCode: 67,
      modifiers: 2,
    },
    sessionId,
  )
  await sleep(1200)

  const clipboardText = await evaluate(
    cdp,
    sessionId,
    `(async () => navigator.clipboard.readText())()`,
  )
  const normalizedClipboardText = clipboardText.replace(/\s+/g, ' ').trim()
  const report = {
    ok: normalizedClipboardText === expectedText,
    browser: version.product,
    extensionId: extension.id,
    targetUrl,
    clipboardText,
    normalizedClipboardText,
    expectedText,
  }

  console.log(JSON.stringify(report, null, 2))
  if (!report.ok) throw new Error('Selection copy clipboard text did not match expected output')

  const mathJaxSelectionUrl = `${targetUrl}mathjax-selection`
  await cdp.send('Page.navigate', { url: mathJaxSelectionUrl }, sessionId)
  await waitForSelector(cdp, sessionId, '#mathjax-sample')
  await sleep(1200)

  await evaluate(
    cdp,
    sessionId,
    `(() => {
      const sample = document.querySelector('#mathjax-sample');
      const range = document.createRange();
      range.selectNodeContents(sample);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    })()`,
  )
  await cdp.send(
    'Input.dispatchKeyEvent',
    {
      type: 'rawKeyDown',
      key: 'c',
      code: 'KeyC',
      windowsVirtualKeyCode: 67,
      nativeVirtualKeyCode: 67,
      modifiers: 2,
    },
    sessionId,
  )
  await cdp.send(
    'Input.dispatchKeyEvent',
    {
      type: 'keyUp',
      key: 'c',
      code: 'KeyC',
      windowsVirtualKeyCode: 67,
      nativeVirtualKeyCode: 67,
      modifiers: 2,
    },
    sessionId,
  )
  await sleep(1200)

  const mathJaxSelectionClipboardText = await evaluate(
    cdp,
    sessionId,
    `(async () => navigator.clipboard.readText())()`,
  )
  const normalizedMathJaxSelectionClipboardText = mathJaxSelectionClipboardText
    .replace(/\s+/g, ' ')
    .trim()
  const mathJaxSelectionReport = {
    ok: normalizedMathJaxSelectionClipboardText === expectedMathJaxSelectionText,
    targetUrl: mathJaxSelectionUrl,
    clipboardText: mathJaxSelectionClipboardText,
    normalizedClipboardText: normalizedMathJaxSelectionClipboardText,
    expectedText: expectedMathJaxSelectionText,
  }

  console.log(JSON.stringify(mathJaxSelectionReport, null, 2))
  if (!mathJaxSelectionReport.ok) {
    throw new Error('MathJax selection fixture leaked rendered/script text')
  }

  const macroSourceUrl = `${targetUrl}macro-source`
  await cdp.send('Page.navigate', { url: macroSourceUrl }, sessionId)
  await waitForSelector(cdp, sessionId, '#macro-source-formula')
  await sleep(1200)

  const macroSourceRect = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const formula = document.querySelector('#macro-source-formula');
      formula.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = formula.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`,
  )
  await cdp.send(
    'Input.dispatchMouseEvent',
    { type: 'mouseMoved', x: macroSourceRect.x, y: macroSourceRect.y, button: 'none' },
    sessionId,
  )
  await cdp.send(
    'Input.dispatchMouseEvent',
    {
      type: 'mousePressed',
      x: macroSourceRect.x,
      y: macroSourceRect.y,
      button: 'left',
      clickCount: 1,
    },
    sessionId,
  )
  await cdp.send(
    'Input.dispatchMouseEvent',
    {
      type: 'mouseReleased',
      x: macroSourceRect.x,
      y: macroSourceRect.y,
      button: 'left',
      clickCount: 1,
    },
    sessionId,
  )
  await sleep(1200)

  const macroSourceClipboardText = await evaluate(
    cdp,
    sessionId,
    `(async () => navigator.clipboard.readText())()`,
  )
  const macroSourceReport = {
    ok: macroSourceClipboardText === expectedMacroSourceText,
    targetUrl: macroSourceUrl,
    clipboardText: macroSourceClipboardText,
    expectedText: expectedMacroSourceText,
  }

  console.log(JSON.stringify(macroSourceReport, null, 2))
  if (!macroSourceReport.ok) {
    throw new Error('MathJax site macro fixture did not copy converted MathML output')
  }
} finally {
  server.close()
  await stopChrome(chrome)
  if (!keepProfile) {
    await removeDirectoryWithRetries(userDataDir)
  } else {
    console.error(`Kept verification profile: ${userDataDir}`)
  }
}

async function waitForSelector(cdp, sessionId, selector, timeout = 20000) {
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    const result = await evaluate(
      cdp,
      sessionId,
      `(() => ({
        readyState: document.readyState,
        count: document.querySelectorAll(${JSON.stringify(selector)}).length,
      }))()`,
      5000,
    )
    if (result.count > 0) return result
    await sleep(250)
  }

  throw new Error(`No elements found for selector ${selector}`)
}

async function evaluate(cdp, sessionId, expression, timeout = 45000) {
  const result = await cdp.send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true, timeout },
    sessionId,
    timeout + 5000,
  )
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.text ||
        result.exceptionDetails.exception?.description ||
        'Runtime exception',
    )
  }
  return result.result.value
}

async function stopChrome(child) {
  if (child.exitCode !== null || child.signalCode) return

  child.kill()
  await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(3000)])
}

async function removeDirectoryWithRetries(dir) {
  let lastError

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      await rm(dir, { recursive: true, force: true })
      return
    } catch (error) {
      lastError = error
      await sleep(250 * attempt)
    }
  }

  console.error(
    `Warning: could not remove temporary profile ${dir}: ${lastError?.message || lastError}`,
  )
}

function createPipeTransport(child) {
  const pending = new Map()
  let nextId = 0
  let buffer = Buffer.alloc(0)

  child.stderr.on('data', () => {})

  child.stdio[4].on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk])
    while (true) {
      const end = buffer.indexOf(0)
      if (end === -1) break
      const text = buffer.slice(0, end).toString('utf8')
      buffer = buffer.slice(end + 1)
      if (!text) continue

      const message = JSON.parse(text)
      if (message.id && pending.has(message.id)) {
        const { resolve, reject, timer } = pending.get(message.id)
        clearTimeout(timer)
        pending.delete(message.id)
        if (message.error) {
          reject(new Error(`${message.error.code}: ${message.error.message}`))
        } else {
          resolve(message.result)
        }
      }
    }
  })

  return {
    send(method, params, sessionId, timeout) {
      return new Promise((resolve, reject) => {
        const id = ++nextId
        const finalParams = params ?? {}
        const finalTimeout = timeout ?? 45000
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error(`Timeout while waiting for ${method}`))
        }, finalTimeout)
        pending.set(id, { resolve, reject, timer })
        const message = sessionId
          ? { id, method, params: finalParams, sessionId }
          : { id, method, params: finalParams }
        child.stdio[3].write(`${JSON.stringify(message)}\0`)
      })
    },
  }
}

function findChrome() {
  const candidates =
    process.platform === 'win32'
      ? [
          path.join(process.env.PROGRAMFILES || '', 'Google/Chrome/Application/chrome.exe'),
          path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google/Chrome/Application/chrome.exe'),
          path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
        ]
      : process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
        : [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
          ]

  return candidates.find((candidate) => candidate && existsSync(candidate))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
