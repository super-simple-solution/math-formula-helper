#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const DEFAULT_URL = 'https://opg.optica.org/optica/fulltext.cfm?uri=optica-5-12-1623'
const DEFAULT_SELECTOR = 'mjx-container.MathJax'

const targetUrl = process.env.VERIFY_URL || DEFAULT_URL
const formulaSelector = process.env.FORMULA_SELECTOR || DEFAULT_SELECTOR
const extensionDist = path.resolve(process.env.EXTENSION_DIST || 'dist/chrome-mv3')
const chromePath = process.env.CHROME_PATH || findChrome()
const keepProfile = process.env.KEEP_VERIFY_PROFILE === '1'
const userDataDir = path.join(os.tmpdir(), `math-formula-helper-verify-${Date.now()}`)

if (!chromePath) {
  fail('Chrome executable was not found. Set CHROME_PATH to the Chrome executable.')
}

if (!existsSync(extensionDist)) {
  fail(`Extension build not found at ${extensionDist}. Run pnpm build first.`)
}

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

  await cdp.send('Runtime.enable', {}, sessionId)
  await cdp.send('Page.enable', {}, sessionId)
  await cdp.send('Log.enable', {}, sessionId)
  await cdp.send('Page.navigate', { url: targetUrl }, sessionId)

  const ready = await waitForFormula(cdp, sessionId, formulaSelector)

  await sleep(1500)
  const eventStart = cdp.events.length

  const clickTarget = await evaluate(
    cdp,
    sessionId,
    `(async () => {
      const selector = ${JSON.stringify(formulaSelector)};
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const text = (el.textContent || '').slice(0, 300);
        const style = getComputedStyle(el);
        if (
          (style.position === 'fixed' || style.position === 'sticky') &&
          /remember your preferences|Functional Cookies|cookies/i.test(text)
        ) {
          el.style.setProperty('display', 'none', 'important');
        }
      }
      const el = document.querySelector(selector);
      if (!el) return { ok: false, reason: 'formula not found' };
      el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const pointTarget = document.elementFromPoint(x, y);
      return {
        ok: true,
        idBefore: el.id || '',
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        pointTarget: pointTarget
          ? { tag: pointTarget.tagName, closestFormula: !!pointTarget.closest?.(selector) }
          : null,
      };
    })()`,
  )

  if (!clickTarget.ok) {
    throw new Error(clickTarget.reason || 'Could not prepare click target')
  }

  const x = clickTarget.rect.left + clickTarget.rect.width / 2
  const y = clickTarget.rect.top + clickTarget.rect.height / 2
  await cdp.send(
    'Input.dispatchMouseEvent',
    { type: 'mouseMoved', x, y, button: 'none' },
    sessionId,
  )
  await sleep(250)
  await cdp.send(
    'Input.dispatchMouseEvent',
    { type: 'mousePressed', x, y, button: 'left', clickCount: 1 },
    sessionId,
  )
  await cdp.send(
    'Input.dispatchMouseEvent',
    { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 },
    sessionId,
  )
  await sleep(2000)

  const result = await evaluate(
    cdp,
    sessionId,
    `(async () => {
      const selector = ${JSON.stringify(formulaSelector)};
      const el = document.querySelector(selector);
      let clipboardText = '';
      let clipboardError = '';
      try {
        clipboardText = await Promise.race([
          navigator.clipboard.readText(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('clipboard read timed out')), 1500),
          ),
        ]);
      } catch (error) {
        clipboardError = error?.message || String(error);
      }
      return {
        idAfter: el?.id || '',
        copiedClass: !!el?.classList.contains('sss-copied'),
        anyCopiedClass: !!document.querySelector('.sss-copied'),
        copiedElementCount: document.querySelectorAll('.sss-copied').length,
        toastText: document.querySelector('.toastify')?.textContent || '',
        clipboardText,
        clipboardError,
        afterBg: el ? getComputedStyle(el, '::after').backgroundImage.slice(0, 80) : '',
      };
    })()`,
  )

  const events = cdp.events.slice(eventStart).map(formatEvent)
  const ok =
    result.copiedClass ||
    result.anyCopiedClass ||
    (result.toastText.includes('Copied') && !!result.clipboardText)

  const report = {
    ok,
    browser: version.product,
    extensionId: extension.id,
    targetUrl,
    formulaSelector,
    ready,
    clickTarget,
    result,
    events,
  }

  console.log(JSON.stringify(report, null, 2))

  if (!ok) {
    throw new Error('Formula click did not reach the copied state')
  }
} finally {
  await stopChrome(chrome)
  if (!keepProfile) {
    await removeDirectoryWithRetries(userDataDir)
  } else {
    console.error(`Kept verification profile: ${userDataDir}`)
  }
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
  const events = []
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
      } else {
        events.push(message)
      }
    }
  })

  return {
    events,
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

async function waitForFormula(cdp, sessionId, selector, timeout = 70000) {
  const deadline = Date.now() + timeout
  let lastError

  while (Date.now() < deadline) {
    try {
      const state = await evaluate(
        cdp,
        sessionId,
        `(() => {
          const selector = ${JSON.stringify(selector)};
          const el = document.querySelector(selector);
          return {
            href: location.href,
            readyState: document.readyState,
            formulaCount: document.querySelectorAll(selector).length,
            inlineFormulaCount: document.querySelectorAll('.inline-formula').length,
            hasMathJax: !!window.MathJax,
            styleProbe: el
              ? {
                  cursor: getComputedStyle(el).cursor,
                  afterContent: getComputedStyle(el, '::after').content,
                  afterBg: getComputedStyle(el, '::after').backgroundImage.slice(0, 80),
                }
              : null,
          };
        })()`,
        5000,
      )

      if (state.formulaCount > 0) return state
    } catch (error) {
      lastError = error
    }

    await sleep(500)
  }

  throw new Error(
    `No formulas found for selector ${selector}${lastError ? `; last error: ${lastError.message}` : ''}`,
  )
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

function formatEvent(event) {
  if (event.method === 'Runtime.exceptionThrown') {
    return {
      method: event.method,
      text: event.params?.exceptionDetails?.text,
      description: event.params?.exceptionDetails?.exception?.description,
    }
  }
  if (event.method === 'Runtime.consoleAPICalled') {
    return {
      method: event.method,
      type: event.params?.type,
      args: event.params?.args?.map((arg) => arg.value || arg.description),
    }
  }
  if (event.method === 'Log.entryAdded') {
    return {
      method: event.method,
      level: event.params?.entry?.level,
      text: event.params?.entry?.text,
      source: event.params?.entry?.source,
    }
  }
  return { method: event.method }
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
