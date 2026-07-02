# Extension Verification Notes

This project is a Chrome extension, so formula-copy bugs need browser-level checks. A DOM-only unit test is not enough: the click path crosses a content script, the background service worker, the Clipboard API, MathJax/KaTeX page globals, and site CSP.

## What Happened On Optica

Target page:

https://opg.optica.org/optica/fulltext.cfm?uri=optica-5-12-1623

Observed symptom: formulas showed the hover affordance, but clicking did not copy.

Useful findings:

1. The page renders 102 `mjx-container.MathJax` nodes and 71 `.inline-formula` wrappers.
2. The final rendered DOM does not keep plain `<math>` nodes; MathJax replaces them with SVG output.
3. The original MathML is still available from the page MAIN world through `window.MathJax.startup.document.getMathItemsWithin(el)`.
4. Converting the static MathML samples with `mathml-to-latex` works, so the failure was not the MathML converter.
5. Inline script injection is unsafe on this site because Optica has a restrictive CSP.
6. Hover/green state alone is not a valid pass signal. It can come from CSS while click/copy logic is still broken.

The fix is to ask the background script to run `chrome.scripting.executeScript({ world: 'MAIN' })` in the sender frame and return the MathJax source. That keeps page-global access while avoiding inline script injection.

## Chrome Loading Trap

Do not rely on this for local automated verification:

```sh
chrome --load-extension=dist/chrome-mv3
```

Chrome 137+ removed support for this workflow in regular Chrome builds. A browser can open and still not actually register the extension or inject content scripts. This caused a long false trail during debugging.

Reliable options:

1. Use `pnpm dev` for manual verification. WXT launches Chrome through the supported web-ext/pipe flow.
2. Use the scripted verifier below. It starts Chrome with `--remote-debugging-pipe`, loads the unpacked extension via the CDP `Extensions.loadUnpacked` command, then opens the target page.

Chrome reference: https://developer.chrome.com/blog/extension-news-june-2025

## Local Regression Scripts

These checks do not require a real protected website:

```sh
pnpm verify:normalization
pnpm verify:tex-to-mathml
pnpm verify:mathml-local
pnpm verify:selection-copy
```

`verify:normalization` exercises the LaTeX formatting pipeline, including output profiles, tag handling, environment handling, redundant-brace cleanup, and Word Native clipboard payload generation. Several cases also pass the result through KaTeX. Word Native payload checks confirm `text/html` MathML is generated, but real Microsoft Word paste behavior still needs manual verification.

`verify:tex-to-mathml` exercises the extension-owned TeX-to-MathML fallback. It uses bundled MathJax to convert common TeX, display math, and a few loaded extension packages, and it verifies that unknown macros are rejected instead of being copied as MathML error nodes.

`verify:mathml-local` reads a saved MathML fixture, converts preserved MathML through `mathml-to-latex`, formats it with the KaTeX output profile, and renders each unique formula through strict KaTeX. It first checks that KaTeX really throws for an invalid command, so this catches renderer setup problems as well as formula cleanup regressions. Set `MATHML_FIXTURE=path/to/page.htm` to use another saved page.

`verify:selection-copy` builds the extension, serves local fixtures over `127.0.0.1`, loads the unpacked extension through CDP, selects text containing formulas, sends real copy/click events, and verifies the clipboard text. It covers KaTeX annotations, KaTeX HTML-only fallback, display-mode Auto delimiters, MathJax selection cleanup, and MathJax raw-source fallback. This is a local copy-chain check, not a full real-website regression.

Word Native has several source paths that need separate checks. Pages with preserved DOM MathML or KaTeX MathML can write that MathML directly. MathJax 3/4 pages may expose `tex2mml`, `toMathML`, or `startup.document` APIs from MAIN world. MathJax v2 pages such as Kerodon may keep only a runtime MML tree and no assistive MathML in the DOM; those rely on the MAIN-world MathJax v2 serializer before the clipboard payload can include `text/html` MathML. If only TeX is available, the extension asks the page MathJax runtime to convert it first so site macros can be honored, then falls back to bundled MathJax in the background service worker. Unknown macros in the bundled fallback are rejected, not copied as `<merror>`.

For a quick source-structure survey across formula-heavy sites:

```sh
pnpm probe:formula-sites
```

