import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 45_000,
  fullyParallel: true,
  // on CI, 'github' also turns each failure into an annotation on the run
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: 'http://localhost:4173', trace: 'off' },
  webServer: { command: 'node tests/server.mjs', url: 'http://localhost:4173', reuseExistingServer: true },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 800 } } },
    // Source, layout-width and performance checks set their own sizes, so they run on desktop only.
    { name: 'phone', use: { ...devices['Pixel 7'] }, testMatch: /(smoke|a11y)\.spec\.mjs/ },
  ],
});
