// Shared fixture: every browser test runs offline (third-party requests such as
// Google Fonts are blocked) and fails if the page logs an error or a local file 404s.
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    const problems = [];
    await page.route((url) => !url.href.startsWith(baseURL), (route) => route.abort());
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
