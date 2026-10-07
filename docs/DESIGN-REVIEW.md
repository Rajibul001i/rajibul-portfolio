# Design review: UI UX Pro Max

The site was checked against the rule set of
[UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (its 10 rule
categories in `quick-reference.md` and the pre-delivery checklist), on 7 October 2026.

Its design-system generator, given "developer portfolio dark space personal", suggested a
Brutalist style with a monochrome-and-blue palette and Archivo / Space Grotesk. That was not
applied: it would replace the site's own cyan-and-orange theme, which was kept on purpose.
The rules themselves were applied.

## Already passing (and covered by tests)

| Rule | How the site meets it |
|---|---|
| `color-contrast` | Every text colour is 4.5:1 or better in both themes (axe-core) |
| `focus-states`, `skip-links`, `heading-hierarchy`, `alt-text` | Tested in `a11y.spec.mjs` and `structure.spec.mjs` |
| `no-emoji-icons`, `icon-style-consistent` | SVG line icons only; a test blocks emoji |
| `image-optimization`, `image-dimension`, `lazy-load-below-fold` | WebP portrait, width/height on images, lazy thumbnails, the video loads only when played |
| `reduced-motion`, `parallax-subtle` | Still sky, no entrance, no lean, no tilt |
| `horizontal-scroll`, `viewport-meta` | No sideways scroll at any width from 300 to 1920 px |
| `main-thread-budget`, `debounce-throttle` | Starfield under 1 ms a frame; pointer and scroll work is batched per frame |
| `nav-state-active`, `heading-line-balance`, `long-token-wrapping` | Menu highlights the section in view; balanced headings; long email wraps |

## Fixed in this review

| Rule | Before | After |
|---|---|---|
| `primary-action` (one primary button per screen) | Two filled buttons on the first screen ("Say hello" and "See my journey") | "Get in touch" is the only filled button; "Say hello" is outlined |
| `touch-target-size` (44 px) | Theme button 40 px, "Back to top" 24 px | All 44 px; new pause button 44 px |
| `icon-style-consistent` (one stroke width) | Strokes of 2 and 1.8 | 1.8 everywhere |
| `press-feedback`, `scale-feedback` | No response on tap | Buttons and cards shrink slightly while pressed; the grey tap flash is removed |
| `tap-delay` | Default | `touch-action: manipulation` on links and buttons |
| `state-transition`, `exit-faster-than-enter` | Phone menu appeared and vanished instantly | Drops down in 3D in 0.3 s, closes in 0.14 s |
| `auto-rotation-controls` (moving content can be stopped, WCAG 2.2.2) | The starfield could only be stopped by the system reduced-motion setting | Pause button in the header, remembered between visits |
| `spring-physics`, `interruptible` | Card and portrait tilt eased on a fixed timer | Springs from the Motion library that keep momentum when the pointer changes direction |
| Scroll-story pattern: progress indicator | None | A thin cyan-to-orange reading-progress line along the header (browsers with scroll-driven animations) |

## Checked and not a problem

- `focus-not-obscured`: tabbing backwards through the page, only the video's top edge sat
  under the sticky header, and its focused control (the play bar at the bottom) stayed visible.
- Small label text (tags, captions at 13–14 px) is label text, not body text; body text is 16 px.