The probe fetches HTML and classifies visible source signals such as KaTeX annotations, MathML, `math/tex` scripts, data attributes, HTML-only KaTeX, runtime-likely MathJax, or protected pages. It is intentionally a structure probe, not proof that clicking and clipboard writes work on the live page.

## Automated Optica Regression

Run:

```sh
pnpm verify:optica
```

What it does:

1. Builds the extension into `dist/chrome-mv3`.
2. Starts a temporary Chrome profile outside the repository.
3. Loads the unpacked extension with `Extensions.loadUnpacked`.
4. Navigates to the Optica target page.
5. Waits for `mjx-container.MathJax` nodes.
6. Simulates a real mouse hover/click on the first formula.
7. Passes only if the formula gets `sss-copied` and the page shows the `Copied` toast.

Useful environment variables:

```sh
CHROME_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" pnpm verify:optica
EXTENSION_DIST=dist/chrome-mv3 pnpm verify:optica
VERIFY_URL="https://opg.optica.org/optica/fulltext.cfm?uri=optica-5-12-1623" pnpm verify:optica
FORMULA_SELECTOR="mjx-container.MathJax" pnpm verify:optica
KEEP_VERIFY_PROFILE=1 pnpm verify:optica
```

`KEEP_VERIFY_PROFILE=1` leaves the temporary Chrome user-data directory in place for inspection after a failure.

## Manual Verification Checklist

Use the browser opened by `pnpm dev`.

For each site:

1. Open the target page and wait for formulas to finish rendering.
2. Hover a formula and confirm the copy affordance appears.
3. Click the formula and confirm the `Copied` toast appears.
4. Paste somewhere plain-text and confirm the copied source is usable.
5. Try at least one inline formula and one display formula when the page has both.
6. Select a paragraph containing text plus formulas and copy it; confirm ordinary text is preserved and formulas are replaced by source.
7. Use Shift+Up full-page overlay mode on a formula-dense page, then Esc to exit and confirm overlays are removed.

Known good spot checks after this pass:

- nLab: manually verified by Rin.
- DLMF `https://dlmf.nist.gov/5.12`: manually verified by Rin.
- Optica target above: automated click verifier passes.

## Local SingleFile Pages

Saved pages are useful for structure analysis, but they are not the same as the live page:

1. Chrome extensions do not inject into `file://` pages unless the extension has "Allow access to file URLs" enabled. Prefer serving the saved file over localhost, for example `http://127.0.0.1:4177/docs/hom.htm`.
2. SingleFile may remove hidden semantic math nodes such as KaTeX MathML annotations. If `.katex-mathml`, `<annotation encoding="application/x-tex">`, `<math>`, and `data-math` are all absent, the original TeX is not preserved in the saved HTML.
3. SingleFile usually keeps `link rel="canonical"` and a source URL comment. Site-specific rules should consider canonical hosts, not only `location.hostname`, because local saved pages otherwise look like `localhost` or an empty `file://` host.
4. For Banana Space saved pages, the fallback is to reconstruct LaTeX from KaTeX HTML structure. This is weaker than a real source object but recovers common constructs such as subscripts, `\mathbb{...}`, large spaces, and ellipses.

## Site Macro Source

Some sites expose raw MathJax TeX that depends on site-specific macros. ProofWiki is one example: commands such as `\R`, `\ds`, `\map`, and `\rd` are faithful to that site but not portable to ordinary KaTeX or MathJax environments.

When a page exposes MathJax assistive MathML and the raw TeX contains unknown macros, prefer converting that MathML to portable LaTeX for normal copy output. `verify:mathml-local` covers the saved-page conversion path, and `verify:selection-copy` includes a small macro-source click fixture to ensure the content rule chooses MathML over non-portable raw TeX.

## Lessons From This Debug Session

- First prove whether the formula source exists in page data before changing copy logic.
- For MathJax 3 SVG output, look at `window.MathJax.startup.document.getMathItemsWithin(el)` from MAIN world.
- If a site has strict CSP, avoid inline `<script>` injection.
- If a Chrome automation run has no extension isolated world or no extension entry in profile preferences, the extension is not actually loaded.
- Keep temporary Chrome profiles outside the repository. Vite can try to watch profile cache files and fail with `EBUSY`.
- Treat hover styling, copied class, toast, and pasted text as separate signals. Hover styling can be pure CSS; `sss-copied` is only added after the copy promise resolves. Automated checks should report copied class, toast, and clipboard text when available; manual checks should still inspect pasted text.
