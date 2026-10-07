// Performance budget: the "load test" of a static page. Page weight, what gets
// downloaded up front, layout shift, and drawing cost per frame on a slow phone CPU.
import { test, expect } from './fixtures.mjs';

test('first load stays under 600 KB and does not download the 9 MB video', async ({ page }) => {
  const sizes = new Map();
  page.on('response', async (res) => {
    try { sizes.set(res.url(), (await res.body()).length); } catch { /* range or aborted */ }
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  const urls = [...sizes.keys()];
  expect(urls.filter((u) => u.endsWith('.mp4'))).toEqual([]);
  const total = [...sizes.values()].reduce((a, b) => a + b, 0);
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

// Time spent inside animation-frame callbacks (the starfield's drawing). Unlike raw
// fps this does not depend on the screen's refresh rate or on other test workers.
async function frameCost(page, ms = 2000) {
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.__frames = [];
    window.requestAnimationFrame = (cb) => raf((t) => { const s = performance.now(); cb(t); window.__frames.push(performance.now() - s); });
  });
  await page.goto('/');
  await page.evaluate(() => { window.__frames.length = 0; });
  return async () => {
    await page.waitForTimeout(ms);
    const f = await page.evaluate(() => window.__frames.slice());
    f.sort((a, b) => a - b);
    return { frames: f.length, avg: f.reduce((a, b) => a + b, 0) / f.length, p95: f[Math.floor(f.length * 0.95)] };
  };
}

test('drawing the starfield takes under 4 ms a frame (budget is 16 ms for 60 fps)', async ({ page }) => {
  const done = await frameCost(page);
  const r = await done();
  console.log(`starfield: ${r.frames} frames, avg ${r.avg.toFixed(2)} ms, p95 ${r.p95.toFixed(2)} ms`);
  expect(r.frames).toBeGreaterThan(40);
  expect(r.avg).toBeLessThan(4);
});

test('stress: on a 4x slower phone CPU while scrolling, frames still fit in 16 ms', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const done = await frameCost(page);
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

test('the sky stops drawing when the tab is hidden', async ({ page }) => {
  await page.goto('/');
  const drawn = await page.evaluate(() => new Promise((done) => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    const c = document.getElementById('sky');
    setTimeout(() => {
      const before = c.toDataURL();
      setTimeout(() => done(c.toDataURL() !== before), 600);
    }, 100);
  }));
  expect(drawn).toBe(false);
});
