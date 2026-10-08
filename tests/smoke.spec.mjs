// End-to-end smoke test: what a visitor does on the page.
import { test, expect } from './fixtures.mjs';

const isPhone = (info) => info.project.name === 'phone';

// The background (islands/flow-wave.js) is WebGL, so its pixels can't be read
// back from the page. Instead: take a screenshot and count the bright cyan dots in it.
// (The test machine has no graphics card; Chromium draws WebGL in software, slowly.)
async function cyanShare(page) {
  const png = (await page.screenshot()).toString('base64');
  return page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const img = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const c = new OffscreenCanvas(img.width, img.height), g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 110 && d[i + 2] > 100 && d[i] < d[i + 1] - 40) n++;
    return n / (d.length / 4);
  }, png);
}
// Light theme: the wave is ink on a see-through canvas. Compare the screen with and without
// it: the share of pixels it makes clearly darker and warmer (amber dots on cream).
async function inkShare(page) {
  const shot = async () => (await page.screenshot()).toString('base64');
  const withWave = await shot();
  await page.locator('#wave').evaluate((c) => { c.style.visibility = 'hidden'; });
  const without = await shot();
  await page.locator('#wave').evaluate((c) => { c.style.visibility = ''; });
  return page.evaluate(async ([a64, b64]) => {
    const pixels = async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      const img = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const c = new OffscreenCanvas(img.width, img.height), g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      return g.getImageData(0, 0, img.width, img.height).data;
    };
    const [a, b] = [await pixels(a64), await pixels(b64)];
    let ink = 0, light = 0;
    for (let i = 0; i < a.length; i += 4) {
      const darker = (b[i] + b[i + 1] + b[i + 2]) - (a[i] + a[i + 1] + a[i + 2]);
      if (darker > 45 && a[i] > a[i + 2] + 40) ink++;
      if (a[i] + a[i + 1] + a[i + 2] > 600) light++;
    }
    return { ink: ink / (a.length / 4), light: light / (a.length / 4) };
  }, [withWave, without]);
}
const waveFrames = (page) => page.locator('#wave').evaluate((c) => Number(c.dataset.frames || 0));

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

test.describe('background (Flow Wave, WebGL)', () => {
  test.use({ wave: true });
  // software WebGL on test machines draws a few frames a second, slower still on CI
  test.describe.configure({ timeout: 120_000 });

  test('the dark theme background is the glowing cyan wave, and it moves', async ({ page }) => {
    const wave = page.locator('#wave');
    await expect(wave, 'the wave fades in once it has drawn').toHaveClass(/\bon\b/, { timeout: 20_000 });
    await expect(page.locator('#sky'), 'the sunny canvas is off in the dark theme').toBeHidden();
    const f = await waveFrames(page);
    await expect.poll(() => waveFrames(page), { timeout: 10_000 }).toBeGreaterThan(f + 3);
    await expect.poll(() => cyanShare(page), { message: 'cyan dots across the screen', timeout: 10_000 }).toBeGreaterThan(0.01);
  });

  test('the light theme gets the same wave in amber, on a see-through canvas', async ({ page }) => {
    const wave = page.locator('#wave');
    await expect(wave).toHaveClass(/\bon\b/, { timeout: 20_000 });
    await page.locator('#theme-btn').click();
    await expect(page.locator('#sky'), 'the sun is out too').toBeVisible();
    const f = await waveFrames(page);
    await expect.poll(() => waveFrames(page), { timeout: 10_000 }).toBeGreaterThan(f + 3);
    await page.locator('#sky-btn').click(); // hold one frame still so the two screenshots match
    const r = await inkShare(page);
    expect(r.ink, 'amber dots across the screen').toBeGreaterThan(0.01);
    expect(r.light, 'the cream page shows around them').toBeGreaterThan(0.5);
  });

  test('the background animation can be paused, and stays paused after reload', async ({ page }) => {
    const btn = page.locator('#sky-btn');
    const wave = page.locator('#wave');
    await expect(wave).toHaveClass(/\bon\b/, { timeout: 20_000 });
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect(btn).toHaveAccessibleName('Play background animation');
    const a = await waveFrames(page); await page.waitForTimeout(800);
    expect(await waveFrames(page), 'the wave stops').toBe(a);
    await page.reload();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect(wave, 'a paused wave still shows its frame').toHaveClass(/\bon\b/, { timeout: 20_000 });
    const b = await waveFrames(page); await page.waitForTimeout(800);
    expect(await waveFrames(page)).toBe(b);
    // the sunny light-theme scene obeys the same button
    const sun = () => page.locator('#sky').evaluate((c) => c.toDataURL());
    await page.locator('#theme-btn').click();
    const s = await sun(); await page.waitForTimeout(600);
    expect(await sun(), 'the sunny scene stays still while paused').toBe(s);
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(sun, { message: 'the sunny scene moves again', timeout: 30_000 }).not.toBe(s);
    await page.locator('#theme-btn').click();
    await expect.poll(() => waveFrames(page), { message: 'the wave moves again', timeout: 30_000 }).toBeGreaterThan(b + 2);
  });
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
  await expect(p.locator('.screens-grid img')).toHaveCount(8); // the carousel's plain fallback
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

test('the first screen has one primary button, and it leads to contact', async ({ page }) => {
  const primaries = await page.locator('.btn-primary').evaluateAll((els) => els
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width && r.top < innerHeight && r.bottom > 0; })
    .map((el) => el.getAttribute('href')));
  expect(primaries).toEqual(['#contact']);
});

