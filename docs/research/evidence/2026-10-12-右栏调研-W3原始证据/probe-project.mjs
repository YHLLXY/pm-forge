
import { chromium } from 'file:///C:/dev/pm-forge/toolkit/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const out = {};
for (const vw of [1440, 1280, 1920]) {
  await page.setViewportSize({ width: vw, height: 900 });
  const urls = await (async () => { try { const r = await page.goto('http://127.0.0.1:4321/case-studies/', { waitUntil: 'domcontentloaded', timeout: 15000 }); return r.status(); } catch(e){ return String(e).slice(0,80); } })();
  out['case-studies/'+vw] = urls;
  const link = await page.evaluate(() => { const a = document.querySelector('a[href*="/case-studies/"]'); return a ? a.getAttribute('href') : null; });
  if (link) {
    await page.goto('http://127.0.0.1:4321' + link, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(600);
    out['detail'+vw] = await page.evaluate(() => {
      const el = document.querySelector('.max-w-readable');
      const c = document.querySelector('.app-layout') || document.querySelector('main');
      const p = el ? el.querySelector('p') : null;
      const g = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return { x: Math.round(r.x), w: Math.round(r.width), right: Math.round(r.right), fs: s.fontSize, lh: s.lineHeight, color: s.color, maxWidth: s.maxWidth }; };
      const h2 = document.querySelector('.max-w-readable h2');
      const hs = h2 ? getComputedStyle(h2) : null;
      return { url: location.pathname, container: g(c), body: g(el), firstP: g(p), h2Count: document.querySelectorAll('.max-w-readable h2').length, h3Count: document.querySelectorAll('.max-w-readable h3').length,
        h2Style: hs ? { fs: hs.fontSize, lh: hs.lineHeight, fw: hs.fontWeight, color: hs.color, mt: hs.marginTop, mb: hs.marginBottom } : null,
        h2id: h2 ? h2.id : null, vw: innerWidth, docW: document.documentElement.clientWidth };
    });
  }
  break;
}
// also collect a couple of detail URLs
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://127.0.0.1:4321/case-studies/', { waitUntil: 'domcontentloaded' });
const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h && /^\/(case-studies|analysis|dissections|toolbox\/reports)\/[^/]+\/?$/.test(h)).slice(0,4));
out.sampleLinks = links;
const results = {};
for (const l of links) {
  await page.goto('http://127.0.0.1:4321' + l, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(400);
  results[l] = await page.evaluate(() => {
    const el = document.querySelector('.max-w-readable');
    const p = el ? el.querySelector('p') : null;
    const g = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return { x: Math.round(r.x), w: Math.round(r.width), right: Math.round(r.right), fs: s.fontSize, lh: s.lineHeight, color: s.color }; };
    const c = document.querySelector('.app-layout');
    return { container: g(c), body: g(el), firstP: g(p), h2: document.querySelectorAll('.max-w-readable h2').length, h3: document.querySelectorAll('.max-w-readable h3').length, padL: c ? getComputedStyle(c).paddingLeft : null, padR: c ? getComputedStyle(c).paddingRight : null };
  });
}
out.details = results;
await b.close();
fs.writeFileSync('C:/dev/pm-forge/_w3/project.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1).slice(0, 4000));
