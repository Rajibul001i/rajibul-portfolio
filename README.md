# Md. Rajibul Islam Rabbi — Portfolio

Personal portfolio: about, work experience at Daraz, projects (PulseHR), skills, education and contact.

**Live:** https://rajibul001i.github.io/rajibul-portfolio/

## Structure

```
index.html            The whole site: markup, styles and a small script
assets/rabbi-cutout.webp  Portrait with the background removed (PNG fallback alongside)
assets/favicon.svg    Browser tab icon
assets/social-card.jpg  Preview image shown when the link is shared
assets/pulsehr-*.jpg  PulseHR screenshots
assets/pulsehr-demo.mp4  PulseHR walkthrough video (loads only when played)
```

No build step. Edit `index.html` and push to `main`; GitHub Pages publishes it.

## Features

- Animated starfield background (twinkling stars, parallax on scroll, constellation lines,
  shooting stars); pauses when the tab is hidden and stays still for reduced-motion users
- 3D portrait: the cut-out photo breaks out of a nebula disc with an orbiting planet, and
  tilts with the mouse (floats gently on touch screens)
- Dark theme by default, with a light theme toggle that remembers the choice
- Works on phones, with a menu button below 760 px
- Keyboard focus styles, a skip link, and reduced motion for visitors who ask for it