test('card tilt runs on springs from the Motion library', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'no mouse on a phone');
  await expect.poll(() => page.evaluate(() => typeof window.Motion?.springValue)).toBe('function');
  const card = page.locator('#skills .card').first();
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2, { steps: 4 });
  await expect(card).toHaveClass(/sprung/);
});

test.describe('PulseHR screens carousel (React island)', () => {
  const carousel = (page) => page.getByRole('region', { name: 'PulseHR screens' });

  test('loads only when Projects comes near, then replaces the plain grid', async ({ page }) => {
    const islandRequests = [];
    page.on('request', (r) => r.url().includes('islands/pulsehr-gallery.js') && islandRequests.push(r.url()));
    await page.waitForTimeout(500);
    expect(islandRequests).toEqual([]);
    await expect(page.locator('.screens-grid img')).toHaveCount(8);
    await page.locator('.screens').scrollIntoViewIfNeeded();
    await expect(carousel(page)).toBeVisible();
    await expect(page.locator('.screens-grid')).toHaveCount(0);
    await expect(carousel(page).getByRole('group')).toHaveCount(8);
    expect(islandRequests).toHaveLength(1);
  });

  test('arrows, keys and dragging change the screen, and the caption follows', async ({ page }, info) => {
    await page.locator('.screens').scrollIntoViewIfNeeded();
    const c = carousel(page);
    const caption = c.locator('p').first();
    await expect(caption).toHaveText('Attrition risk');
    await c.getByRole('button', { name: 'Next slide' }).click();
    await expect(caption).toHaveText('Why this score');
    await c.getByRole('button', { name: 'Previous slide' }).click();
    await c.getByRole('button', { name: 'Previous slide' }).click();
    await expect(caption).toHaveText('Password recovery'); // it loops
    if (info.project.name !== 'phone') {
      await c.locator('[tabindex="0"]').focus();
      await page.keyboard.press('ArrowRight');
      await expect(caption).toHaveText('Attrition risk');
    }
    // drag one card to the left
    const frame = await c.locator('[tabindex="0"]').boundingBox();
    const y = frame.y + frame.height / 2, x = frame.x + frame.width / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(x - i * 30, y); await page.waitForTimeout(30); }
    await page.waitForTimeout(150);
    await page.mouse.up();
    await expect(caption).not.toHaveText(info.project.name !== 'phone' ? 'Attrition risk' : 'Password recovery');
  });

  test('swapping the grid for the carousel never changes the page height (no jump mid-scroll)', async ({ page }) => {
    const stage = page.locator('.screens-stage');
    await page.locator('.screens-grid img').evaluateAll((imgs) => imgs.forEach((i) => { i.loading = 'eager'; }));
    await page.waitForTimeout(500);
    const height = () => stage.evaluate((el) => el.offsetHeight); // layout height, not the 3D-tilted box
    const before = await height();
    await page.locator('.screens').scrollIntoViewIfNeeded();
    await expect(carousel(page)).toBeVisible();
    await page.waitForTimeout(500);
    expect(Math.abs((await height()) - before)).toBeLessThanOrEqual(1);
  });

  test('a menu jump past the carousel lands on its target while the carousel loads', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'the phone menu');
    await page.locator('#menu-btn').click();
    await page.locator('#nav-links').getByRole('link', { name: 'Contact' }).click();
    await expect(carousel(page)).toBeAttached();
    await page.waitForTimeout(1200);
    await expect(page.locator('#contact h2')).toBeInViewport();
  });

  test('every slide image is a real, loaded screenshot', async ({ page }) => {
    await page.locator('.screens').scrollIntoViewIfNeeded();
    const imgs = carousel(page).locator('img');
    await expect(imgs).toHaveCount(8);
    await expect.poll(() => imgs.evaluateAll((els) => els.filter((i) => i.complete && i.naturalWidth === 600).length)).toBe(8);
  });

  test('the carousel follows the light theme', async ({ page }) => {
    await page.locator('.screens').scrollIntoViewIfNeeded();
    const next = carousel(page).getByRole('button', { name: 'Next slide' });
    const before = await next.evaluate((el) => getComputedStyle(el).color);
    await page.locator('#theme-btn').click();
    await expect.poll(() => next.evaluate((el) => getComputedStyle(el).color)).not.toBe(before);
  });
});

