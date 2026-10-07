# Md. Rajibul Islam Rabbi — Portfolio

Personal portfolio: about, work experience at Daraz, projects (PulseHR), skills, education and contact.

**Live:** https://rajibul001i.github.io/rajibul-portfolio/

## Structure

Each language does one job:

| File | Language | Job |
|---|---|---|
| `index.html` | HTML | Structure and content only. No inline styles or scripts |
| `css/style.css` | CSS | All styling: colour palette, layout, the 3D portrait card, light theme, phone layouts |
| `js/theme-init.js` | JavaScript | Applies the saved light/dark choice before the page paints (loaded in `<head>`) |
| `js/main.js` | JavaScript | Theme toggle, phone menu, reveal on scroll, highlighting the section in view |
| `js/starfield.js` | JavaScript | The animated star background (canvas) |
| `js/portrait-tilt.js` | JavaScript | 3D tilt of the portrait with the mouse |

```
assets/rabbi-cutout.webp   Portrait with the background removed (PNG fallback alongside)
assets/favicon.svg         Browser tab icon
assets/social-card.jpg     Preview image shown when the link is shared
assets/pulsehr-*.jpg       PulseHR screenshots
assets/pulsehr-demo.mp4    PulseHR walkthrough video (loads only when played)
tests/                     Browser tests (Playwright) and the local test server
docs/TESTING.md            Test plan, results, and bugs found
```

No build step. Edit the files and push to `main`; GitHub Pages publishes them.

## Features

- Animated starfield background in the site's cyan and orange (twinkling stars, parallax on
  scroll, faint constellation lines, occasional shooting stars); pauses when the tab is hidden and stays still for reduced-motion users
- 3D portrait: the cut-out photo (from my GitHub profile) rises out of an arch-shaped card,
  and tilts with the mouse (floats gently on touch screens)
- Dark theme by default, with a light theme toggle that remembers the choice
- Works on phones, with a menu button below 760 px
- Keyboard focus styles, a skip link, and reduced motion for visitors who ask for it
- Strict Content-Security-Policy: scripts and media load from this site only

## Tests

```
npm install
npx playwright install chromium
npm test
```

HTML validation, then 71 checks in a real browser on desktop and phone: structure,
visitor journey, layout at 11 screen widths, accessibility (axe-core, WCAG 2.1 AA, both themes),
and performance budgets. They run on every push through GitHub Actions. What is
checked, the results and the bugs they found are in [docs/TESTING.md](docs/TESTING.md).

The tests need Node.js, but the site itself still has no build step.
