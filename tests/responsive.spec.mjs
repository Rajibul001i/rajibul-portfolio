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
  for (const sel of ['#sky-btn', '#theme-btn', '#menu-btn', '.logo', '.foot a']) {
    const box = await page.locator(sel).boundingBox();
    expect(Math.min(box.width, box.height), sel).toBeGreaterThanOrEqual(44);
  }
});

test('photo, name and buttons fit on the first screen of a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('h1')).toBeInViewport();
  await expect(page.locator('.hero .btn').first()).toBeInViewport();
});
