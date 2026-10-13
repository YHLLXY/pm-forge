
import { chromium } from 'file:///C:/dev/pm-forge/toolkit/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const OUT = process.argv[2];

const GRIDPROBE = () => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) }; };
  const res = { vw: innerWidth, url: location.href, title: document.title };
  // biggest multi-column grid
  const grids = [...document.querySelectorAll('body *')].map(el => { const cs = getComputedStyle(el); return { el, cs, cols: cs.gridTemplateColumns }; })
    .filter(o => o.cs.display === 'grid' && o.cols && o.cols !== 'none' && o.cols.split(' ').length >= 2)
    .map(o => { const r = o.el.getBoundingClientRect(); return { ...o, box: box(o.el), n: o.cols.split(' ').length, area: r.width * r.height }; })
    .filter(o => o.box.w > 400 && o.box.h > 200)
    .sort((a, b) => b.area - a.area).slice(0, 4);
  res.grids = grids.map(o => ({ cls: (typeof o.el.className === 'string' ? o.el.className : '').slice(0, 140), box: o.box, gtc: o.cols.slice(0, 300), gap: o.cs.gap, maxWidth: o.cs.maxWidth }));
  // right-side columns: any element fully in right half, tall, narrow
  const right = [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 120 && r.width < 520 && r.height > 200 && r.left > innerWidth * 0.5 && cs.display !== 'none'; })
    .map(el => { const cs = getComputedStyle(el); return { cls: (typeof el.className === 'string' ? el.className : '').slice(0, 140), tag: el.tagName.toLowerCase(), id: el.id || null, box: box(el), pos: cs.position, top: cs.top, borderLeft: cs.borderLeftWidth + ' ' + cs.borderLeftColor, bg: cs.backgroundColor, fs: cs.fontSize, color: cs.color }; })
    .sort((a, b) => b.box.h - a.box.h).slice(0, 8);
  res.rightColumns = right;
  // main text column
  const cands = [...document.querySelectorAll('p, li')].filter(p => p.textContent.trim().length > 80 && p.getBoundingClientRect().top > 0);
  if (cands.length) { const mid = cands[0]; const r = mid.getBoundingClientRect(); const cs = getComputedStyle(mid); res.textCol = { w: Math.round(r.width), x: Math.round(r.x), fs: cs.fontSize, lh: cs.lineHeight, color: cs.color, sample: mid.textContent.trim().slice(0, 60) }; }
  // aside / nav on the right
  res.asides = [...document.querySelectorAll('aside,nav,[class*=sidebar],[class*=Sidebar],[class*=rail]')].slice(0, 10).map(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 120), box: { w: Math.round(r.width), x: Math.round(r.x), h: Math.round(r.height) }, pos: cs.position, display: cs.display }; });
  res.containerWidths = [...new Set([...document.querySelectorAll('main, [class*=container], [class*=wrapper], [class*=layout]')].slice(0, 40).map(el => Math.round(el.getBoundingClientRect().width)))].slice(0, 12);
  return res;
};

const browser = await chromium.launch({ headless: true });
const results = {};
const SITES = [
  ['awwwards', 'https://www.awwwards.com/', 'a[href*="/sites/"]'],
  ['godly->recent.design', 'https://godly.website/', null],
  ['land-book', 'https://land-book.com/', 'a[href*="/shot"], a[href^="/design/"] ~ *'],
  ['siteinspire', 'https://www.siteinspire.com/', null],
  ['minimal-gallery', 'https://minimal.gallery/', null],
  ['dribbble', 'https://dribbble.com/', null],
  ['behance', 'https://www.behance.net/', null],
  ['mobbin', 'https://mobbin.com/', null],
  ['lapa-ninja', 'https://www.lapaninja.com/', null],
  ['onepagelove', 'https://onepagelove.com/', null],
];
for (const [name, url, followSel] of SITES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', locale: 'en-US' });
  const page = await ctx.newPage();
  await page.route('**/*', (route) => { const t = route.request().resourceType(); if (t === 'image' || t === 'media' || t === 'font') return route.abort().catch(() => {}); return route.continue().catch(() => {}); });
  const rec = { url, ok: false };
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    rec.status = resp ? resp.status() : null; rec.finalUrl = page.url(); rec.pageTitle = await page.title();
    await page.waitForTimeout(3500);
    rec.home = await page.evaluate(GRIDPROBE);
    if (followSel) {
      const href = await page.evaluate((s) => { const a = document.querySelector(s); return a ? a.href : null; }, followSel);
      if (href) {
        rec.followed = href;
        await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3500);
        rec.detail = await page.evaluate(GRIDPROBE);
      } else rec.followed = 'no-match';
    }
    // mobile
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(1200);
    rec.mobile = await page.evaluate(() => ({ vw: innerWidth, asides: [...document.querySelectorAll('aside,nav,[class*=sidebar]')].slice(0,6).map(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { cls: (typeof el.className === 'string'? el.className : '').slice(0,70), w: Math.round(r.width), x: Math.round(r.x), display: cs.display, pos: cs.position }; }) }));
    rec.ok = true;
  } catch (e) { rec.error = String(e).slice(0, 250); }
  results[name] = rec;
  console.log('DONE', name, rec.ok ? ('ok ' + (rec.finalUrl||'').slice(0,80)) : 'FAIL ' + rec.error);
  await ctx.close().catch(() => {});
}
await browser.close();
fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log('WROTE', OUT, fs.statSync(OUT).size);
