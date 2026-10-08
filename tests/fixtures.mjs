// Shared fixture: every browser test runs offline (third-party requests such as
// Google Fonts are blocked) and fails if the page logs an error or a local file 404s.
//
// The background (islands/flow-wave.js) is WebGL. The test machines have no
// graphics card, so Chromium draws it in software at a few frames a second, and that slows
// every animation frame on the page (scrolling, dragging, springs). It is decoration behind
// the content, so tests get an empty stand-in, and the CSS background shows. Tests about
// the wave itself opt in with `test.use({ wave: true })`.
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  wave: [false, { option: true }],
  page: async ({ page, baseURL, wave }, use) => {
    const problems = [];
    await page.route((url) => !url.href.startsWith(baseURL), (route) => route.abort());
    if (!wave) await page.route('**/islands/flow-wave.js', (route) => route.fulfill({ contentType: 'text/javascript', body: '' }));
    page.on('pageerror', (err) => problems.push('JS error: ' + err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(msg.text())) problems.push('console: ' + msg.text());
    });
    page.on('response', (res) => {
      if (res.url().startsWith(baseURL) && res.status() >= 400) problems.push(`${res.status()} ${res.url()}`);
    });
    await use(page);
    expect(problems, 'errors or missing files while the page ran').toEqual([]);
  },
});
export { expect };
