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
(`tests/server.mjs`), and runs 98 browser checks: 70 on a desktop screen (1366×800) and 28
on a phone (Pixel 7). `npm run validate` also type-checks the React code (`tsc`), and CI
rebuilds `islands/` and fails if the committed copy differs. Every browser test runs offline, and a test fails if the page logs a
JavaScript error, breaks the Content-Security-Policy, or requests a file that doesn't exist.

## What is checked

**Structure (20, run once)**
- HTML holds structure only: no `<style>`, no `style=""`, no inline scripts or `onclick=`
- Every local file the page refers to exists; every `#link` has a target; ids are unique
- The link-preview image is a real file in the repo
- Every image has alt text; every new-tab link has `rel="noopener"`
- A strict Content-Security-Policy is present (no `unsafe-inline` or `unsafe-eval`)
- Scripts never build HTML from strings (no `innerHTML`, `eval`)
- Icons are SVG, not emoji (emoji look different on every phone)
- The bundled copy of the Motion library is identical to the installed package
- The carousel's 8 screenshots exist; the island's Tailwind classes never match a class the
  page uses; the island CSS contains no Tailwind reset
- Regression: the old admin PIN, passwords, API keys and the fake visitor counter stay removed
- Page basics: language, title, description, viewport, favicon; the photo is not embedded in the HTML

**Visitor journey (20 per device)**
- Name, photo and every section load; the footer shows the current year
- Menu links scroll to their section and highlight it; the phone menu opens, closes with
  Escape and closes after a link is picked
- The theme switch changes the colours and is remembered after a reload
- The starfield is drawing
- The demo video is served correctly: range requests (206), `video/mp4`, index at the
  front of the file so it can start before it has fully downloaded
- Project and contact links point to the right places
- All content becomes visible after scrolling, and is visible with JavaScript turned off
- Cards lean toward the mouse in 3D and settle back when it leaves
- The hero's 3D entrance plays once and ends with everything fully in place
- The first screen has exactly one primary button, and it leads to contact
- The background animation can be paused, stays paused after a reload, and plays again
- Card tilt runs on springs from the Motion library
- PulseHR screens carousel: React loads only when Projects comes near and replaces the plain
  grid; arrows, arrow keys and dragging change the screen and the caption follows; it loops;
  all 8 screenshots load; it follows the light theme; without JavaScript the grid shows

**Layout (13)**
- No sideways scrolling and nothing poking out of the screen at 11 widths from 320 to
  1920 px, in both themes
- Header buttons, the logo and "Back to top" are at least 44 px to tap; name, photo and buttons fit on the first phone screen

**Accessibility (7 per device)**
- axe-core finds nothing in the dark theme, the light theme, with the phone menu open, or in
  the loaded carousel (both themes)
- The skip link is the first Tab stop; every Tab stop shows a focus ring
- Headings go in order (one `h1`, no skipped levels)
- With reduced motion turned on, the sky is still, nothing animates, there is no hero entrance,
  sections don't lean in, cards don't tilt, and the (pointless) pause button is hidden

**Performance (9)**
- First load stays under 600 KB, never downloads the 9 MB video, and doesn't load React
- The carousel costs under 400 KB (React, the component and 8 screenshots), loaded on approach
- The photo loads as WebP, not the heavier PNG
- DOM ready under 1.5 s, largest paint under 2.5 s, layout shift under 0.1
- Drawing the starfield takes under 4 ms a frame; on a 4x slower phone CPU while scrolling,
  frames still fit in 16 ms (60 fps)
- The sky stops drawing when the tab is hidden
- Phones never download the Motion library (it only drives the mouse tilt)

## Results

Run on 7 October 2026, Chromium 141 (Playwright 1.56.1), after adding the React carousel:

**89 passed, 9 skipped, 0 failed.** The skips are by design: phone-only checks skipped on desktop,
keyboard and mouse checks skipped on the phone, and video playback, which needs the H.264 codec that
Playwright's open-source Chromium leaves out. Chrome, Edge, Safari and Firefox all have it.

| Measurement | Result | Budget |
|---|---|---|
| First load, desktop (includes Motion, 144 KB) | 425 KB in 14 files | 600 KB |
| PulseHR carousel, loaded on approach | 338 KB in 10 files (React bundle 184 KB, 59 KB gzipped) | 400 KB |
| First load, phone (no Motion; screenshots below the fold not yet fetched) | 186 KB in 8 files | 600 KB |
| DOM ready | 118–167 ms | 1.5 s |
| Largest paint | 160–228 ms | 2.5 s |
| Layout shift | 0.000 | 0.1 |
| 3D starfield drawing (720 stars), normal CPU | avg 0.5 ms, p95 0.8 ms a frame | 4 ms avg |
| 3D starfield, 4x slower CPU + scrolling | avg 1.1 ms, p95 3.7 ms a frame | 10 ms avg, 16 ms p95 |

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
| P-9 | Layout test | The new pause button made the header 53 px too wide between 761 and 900 px | The header "Say hello" button hides below 900 px (the hero's main button leads to contact); checked every 7 px from 300 to 1100 px |
| P-10 | Reduced-motion test | The pause button stayed visible for reduced-motion visitors because `display: inline-grid` overrode the `hidden` attribute | `[hidden] { display: none !important }` |
| P-11 | Layout test | The phone menu's closed 3D pose was 1 px wider than the screen | Slight scale-down in the closed pose |
| P-12 | Demo check | The shadcn demo page rendered unstyled: its dev server only scanned `src/demos/` for Tailwind classes | `@source "../components"` in the demo CSS |
| P-8 | Layout test | The new 3D scroll reveal swung the bottom of the tall project card toward the viewer, making the page 1–6 px wider than a phone screen | Large blocks hinge on their bottom edge, so no part comes forward |

The colour changes are small shifts of the same teal and grey, so the theme looks the same.
