// End-to-end smoke test: what a visitor does on the page.
import { test, expect } from './fixtures.mjs';

const isPhone = (info) => info.project.name === 'phone';

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('page loads with the name, photo and every section', async ({ page }) => {
  await expect(page).toHaveTitle(/Rajibul Islam Rabbi/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const photo = page.getByAltText('Portrait of Md. Rajibul Islam Rabbi');
  await expect(photo).toBeVisible();
  expect(await photo.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
  for (const id of ['top', 'about', 'experience', 'projects', 'skills', 'education', 'contact']) {
    await expect(page.locator('#' + id)).toHaveCount(1);
  }
});

test('footer shows the current year', async ({ page }) => {
  await expect(page.locator('#year')).toHaveText(String(new Date().getFullYear()));
});

test('menu links scroll to their section and highlight it', async ({ page }, info) => {
  test.skip(isPhone(info), 'phone menu has its own test');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Projects' }).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.locator('#projects h2')).toBeInViewport();
  await expect(page.locator('.nav-links a[href="#projects"]')).toHaveClass(/active/);
});

test('phone menu opens, closes with Escape, and closes after picking a link', async ({ page }, info) => {
  test.skip(!isPhone(info), 'desktop shows the links inline');
  const btn = page.locator('#menu-btn');
  const links = page.locator('#nav-links');
  await expect(links).toBeHidden();
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(links).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await expect(links).toBeHidden();
  await btn.click();
  await links.getByRole('link', { name: 'Contact' }).click();
  await expect(links).toBeHidden();
  await expect(page.locator('#contact h2')).toBeInViewport();
});

test('theme switch changes colours and is remembered after reload', async ({ page }) => {
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const dark = await bg();
  await page.locator('#theme-btn').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await bg()).not.toBe(dark);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('#theme-btn').click();
  await page.reload();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light');
});

test('starfield is drawing', async ({ page }) => {
  const canvas = page.locator('#sky');
  await expect(canvas).toBeAttached();
  const lit = await canvas.evaluate((c) => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });
  expect(lit).toBeGreaterThan(100);
});

test('PulseHR demo video is served so browsers can stream and seek it', async ({ page, request }) => {
  const video = page.locator('#projects video');
  await expect(video).toHaveAttribute('preload', 'none');
  await expect(video).toHaveAttribute('poster', /pulsehr-dashboard\.jpg$/);
  const res = await request.get('assets/pulsehr-demo.mp4', { headers: { Range: 'bytes=0-1023' } });
  expect(res.status()).toBe(206);
  expect(res.headers()['content-type']).toBe('video/mp4');
  const head = await res.body();
  expect(head.subarray(4, 8).toString()).toBe('ftyp'); // a real MP4 file
  const moov = head.indexOf('moov'); // "fast start": index at the front, so it plays before fully downloaded
  expect(moov, 'moov box should be near the start of the file').toBeGreaterThan(0);
});

test('PulseHR demo video plays (where the browser has the H.264 codec)', async ({ page }) => {
  const video = page.locator('#projects video');
  const can = await video.evaluate((v) => v.canPlayType('video/mp4; codecs="avc1.640028, mp4a.40.2"'));
  test.skip(!can, 'this Chromium build has no H.264 codec; Chrome, Edge, Safari and Firefox do');
  await video.scrollIntoViewIfNeeded();
  await video.evaluate((v) => { v.muted = true; return v.play(); });
  await expect.poll(() => video.evaluate((v) => v.currentTime), { timeout: 10_000 }).toBeGreaterThan(0.3);
  expect(await video.evaluate((v) => v.duration)).toBeGreaterThan(30);
});

test('project and contact links point where they should', async ({ page }) => {
  const href = (name) => page.locator('#projects, #contact').getByRole('link', { name }).first().getAttribute('href');
  expect(await href(/Live demo/)).toBe('https://rajibul001i.github.io/PulseHR/app/');
  expect(await href(/Source code/)).toBe('https://github.com/Rajibul001i/PulseHR');
  expect(await href(/WhatsApp/)).toBe('https://wa.me/8801308823620');
  expect(await href(/Email/)).toBe('mailto:ri5119316@gmail.com');
  expect(await href(/Phone/)).toBe('tel:+8801554550816');
  expect(await href(/LinkedIn rajibul/)).toBe('https://www.linkedin.com/in/rajibul-islam-rabbi');
});

test('everything is visible after scrolling through (reveal animation never hides content)', async ({ page }) => {
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 500) await page.mouse.wheel(0, 500);
  await page.waitForTimeout(800);
  const hidden = await page.locator('.reveal').evaluateAll((els) =>
    els.filter((el) => !el.classList.contains('in') || parseFloat(getComputedStyle(el).opacity) < 0.99).length);
  expect(hidden).toBe(0);
});

test('page still shows everything with JavaScript turned off', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const p = await ctx.newPage();
  await p.route((url) => !url.href.startsWith(baseURL), (route) => route.abort());
  await p.goto('/');
  const hidden = await p.locator('.reveal').evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity !== '1').length);
  expect(hidden).toBe(0);
  await expect(p.locator('#contact')).toBeVisible();
  await ctx.close();
});

test('cards lean toward the mouse in 3D and settle back when it leaves', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'no mouse on a phone');
  const card = page.locator('#skills .card').first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveClass(/\bin\b/);
  const box = await card.boundingBox();
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1, { steps: 5 });
  await expect(card).toHaveClass(/tilting/);
  await expect.poll(() => card.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--tilt-y')))).toBeGreaterThan(2);
  await page.mouse.move(5, 5);
  await expect(card).not.toHaveClass(/tilting/);
  await expect.poll(() => card.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--tilt-y')))).toBeLessThan(0.1);
});

test('the hero plays its 3D entrance once and ends fully in place', async ({ page }) => {
  const line = page.locator('.hero h1 .line').first();
  expect(await line.evaluate((el) => getComputedStyle(el).animationName)).toBe('rise3d');
  await page.waitForTimeout(2600);
  for (const sel of ['.hero h1 .line', '.hero .lead', '.portrait', '.award']) {
    const st = await page.locator(sel).first().evaluate((el) => ({ o: getComputedStyle(el).opacity, it: getComputedStyle(el).animationIterationCount }));
    expect(st.o, sel).toBe('1');
    expect(st.it, sel).toBe('1');
  }
});