test('light theme has its own animated "sunny" background: a warm glow that moves', async ({ page }) => {
  // average colour of the canvas near the top-right corner, where the sun sits
  const corner = () => page.locator('#sky').evaluate((c) => {
    const g = c.getContext('2d'), w = c.width, h = c.height;
    const d = g.getImageData(Math.floor(w * 0.7), 0, Math.floor(w * 0.3), Math.floor(h * 0.3)).data;
    let r = 0, b = 0, a = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i] * d[i + 3]; b += d[i + 2] * d[i + 3]; a += d[i + 3]; }
    return { warm: a ? (r - b) / a : 0, cover: a / (d.length / 4) };
  });
  const dark = await corner();
  // in the dark theme the sunny canvas is empty and hidden; the wave shows instead
  expect(dark.cover, 'no sun in the dark theme').toBe(0);
  await page.locator('#theme-btn').click();
  await page.waitForTimeout(400);
  const sunny = await corner();
  expect(sunny.warm, 'warm (red well above blue) light in the corner').toBeGreaterThan(60);
  expect(sunny.cover, 'a real glow, not a few dots').toBeGreaterThan(20);
  const a = await page.locator('#sky').evaluate((c) => c.toDataURL());
  await page.waitForTimeout(700);
  expect(await page.locator('#sky').evaluate((c) => c.toDataURL()), 'the sunny scene is animated').not.toBe(a);
});

test('text colours follow the theme: cool in the dark theme, warm and sunny in the light one', async ({ page }) => {
  const colours = () => page.evaluate(() => {
    const rgb = (el) => getComputedStyle(el).color.match(/\d+/g).slice(0, 3).map(Number);
    return { body: rgb(document.querySelector('.lead')), name: rgb(document.querySelector('.hero h1 em')), h2: rgb(document.querySelector('#about h2')) };
  });
  const dark = await colours();
  await page.locator('#theme-btn').click();
  const light = await colours();
  for (const k of Object.keys(dark)) expect(light[k], k).not.toEqual(dark[k]);
  const warm = ([r, , b]) => r > b + 40; // more red than blue: amber, brown
  expect(warm(dark.name), 'dark-theme name is cyan').toBe(false);
  expect(warm(light.name), 'light-theme name is amber').toBe(true);
  expect(warm(light.body), 'light-theme text is warm brown').toBe(true);
});
