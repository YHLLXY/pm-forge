
import { chromium } from 'file:///C:/dev/pm-forge/toolkit/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const OUT = process.argv[2];

const PROBE = () => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) }; };
  const classRules = (el, limit) => { if (!el) return []; const out = [];
    const walk = (rules, media) => { for (const rule of rules) { if (out.length >= (limit||18)) return;
      if (rule.cssRules && rule.conditionText !== undefined) { walk(rule.cssRules, '@media ' + rule.conditionText); continue; }
      if (!rule.selectorText) continue; const sel = rule.selectorText;
      if (/^\s*\*|:root|^html|::?-webkit|::selection/.test(sel)) continue;
      let m=false; try { m = el.matches(sel); } catch { m=false; } if (!m) continue;
      const t = rule.style.cssText || ''; if (!t) continue; out.push({ media: media||null, sel: sel.slice(0,150), css: t.slice(0,500) }); } };
    for (const sheet of document.styleSheets) { let r; try { r = sheet.cssRules; } catch { continue; } if (r) walk(r, null); } return out; };

  const res = { url: location.href, vw: innerWidth, docH: document.documentElement.scrollHeight };
  // find TOC heading text anywhere
  const RE = /^(on this page|table of contents|in this article|contents|on this page:)/i;
  const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div,strong')].filter(e => e.children.length === 0 && RE.test(e.textContent.trim()));
  res.tocHeadings = heads.slice(0,6).map(h => { const r = h.getBoundingClientRect(); const s = getComputedStyle(h); return { t: h.textContent.trim().slice(0,40), tag: h.tagName.toLowerCase(), cls: (h.className||'').toString().slice(0,110), box: box(h), inRightHalf: r.left > innerWidth*0.5, fs: s.fontSize, lh: s.lineHeight, fw: s.fontWeight, color: s.color, tt: s.textTransform, ls: s.letterSpacing, mb: s.marginBottom }; });
  // walk up from the right-half heading to find the rail container
  const h = heads.find(x => x.getBoundingClientRect().left > innerWidth*0.5);
  let rail = null;
  if (h) { let cur = h; for (let i=0;i<8 && cur;i++) { const s = getComputedStyle(cur); const r = cur.getBoundingClientRect();
      if (s.position === 'sticky' || (r.width > 150 && r.height > 150)) { rail = cur; }
      if (s.position === 'sticky') break; cur = cur.parentElement; } }
  if (!rail && h) rail = h.parentElement;
  if (rail) { const s = getComputedStyle(rail);
    const links = [...rail.querySelectorAll('a')];
    const act = links.find(l => /active|current/i.test((l.className||'').toString()) || l.getAttribute('aria-current') === 'true') || null;
    const plain = links.find(l => l !== act) || links[0] || null;
    const ls = (l) => { if (!l) return null; const s2 = getComputedStyle(l); const b = getComputedStyle(l,'::before'); const a = getComputedStyle(l,'::after');
      return { t: l.textContent.trim().slice(0,40), cls: (l.className||'').toString().slice(0,120), aria: l.getAttribute('aria-current'), fs: s2.fontSize, lh: s2.lineHeight, fw: s2.fontWeight, color: s2.color, bg: s2.backgroundColor, padL: s2.paddingLeft, pad: s2.padding, borderLeft: s2.borderLeftWidth+' '+s2.borderLeftStyle+' '+s2.borderLeftColor, opacity: s2.opacity,
        before: { content: b.content, bg: b.backgroundColor, w: b.width, h: b.height, pos: b.position, radius: b.borderRadius }, after: { content: a.content, bg: a.backgroundColor, w: a.width, h: a.height, pos: a.position, radius: a.borderRadius } }; };
    res.rail = { tag: rail.tagName.toLowerCase(), cls: (rail.className||'').toString().slice(0,140), box: box(rail), pos: s.position, top: s.top, maxHeight: s.maxHeight, overflowY: s.overflowY, padding: s.padding, borderLeft: s.borderLeftWidth+' '+s.borderLeftStyle+' '+s.borderLeftColor, bg: s.backgroundColor, display: s.display, gap: s.gap, fontSize: s.fontSize,
      rules: classRules(rail, 16), linkRules: classRules(plain, 8), activeRules: classRules(act, 8), plainLink: ls(plain), activeLink: ls(act), linkCount: links.length };
  }
  // article body
  const paras = [...document.querySelectorAll('article p, main p, p')].filter(p => p.textContent.trim().length > 120 && p.getBoundingClientRect().width > 100);
  if (paras.length) { const b = paras[Math.floor(paras.length/3)]; const bb = b.getBoundingClientRect(); let cur = b; while (cur.parentElement) { const r = cur.parentElement.getBoundingClientRect(); if (Math.abs(r.width-bb.width)<8 && r.width < innerWidth*0.95) cur = cur.parentElement; else break; }
    const s = getComputedStyle(cur); res.body = { cls: (cur.className||'').toString().slice(0,120), box: box(cur), maxWidth: s.maxWidth, fs: s.fontSize, lh: s.lineHeight, color: s.color }; 
    if (res.rail) res.bodyToRailGap = res.rail.box.x - Math.round(bb.right); }
  // left sidebar too (for context)
  const leftAside = [...document.querySelectorAll('aside,nav')].map(e=>({e, r:e.getBoundingClientRect()})).filter(o=>o.r.left < innerWidth*0.4 && o.r.width>120 && o.r.height>200).sort((a,b)=>b.r.width-a.r.width)[0];
  if (leftAside) { const s = getComputedStyle(leftAside.e); res.leftRail = { tag: leftAside.e.tagName.toLowerCase(), cls: (leftAside.e.className||'').toString().slice(0,110), box: box(leftAside.e), pos: s.position, top: s.top, maxHeight: s.maxHeight, overflowY: s.overflowY, borderRight: s.borderRightWidth+' '+s.borderRightStyle+' '+s.borderRightColor }; }
  return res;
};

const browser = await chromium.launch({ headless: true });
const results = {};
const JOBS = [
  ['tailwind-docs', 'https://tailwindcss.com/docs/installation/using-vite'],
  ['vercel-docs', 'https://vercel.com/docs/frameworks/frontend/astro'],
  ['linear-docs', 'https://linear.app/docs/keyboard-shortcuts'],
  ['smashing', 'https://www.smashingmagazine.com/2026/10/how-name-things/'],
  ['overreacted', 'https://overreacted.io/how-i-vibed-a-proof-of-conways-conjecture/'],
  ['leerob', 'https://leerob.com/cursor'],
];
for (const [name, url] of JOBS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', locale: 'en-US' });
  const page = await ctx.newPage();
  await page.route('**/*', (route) => { const t = route.request().resourceType(); if (t === 'image' || t === 'media' || t === 'font') return route.abort().catch(() => {}); return route.continue().catch(() => {}); });
  const rec = { url, ok: false };
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    rec.status = resp ? resp.status() : null; rec.finalUrl = page.url();
    await page.waitForTimeout(4000);
    await page.evaluate(() => window.scrollTo(0, Math.round(document.documentElement.scrollHeight*0.4)));
    await page.waitForTimeout(2000);
    rec.data = await page.evaluate(PROBE);
    rec.ok = true;
  } catch (e) { rec.error = String(e).slice(0,250); }
  results[name] = rec;
  console.log('DONE', name, rec.ok ? 'ok' : 'FAIL ' + rec.error);
  await ctx.close().catch(() => {});
}
await browser.close();
fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log('WROTE', OUT, fs.statSync(OUT).size);
