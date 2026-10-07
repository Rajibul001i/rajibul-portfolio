// Layout regression: nothing spills sideways at any common screen width.
import { test, expect } from './fixtures.mjs';

const widths = [320, 360, 390, 414, 600, 768, 900, 1024, 1280, 1440, 1920];

for (const w of widths) {
  test(`no sideways scroll or clipped text at ${w}px, both themes`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 800 });
    await page.goto('/');
    for (const theme of ['dark', 'light']) {
      if (theme === 'light') await page.locator('#theme-btn').click();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `page wider than the screen in ${theme} theme`).toBeLessThanOrEqual(0);
      const wide = await page.evaluate(() => {
        const vw = window.innerWidth;
        return [...document.querySelectorAll('main *, header *, footer *')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (!r.width || el.closest('[aria-hidden="true"]')) return false;
            return r.right > vw + 1 || r.left < -1;
          })
          .map((el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''));
      });
      expect(wide, `elements poking out of the screen in ${theme} theme`).toEqual([]);
    }
  });
}

test('tap targets are at least 44px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  await page.waitForFunction(() => !document.querySelector('[data-rising]')); // measure at rest, not mid-rise
  for (const sel of ['#sky-btn', '#theme-btn', '#menu-btn', '.logo', '.sp-btn-solid', '.sp-btn-ghost', '.foot a']) {
    const box = await page.locator(sel).boundingBox();
    expect(Math.min(box.width, box.height), sel).toBeGreaterThanOrEqual(44);
  }
});

test('name and both buttons fit on the first screen of a phone, clear of the nav', async ({ page }) => {
  for (const [w, h] of [[320, 568], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    for (const sel of ['h1', '.sp-btn-solid', '.sp-btn-ghost']) await expect(page.locator(sel), `${sel} at ${w}px`).toBeInViewport({ ratio: 1 });
    const nav = await page.locator('header.nav').boundingBox();
    const status = await page.locator('.hero .status').boundingBox();
    expect(status.y, `the status line starts below the nav at ${w}px`).toBeGreaterThan(nav.y + nav.height);
  }
});

test('the nav fits on one line at every width: CTA from 1101 px, inline links from 901 px', async ({ page }) => {
  for (const w of [901, 1024, 1101, 1280, 1366, 1600, 1920]) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.goto('/');
    const r = await page.evaluate(() => {
      const nav = document.querySelector('header.nav').getBoundingClientRect();
      const kids = [...document.querySelectorAll('.sp-brand, .nav-links a, .nav-actions > *')].filter((el) => el.getBoundingClientRect().width);
      const outside = kids.filter((el) => { const b = el.getBoundingClientRect(); return b.left < nav.left || b.right > nav.right || b.top < nav.top || b.bottom > nav.bottom; });
      const links = [...document.querySelectorAll('.nav-links a')].map((a) => a.getBoundingClientRect());
      const brand = document.querySelector('.sp-brand').getBoundingClientRect();
      const actions = document.querySelector('.nav-actions').getBoundingClientRect();
      return { outside: outside.map((el) => el.textContent.trim() || el.id), oneRow: new Set(links.map((b) => Math.round(b.top))).size === 1,
        clear: links[0].left > brand.right && links.at(-1).right < actions.left, cta: !!document.querySelector('.sp-navcta').getBoundingClientRect().width };
    });
    expect(r.outside, `nothing spills out of the nav at ${w}px`).toEqual([]);
    expect(r.oneRow && r.clear, `links on one row, clear of the logo and buttons at ${w}px`).toBe(true);
    expect(r.cta, `"Say hello" shows at ${w}px`).toBe(w > 1100);
  }
});
