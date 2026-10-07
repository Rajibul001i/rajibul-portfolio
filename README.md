# Md. Rajibul Islam Rabbi — Portfolio

Personal portfolio: about, work experience at Daraz, projects (PulseHR), skills, education and contact.

**Live:** https://rajibul001i.github.io/rajibul-portfolio/

## Structure

Each language does one job:

| File | Language | Job |
|---|---|---|
| `index.html` | HTML | Structure and content only. No inline styles or scripts |
| `css/style.css` | CSS | All styling: colour palette, the Spotlight nav and hero, layout, the 3D portrait card, light theme, phone layouts |
| `js/theme-init.js` | JavaScript | Applies the saved light/dark choice (and a paused background) before the page paints (loaded in `<head>`) |
| `js/main.js` | JavaScript | Theme toggle, background pause button, phone menu, reveal on scroll, highlighting the section in view, loading the islands |
| `js/rise.js` | JavaScript | The entry cascade: the nav, the name and the buttons spring up into place, 45 ms apart |
| `js/sunlight.js` | JavaScript | The light theme's animated background (canvas): sun, light rays and floating warm specks |
| `js/tilt.js` | JavaScript | 3D tilt of the portrait and the cards with the mouse, on springs |
| `js/vendor/motion.js` | JavaScript | [Motion](https://motion.dev) (MIT), loaded only on devices with a mouse. Refresh with `npm run vendor` after updating the package |
| `src/` | TypeScript + React + Tailwind + Three.js | React components (shadcn layout) and the dark theme's WebGL background, built into `islands/` |
| `islands/` | Built JavaScript + CSS | Output of `npm run build`. Committed, because GitHub Pages serves the repo as-is |

```
assets/rabbi-cutout.webp   Portrait with the background removed (PNG fallback alongside)
assets/favicon.svg         Browser tab icon
assets/social-card.jpg     Preview image shown when the link is shared
assets/pulsehr-dashboard.jpg  Poster frame for the PulseHR video
assets/pulsehr/*.webp      Eight PulseHR screens for the 3D carousel
assets/pulsehr-demo.mp4    PulseHR walkthrough video (loads only when played)
tests/                     Browser tests (Playwright) and the local test server
docs/TESTING.md            Test plan, results, and bugs found
```

The page itself has no build step: edit the files and push to `main`, and GitHub Pages
publishes them. The one exception is the React part (below), which you rebuild with
`npm run build` and commit along with the source.

## React components (shadcn, Tailwind, TypeScript)

The PulseHR screens carousel is a React component. It's a small "island" inside the
static page: `js/main.js` loads `islands/pulsehr-gallery.js` only when the Projects
section comes near, and until then (or without JavaScript) a plain grid of the same
screenshots shows.

```
components.json                         shadcn settings: aliases, Tailwind CSS file, icons (lucide)
tsconfig.json                           TypeScript, with the @/* → src/* alias shadcn expects
vite.config.ts                          builds the islands; `npm run demo` serves src/demos
src/components/ui/coverflow-carousel.tsx  the component (shadcn's components/ui folder)
src/lib/utils.ts                        cn(): clsx + tailwind-merge, used by every shadcn component
src/styles/islands.css                  Tailwind for the islands, mapped to the site's colours
src/islands/pulsehr-gallery.tsx         mounts the carousel into the page
src/islands/pulsehr-slides.ts           the eight PulseHR screens and their captions
src/islands/flow-wave.ts                the dark theme's background: Three.js (r143), no React
src/demos/                              the component's original demo (dev only, not published)
```

Why `src/components/ui`: shadcn components import each other and `cn()` through the
aliases in `components.json` (`@/components/ui`, `@/lib/utils`). Keeping every one of them
in that folder means a component added later with `npx shadcn@latest add <name>` lands next
to this one and its imports resolve without edits.

The dark theme's background is an island too, without React: `src/islands/flow-wave.ts`
(Three.js) builds into `islands/flow-wave.js`, which `js/main.js` loads after the page has
finished loading, and only while the dark theme is on. Until it fades in, or where WebGL
isn't available, the CSS background shows.

Two choices keep React from disturbing the rest of the page:

- No Tailwind reset. `src/styles/islands.css` imports only Tailwind's theme and the
  utilities used under `src/`, so `css/style.css` still styles everything else. A test
  checks that no Tailwind class name matches a class the page uses.
- shadcn's colour names (`background`, `foreground`, `muted`, `ring`) point at the site's
  own colour variables, so the carousel follows the dark/light switch.

```
npm run build   # rebuild islands/ after changing src/ (CI fails if islands/ is out of date)
npm run demo    # preview the component's original demo at http://localhost:5173
```

### Starting a new shadcn project instead

For a separate React app, the shadcn CLI sets all of this up in one go:

```
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install tailwindcss @tailwindcss/vite
# add tailwindcss() to vite.config.ts, the @/* path alias to tsconfig, and
# @import "tailwindcss"; to src/index.css
npx shadcn@latest init
npx shadcn@latest add <component>
```

## Features

- Dark theme background, "Flow Wave" (Three.js, WebGL): hills of glowing cyan points on deep
  blue that stream toward you. The camera dives toward the surface as you scroll down the page,
  the cursor parts the points around it, and a soft haze drifts above. Past the first screen the
  surface dims so the text over it stays easy to read. Stops when the tab is hidden, the theme
  is light or the pause button is pressed
- Light theme with its own sunny scene: a bright sun in the top corner below the nav, a warm
  glow, slow soft light rays across the page, a faint lens flare that shifts as the mouse moves,
  and specks of warm light floating upward at real depths, like dust in a sunbeam (close ones out
  of focus), flown through as you scroll
- Spotlight nav and hero: a floating glass pill nav (frosted white in the light theme) with a
  black "Say hello" button, the name as a two-line headline (Fraunces, then the Playwrite script)
  cut out of a white-to-transparent ramp (warm brown in the light theme), and pill buttons with
  an arrow disc. Every size is a design token, restated at 10 widths and 3 window heights, so it holds from
  320 px to 1920 px
- 3D portrait in About: the cut-out photo (from my GitHub profile) rises out of an arch-shaped
  card, and tilts with the mouse (floats gently on touch screens)
- Motion: on load the nav, the name and the buttons spring up into place one after another
  (press R to replay); sections stand up from a slight backward lean as they scroll into view; cards
  lean toward the mouse on springs, with a light that follows it. Content is never hidden while
  it moves, and visitors who turn on reduced motion get a still page
- Pause button for the moving background, remembered between visits
- Reading-progress line along the bottom of the nav
- Dark theme by default (cyan and orange on deep blue), with a sunny light theme (amber and
  teal on warm cream, warm brown text); the toggle remembers the choice
- Works on phones, with a menu button below 900 px
- Keyboard focus styles, a skip link, and reduced motion for visitors who ask for it
- Strict Content-Security-Policy: scripts and media load from this site only

## Tests

```
npm install
npx playwright install chromium
npm test
```

HTML validation, then 111 checks in a real browser on desktop and phone: structure,
visitor journey, layout at 11 screen widths, accessibility (axe-core, WCAG 2.1 AA, both themes),
and performance budgets. They run on every push through GitHub Actions. What is
checked, the results and the bugs they found are in [docs/TESTING.md](docs/TESTING.md). The
UI/UX review against UI UX Pro Max is in [docs/DESIGN-REVIEW.md](docs/DESIGN-REVIEW.md).

The tests need Node.js, but the site itself still has no build step.
