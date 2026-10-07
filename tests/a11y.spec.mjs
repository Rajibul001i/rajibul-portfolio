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

test('no accessibility problems in the PulseHR screens carousel, in both themes', async ({ page }) => {
  await page.goto('/');
  await page.locator('.screens').scrollIntoViewIfNeeded();
  await expect(page.getByRole('region', { name: 'PulseHR screens' })).toBeVisible();
  await page.waitForTimeout(600);
  expect(await scan(page)).toEqual([]);
  await page.locator('#theme-btn').click();
  expect(await scan(page)).toEqual([]);
});

// axe can't judge text cut out of a gradient, so this works it out. The name fades toward
// its right end; even the ramp's faintest point (the edge of the box, which no letter
// reaches, so this holds in any font) must reach 3:1, the large-text minimum, in both themes.
test('the fading name keeps every letter at 3:1 contrast or better', async ({ page }) => {
  await page.goto('/');
  const ratios = () => page.evaluate(() => {
    const lum = (rgb) => {
      const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
    };
    const bg = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g).map(Number);
    return [...document.querySelectorAll('.sp-h1, .sp-h2')].map((el) => {
      const [faint] = [...getComputedStyle(el).backgroundImage.matchAll(/rgba?\(([^)]+)\)/g)].map((m) => m[1].split(',').map(Number));
      const a = faint[3] ?? 1;
      const seen = [0, 1, 2].map((i) => faint[i] * a + bg[i] * (1 - a));
      const [hi, lo] = [lum(seen), lum(bg)].sort((x, y) => y - x);
      return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
    });
  });
  const dark = await ratios();
  await page.locator('#theme-btn').click();
  const light = await ratios();
  console.log(`name contrast at the faint end of its ramp: dark ${dark.join(', ')}; light ${light.join(', ')}`);
  for (const r of [...dark, ...light]) expect(r).toBeGreaterThanOrEqual(3);
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
  // the wave draws one still frame and stops
  const wave = page.locator('#wave');
  await expect(wave).toHaveClass(/\bon\b/, { timeout: 20_000 });
  const frames = () => wave.evaluate((c) => Number(c.dataset.frames));
  const a = await frames();
  await page.waitForTimeout(800);
  expect(await frames()).toBe(a);
  const frame = () => page.locator('#sky').evaluate((c) => c.toDataURL());
  const moving = await page.evaluate(() => [...document.querySelectorAll('*')]
    .filter((el) => { const s = getComputedStyle(el); return s.animationName !== 'none' && s.animationPlayState === 'running' && parseFloat(s.animationDuration) > 0.01 && s.animationIterationCount === 'infinite'; })
    .map((el) => el.className));
  expect(moving).toEqual([]);
  await expect(page.locator('#sky-btn')).toBeHidden();
  // the sunny light theme is still too
  await page.locator('#theme-btn').click();
  const lightA = await frame();
  await page.waitForTimeout(700);
  expect(await frame()).toBe(lightA);
  await page.locator('#theme-btn').click();
  // no entrance (everything is in place at once), no lean on scroll-in, no tilt under the mouse
  expect(await page.locator('[data-rise]').evaluateAll((els) => els.map((el) => [getComputedStyle(el).opacity, getComputedStyle(el).transform])))
    .toEqual([['1', 'none'], ['1', 'none'], ['1', 'none']]);
  const card = page.locator('#skills .card').first();
  await card.scrollIntoViewIfNeeded();
  expect(await card.evaluate((el) => getComputedStyle(el).getPropertyValue('--rv-x'))).toBe('0deg');
  const box = await card.boundingBox();
  await page.mouse.move(box.x + box.width * 0.9, box.y + 5);
  await page.waitForTimeout(200);
  await expect(card).not.toHaveClass(/tilting/);
  await ctx.close();
});
