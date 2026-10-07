# Testing

The portfolio uses the same kinds of testing as the PulseHR project, adjusted for a static
site that has no server or database:

| PulseHR | Portfolio equivalent | Where |
|---|---|---|
| Unit tests (vitest) | HTML validation, JS syntax check, source checks | `npm run validate`, `tests/structure.spec.mjs` |
| Smoke test (`smoke.mjs`) | End-to-end visitor journey in a real browser | `tests/smoke.spec.mjs` |
| Regression checks (`bughunt.mjs`) | One check per bug fixed in the past, so it can't come back | `tests/structure.spec.mjs`, `tests/responsive.spec.mjs` |
| Load test | Page weight, load timing, layout shift, drawing cost under a 4x slower CPU | `tests/performance.spec.mjs` |
| Accessibility checks | axe-core (WCAG 2.1 AA) in both themes and on a phone, keyboard use, reduced motion | `tests/a11y.spec.mjs` |
| CI on every change | GitHub Actions on every push to `main` and every pull request | `.github/workflows/test.yml` |

## Running the tests

```
npm install
npx playwright install chromium   # once
npm test
```

`npm test` validates the HTML and JavaScript, starts a small local server
(`tests/server.mjs`), and runs 71 browser checks: 53 on a desktop screen (1366×800) and 18
on a phone (Pixel 7). Every browser test runs offline, and a test fails if the page logs a
JavaScript error, breaks the Content-Security-Policy, or requests a file that doesn't exist.

## What is checked

**Structure (15, run once)**
- HTML holds structure only: no `<style>`, no `style=""`, no inline scripts or `onclick=`
- Every local file the page refers to exists; every `#link` has a target; ids are unique
- The link-preview image is a real file in the repo
- Every image has alt text; every new-tab link has `rel="noopener"`
- A strict Content-Security-Policy is present (no `unsafe-inline` or `unsafe-eval`)
- Scripts never build HTML from strings (no `innerHTML`, `eval`)
- Regression: the old admin PIN, passwords, API keys and the fake visitor counter stay removed
- Page basics: language, title, description, viewport, favicon; the photo is not embedded in the HTML

**Visitor journey (11 per device)**
- Name, photo and every section load; the footer shows the current year
- Menu links scroll to their section and highlight it; the phone menu opens, closes with
  Escape and closes after a link is picked
- The theme switch changes the colours and is remembered after a reload
- The starfield is drawing
- The demo video is served correctly: range requests (206), `video/mp4`, index at the
  front of the file so it can start before it has fully downloaded
- Project and contact links point to the right places
- All content becomes visible after scrolling, and is visible with JavaScript turned off

**Layout (13)**
- No sideways scrolling and nothing poking out of the screen at 11 widths from 320 to
  1920 px, in both themes
- Header buttons are at least 40 px to tap; name, photo and buttons fit on the first phone screen

**Accessibility (7 per device)**
- axe-core finds nothing in the dark theme, the light theme, or with the phone menu open
- The skip link is the first Tab stop; every Tab stop shows a focus ring
- Headings go in order (one `h1`, no skipped levels)
- With reduced motion turned on, the sky is still and nothing animates

**Performance (7)**
- First load stays under 600 KB and never downloads the 9 MB video
- The photo loads as WebP, not the heavier PNG
- DOM ready under 1.5 s, largest paint under 2.5 s, layout shift under 0.1
- Drawing the starfield takes under 4 ms a frame; on a 4x slower phone CPU while scrolling,
  frames still fit in 16 ms (60 fps)
- The sky stops drawing when the tab is hidden

## Results

Run on 7 October 2026, Chromium 141 (Playwright 1.56.1), three runs in a row:

**64 passed, 7 skipped, 0 failed.** The skips are by design: phone-only checks skipped on desktop,
keyboard checks skipped on the phone, and video playback, which needs the H.264 codec that
Playwright's open-source Chromium leaves out. Chrome, Edge, Safari and Firefox all have it.

| Measurement | Result | Budget |
|---|---|---|
| First load | 273 KB in 10 files | 600 KB |
| DOM ready | 121–167 ms | 1.5 s |
| Largest paint | 160–228 ms | 2.5 s |
| Layout shift | 0.000 | 0.1 |
| Starfield drawing, normal CPU | avg 0.6 ms, p95 1.2 ms a frame | 4 ms avg |
| Starfield drawing, 4x slower CPU + scrolling | avg 1.2 ms, p95 3.7 ms a frame | 10 ms avg, 16 ms p95 |

## Bugs the tests found, and the fixes

| # | Found by | Problem | Fix |
|---|---|---|---|
| P-1 | HTML validator | `aria-label` on plain `<div>`s (stats, strengths) is ignored by screen readers | Added `role="group"` |
| P-2 | HTML validator | Phone numbers could break across two lines at the space or hyphen | Non-breaking space and hyphen |
| P-3 | axe (dark) | Small grey text (video note, footer) was 3.9:1 contrast, below the 4.5:1 minimum | `--faint` lightened to `#5E928D` (4.9:1) |
| P-4 | axe (light) | Teal buttons and section labels were 3.8–4.3:1 | Light accent darkened to `#007A6E` (4.6–5.2:1), light `--faint` to `#4A706C` |
| P-5 | Keyboard test | No focus ring while tabbing through the video's controls | Focus ring on the video while its controls have focus |
| P-6 | Tap-target test | The "Rabbi." logo link was 36 px tall | 44 px tap height |
| P-7 | Security review | No Content-Security-Policy | Strict CSP added (scripts and media from the site only; fonts from Google Fonts only), plus a referrer policy |

The colour changes are small shifts of the same teal and grey, so the theme looks the same.
