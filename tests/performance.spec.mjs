// Performance budget: the "load test" of a static page. Page weight, what gets
// downloaded up front, layout shift, and drawing cost per frame on a slow phone CPU.
import { test, expect } from './fixtures.mjs';

// The dark-theme background (islands/flow-wave.js, Three.js) is fetched after the page
// has loaded, so it is measured on its own below rather than as part of the first load.
const isWave = (u) => u.endsWith('islands/flow-wave.js');

test('first load stays under 600 KB and does not download the 9 MB video', async ({ page }) => {
  const sizes = new Map();
  page.on('response', async (res) => {
    try { sizes.set(res.url(), (await res.body()).length); } catch { /* range or aborted */ }
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  const urls = [...sizes.keys()].filter((u) => !isWave(u));
  expect(urls.filter((u) => u.endsWith('.mp4'))).toEqual([]);
  expect(urls.filter((u) => u.endsWith('islands/pulsehr-gallery.js')), 'React loads only near Projects').toEqual([]);
  const total = urls.reduce((a, u) => a + sizes.get(u), 0);
  console.log(`first load: ${(total / 1024).toFixed(0)} KB in ${urls.length} files`);
  expect(total).toBeLessThan(600 * 1024);
});

test('the photo loads as WebP, not the heavier PNG', async ({ page }) => {
  const imgs = [];
  page.on('request', (r) => r.resourceType() === 'image' && imgs.push(r.url()));
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(imgs.some((u) => u.endsWith('rabbi-cutout.webp'))).toBe(true);
  expect(imgs.some((u) => u.endsWith('rabbi-cutout.png'))).toBe(false);
});

test('page is usable fast: DOM ready under 1.5 s and photo painted under 2.5 s', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  const t = await page.evaluate(() => new Promise((done) => {
    const nav = performance.getEntriesByType('navigation')[0];
    new PerformanceObserver((list) => {
      const e = list.getEntries().at(-1);
      done({ dom: nav.domContentLoadedEventEnd, lcp: e.startTime });
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  }));
  console.log(`DOMContentLoaded ${t.dom.toFixed(0)} ms, LCP ${t.lcp.toFixed(0)} ms`);
  expect(t.dom).toBeLessThan(1500);
  expect(t.lcp).toBeLessThan(2500);
});

test('layout does not jump while loading (CLS under 0.1)', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const cls = await page.evaluate(() => new Promise((done) => {
    let v = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value; })
      .observe({ type: 'layout-shift', buffered: true });
    setTimeout(() => done(v), 500);
  }));
  console.log(`CLS ${cls.toFixed(3)}`);
  expect(cls).toBeLessThan(0.1);
});

// Time spent inside animation-frame callbacks (the backgrounds' drawing). Unlike raw
// fps this does not depend on the screen's refresh rate or on other test workers.
async function frameCost(page, ms = 2000, wave = false) {
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.__frames = [];
    window.requestAnimationFrame = (cb) => raf((t) => { const s = performance.now(); cb(t); window.__frames.push(performance.now() - s); });
  });
  await page.goto('/');
  if (wave) await expect(page.locator('#wave')).toHaveClass(/\bon\b/, { timeout: 20_000 });
  await page.evaluate(() => { window.__frames.length = 0; });
  return async () => {
    await page.waitForTimeout(ms);
    const f = await page.evaluate(() => window.__frames.slice());
    f.sort((a, b) => a - b);
    return { frames: f.length, avg: f.reduce((a, b) => a + b, 0) / f.length, p95: f[Math.floor(f.length * 0.95)] };
  };
}

test('the sunny light-theme background also takes under 4 ms a frame', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('theme', 'light'); } catch { /* no storage */ } });
  const done = await frameCost(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const r = await done();
  console.log(`sunny: ${r.frames} frames, avg ${r.avg.toFixed(2)} ms, p95 ${r.p95.toFixed(2)} ms`);
  expect(r.frames).toBeGreaterThan(40);
  expect(r.avg).toBeLessThan(4);
});

