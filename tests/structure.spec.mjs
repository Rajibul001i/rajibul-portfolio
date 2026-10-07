// Structure checks: the "unit tests" of a static site. They read the source files
// directly (desktop project only, see playwright.config.mjs).
import { test, expect } from '@playwright/test';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const html = readFileSync(root + 'index.html', 'utf8');
const css = readFileSync(root + 'css/style.css', 'utf8');
// our own scripts; js/vendor/ holds third-party code that is loaded on demand
const jsFiles = readdirSync(root + 'js').filter((f) => f.endsWith('.js')).map((f) => 'js/' + f);
const allSource = [html, css, ...jsFiles.map((f) => readFileSync(root + f, 'utf8'))].join('\n');

test.describe('HTML is only for structure', () => {
  test('no <style> blocks, no inline style attributes', () => {
    expect(html).not.toMatch(/<style[\s>]/i);
    expect(html).not.toMatch(/\sstyle\s*=/i);
  });
  test('no inline scripts or inline event handlers', () => {
    const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].filter((m) => m[1].trim());
    expect(inlineScripts).toHaveLength(0);
    expect(html).not.toMatch(/\son[a-z]+\s*=\s*["']/i);
  });
  test('styling lives in css/, behaviour in js/', () => {
    expect(html).toContain('href="css/style.css"');
    for (const f of jsFiles) expect(html).toContain(`src="${f}"`);
  });
});

test.describe('every reference resolves', () => {
  test('every local file the page points to exists', () => {
    const refs = [...allSource.matchAll(/(?:src|href|srcset|poster|content)="((?:assets|css|js|islands)\/[^"#?]+)"/g)].map((m) => m[1]);
    const cssRefs = [...css.matchAll(/url\(["']?((?:\.\.\/)?assets\/[^"')]+)["']?\)/g)].map((m) => m[1].replace('../', ''));
    const missing = [...new Set([...refs, ...cssRefs])].filter((r) => !existsSync(root + r));
    expect(missing).toEqual([]);
  });
  test('every #link points at an element that exists', () => {
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    const anchors = [...html.matchAll(/href="#([^"]*)"/g)].map((m) => m[1]).filter(Boolean);
    expect(anchors.filter((a) => !ids.has(a))).toEqual([]);
  });
  test('ids are unique', () => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
  test('the link-preview image is a real file in the repo', () => {
    const og = /property="og:image" content="([^"]+)"/.exec(html)?.[1] ?? '';
    expect(og).toMatch(/^https:\/\/rajibul001i\.github\.io\/rajibul-portfolio\/assets\//);
    expect(existsSync(root + og.replace('https://rajibul001i.github.io/rajibul-portfolio/', ''))).toBe(true);
  });
});

test.describe('content and safety', () => {
  test('every image has a description', () => {
    const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    expect(imgs.length).toBeGreaterThan(0);
    expect(imgs.filter((t) => !/\salt="[^"]+"/.test(t))).toEqual([]);
  });
  test('links that open a new tab are safe (rel="noopener")', () => {
    const blank = [...html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].map((m) => m[0]);
    expect(blank.filter((t) => !/rel="[^"]*noopener/.test(t))).toEqual([]);
  });
  test('no secrets, PINs or passwords anywhere in the source (the old admin PIN stays gone)', () => {
    expect(allSource).not.toMatch(/rabbi2025|ADMIN_PIN|password\s*[:=]|api[_-]?key/i);
  });
  test('no leftover fake visitor counter', () => {
    expect(allSource).not.toMatch(/vcounter|rv_total|PORTFOLIO VIEWS/);
  });
  test('page basics: language, title, description, viewport, favicon', () => {
    expect(html).toMatch(/<html lang="en">/);
    expect(html).toMatch(/<title>[^<]{10,}<\/title>/);
    expect(html).toMatch(/<meta name="description" content="[^"]{50,}"/);
    expect(html).toMatch(/<meta name="viewport" content="width=device-width/);
    expect(html).toMatch(/rel="icon"/);
  });
  test('a strict Content-Security-Policy blocks inline and third-party scripts', () => {
    const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1] ?? '';
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
  });
  test('scripts never build HTML from strings (no innerHTML / eval)', () => {
    const js = jsFiles.map((f) => readFileSync(root + f, 'utf8')).join('\n');
    expect(js).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/);
  });
  test('icons are drawn as SVG, not emoji (emoji look different on every phone)', () => {
    expect(html.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) ?? []).toEqual([]);
  });
  test('the bundled Motion library matches the installed package', () => {
    const pkg = JSON.parse(readFileSync(root + 'node_modules/motion/package.json', 'utf8'));
    const vendored = readFileSync(root + 'js/vendor/motion.js', 'utf8');
    expect(vendored.split('\n')[0]).toContain(`Motion ${pkg.version} | MIT License`);
    expect(vendored.slice(vendored.indexOf('\n') + 1)).toBe(readFileSync(root + 'node_modules/motion/dist/motion.js', 'utf8'));
  });
  test('carousel screenshots referenced by the React island exist', () => {
    const slides = readFileSync(root + 'src/islands/pulsehr-slides.ts', 'utf8');
    const names = [...slides.matchAll(/shot\("([^"]+)"\)/g)].map((m) => m[1]);
    expect(names.length).toBe(8);
    expect(names.filter((n) => !existsSync(root + `assets/pulsehr/${n}.webp`))).toEqual([]);
  });
  test("the island's Tailwind classes never clash with the page's own class names", () => {
    const islandCss = readFileSync(root + 'islands/pulsehr-gallery.css', 'utf8');
    const tw = new Set([...islandCss.matchAll(/\.((?:[a-z0-9-]|\\.)+)/g)].map((m) => m[1].replace(/\\/g, '')));
    const used = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)));
    expect([...used].filter((c) => tw.has(c))).toEqual([]);
  });
  test("the island CSS has no Tailwind reset (it would restyle the whole page)", () => {
    const islandCss = readFileSync(root + 'islands/pulsehr-gallery.css', 'utf8');
    expect(islandCss).not.toMatch(/(^|[}\s])(html|body|\*)\s*,?[^{]*\{[^}]*margin:0/);
    expect(islandCss).not.toContain('-webkit-text-size-adjust');
  });
  test('the photo is a separate file, not embedded in the HTML', () => {
    expect(html).not.toMatch(/data:image\//);
    expect(Buffer.byteLength(html)).toBeLessThan(60_000);
  });
});
