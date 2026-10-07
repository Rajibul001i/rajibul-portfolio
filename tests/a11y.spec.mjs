// Accessibility: axe-core scan (WCAG 2.1 AA) in both themes, plus keyboard use.
import { test, expect } from './fixtures.mjs';
import AxeBuilder from '@axe-core/playwright';

async function scan(page) {
  // Reveal everything first so axe checks the final colours, not mid-animation ones.
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in')));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(700);
  const { violations } = await new AxeBuilder({ page }).options({ preload: false }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
  return violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
}

test('no accessibility problems in the dark theme', async ({ page }) => {
  await page.goto('/');
  expect(await scan(page)).toEqual([]);
});

test('no accessibility problems in the light theme', async ({ page }) => {
  await page.goto('/');
  await page.locator('#theme-btn').click();
  expect(await scan(page)).toEqual([]);
});

test('no accessibility problems with the phone menu open', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone');
  await page.goto('/');
  await page.locator('#menu-btn').click();
  expect(await scan(page)).toEqual([]);
});

test('skip link is the first Tab stop and jumps to the content', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'no keyboard on a phone');
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test('every Tab stop shows a visible focus ring', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'no keyboard on a phone');
  await page.goto('/');
  const missing = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none';
      return { ring, name: el.tagName + ' ' + (el.getAttribute('href') || el.id || el.textContent.trim().slice(0, 20)) };
    });
    if (r && !r.ring) missing.push(r.name);
  }
  expect(missing).toEqual([]);
});

test('heading levels go in order', async ({ page }) => {
  await page.goto('/');
  const levels = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll((hs) => hs.map((h) => +h.tagName[1]));
  expect(levels[0]).toBe(1);
  expect(levels.filter((l) => l === 1)).toHaveLength(1);
  const jumps = levels.filter((l, i) => i && l > levels[i - 1] + 1);
  expect(jumps).toEqual([]);
});

test('with reduced motion the sky is still and nothing animates', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', baseURL });
  const page = await ctx.newPage();
  await page.route((url) => !url.href.startsWith(baseURL), (route) => route.abort());
  await page.goto('/');
  await page.waitForTimeout(300);
  const frame = () => page.locator('#sky').evaluate((c) => c.toDataURL());
  const a = await frame();
  await page.waitForTimeout(700);
  expect(await frame()).toBe(a);
  const moving = await page.evaluate(() => [...document.querySelectorAll('*')]
    .filter((el) => { const s = getComputedStyle(el); return s.animationName !== 'none' && s.animationPlayState === 'running' && parseFloat(s.animationDuration) > 0.01 && s.animationIterationCount === 'infinite'; })
    .map((el) => el.className));
  expect(moving).toEqual([]);
  // no entrance animation, no lean on scroll-in, no tilt under the mouse
  expect(await page.locator('.hero h1 .line').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  const card = page.locator('#skills .card').first();
  await card.scrollIntoViewIfNeeded();
  expect(await card.evaluate((el) => getComputedStyle(el).getPropertyValue('--rv-x'))).toBe('0deg');
  const box = await card.boundingBox();
  await page.mouse.move(box.x + box.width * 0.9, box.y + 5);
  await page.waitForTimeout(200);
  await expect(card).not.toHaveClass(/tilting/);
  await ctx.close();
});