test.describe('dark-theme background (Flow Wave, WebGL)', () => {
  test.use({ wave: true });

  test('the dark-theme wave loads only after the page, costs under 450 KB, and never loads in the light theme', async ({ page }) => {
    let bytes = 0;
    page.on('response', async (res) => { if (isWave(res.url())) bytes = (await res.body()).length; });
    await page.goto('/');
    await expect(page.locator('#wave')).toHaveClass(/\bon\b/, { timeout: 20_000 });
    const t = await page.evaluate(() => ({
      load: performance.getEntriesByType('navigation')[0].loadEventStart,
      wave: performance.getEntriesByType('resource').filter((e) => e.name.endsWith('islands/flow-wave.js')).map((e) => e.startTime),
    }));
    expect(t.wave, 'requested once').toHaveLength(1);
    expect(t.wave[0], 'requested after the page has loaded').toBeGreaterThanOrEqual(t.load);
    console.log(`flow wave: ${(bytes / 1024).toFixed(0)} KB (Three.js and the scene)`);
    expect(bytes).toBeLessThan(450 * 1024);

    const light = [];
    await page.addInitScript(() => { try { localStorage.setItem('theme', 'light'); } catch { /* no storage */ } });
    page.on('request', (r) => isWave(r.url()) && light.push(r.url()));
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(light, 'light-theme visitors never download it').toEqual([]);
  });

  // The wave is drawn by the graphics card. This measures what it costs the page's own
  // thread each frame (moving the camera, handing the frame to WebGL); the test machine has
  // no graphics card, so the drawing itself is slow here and not representative.
  test('the dark-theme wave takes under 4 ms of script a frame (budget is 16 ms for 60 fps)', async ({ page }) => {
    const done = await frameCost(page, 2000, true);
    const r = await done();
    console.log(`flow wave: ${r.frames} frames, avg ${r.avg.toFixed(2)} ms, p95 ${r.p95.toFixed(2)} ms`);
    expect(r.frames, 'the wave drew (slowly, in software, on the test machine)').toBeGreaterThan(5);
    expect(r.avg).toBeLessThan(4);
  });

  test('stress: on a 4x slower phone CPU while scrolling, frames still fit in 16 ms', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const done = await frameCost(page, 2000, true);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.evaluate(async () => {
      for (let i = 0; i < 40; i++) { window.scrollBy(0, 120); await new Promise((r) => setTimeout(r, 50)); }
    });
    const r = await done();
    console.log(`4x CPU throttle + scroll: ${r.frames} frames, avg ${r.avg.toFixed(2)} ms, p95 ${r.p95.toFixed(2)} ms`);
    expect(r.avg).toBeLessThan(10);
    expect(r.p95).toBeLessThan(16);
  });

  test('both backgrounds stop drawing when the tab is hidden', async ({ page }) => {
    const hide = () => page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const frames = (sel) => page.locator(sel).evaluate((c) => Number(c.dataset.frames || 0));
    await page.goto('/');
    await expect(page.locator('#wave')).toHaveClass(/\bon\b/, { timeout: 20_000 });
    await hide();
    await page.waitForTimeout(150);
    let a = await frames('#wave'); await page.waitForTimeout(800);
    expect(await frames('#wave'), 'the wave stops').toBe(a);

    await page.addInitScript(() => { try { localStorage.setItem('theme', 'light'); } catch { /* no storage */ } });
    await page.reload();
    await expect.poll(() => frames('#sky')).toBeGreaterThan(2);
    await hide();
    await page.waitForTimeout(150);
    a = await frames('#sky'); await page.waitForTimeout(800);
    expect(await frames('#sky'), 'the sunny scene stops').toBe(a);
  });
});

test('phones never download the Motion library (it only drives the mouse tilt)', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, baseURL });
  const page = await ctx.newPage();
  const urls = [];
  page.on('request', (r) => urls.push(r.url()));
  await page.route((url) => !url.href.startsWith(baseURL), (route) => route.abort());
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(urls.filter((u) => u.includes('motion'))).toEqual([]);
  await ctx.close();
});

test('the carousel costs under 400 KB: React, the component and 8 screenshots', async ({ page }) => {
  const sizes = new Map();
  page.on('response', async (res) => {
    if (!/islands\/|assets\/pulsehr\//.test(res.url()) || isWave(res.url())) return;
    try { sizes.set(res.url(), (await res.body()).length); } catch { /* aborted */ }
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator('.screens').scrollIntoViewIfNeeded();
  await expect(page.getByRole('region', { name: 'PulseHR screens' })).toBeVisible();
  // (the page went network-idle once already at load, so wait for the files themselves)
  await expect.poll(() => sizes.size, { message: 'JS, CSS and 8 screenshots arrive' }).toBe(10);
  await page.waitForTimeout(500);
  const total = [...sizes.values()].reduce((a, b) => a + b, 0);
  console.log(`carousel: ${(total / 1024).toFixed(0)} KB in ${sizes.size} files`);
  expect(sizes.size, 'and nothing more').toBe(10);
  expect(total).toBeLessThan(400 * 1024);
});
