
import { chromium } from 'file:///C:/dev/pm-forge/toolkit/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const OUT = process.argv[2];

const PROBE = () => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) }; };
  // ONLY class/id-based rules (exclude universal / :root / html) so we get the real component CSS
  const classRules = (el, limit) => {
    if (!el) return [];
    const out = [];
    const walk = (rules, media) => {
      for (const rule of rules) {
        if (out.length >= (limit || 20)) return;
        if (rule.cssRules && rule.conditionText !== undefined) { walk(rule.cssRules, '@media ' + rule.conditionText); continue; }
        if (!rule.selectorText) continue;
        const sel = rule.selectorText;
        if (/^\s*\*|:root|^html|::?-webkit|::selection|::backdrop/.test(sel)) continue;
        if (/^\s*\*/.test(sel)) continue;
        let m = false; try { m = el.matches(sel); } catch { m = false; }
        if (!m) continue;
        // prefer selectors that are not bare universal-ish
        const t = rule.style.cssText || '';
        if (!t) continue;
        out.push({ media: media || null, sel: sel.slice(0, 160), css: t.slice(0, 600) });
      }
    };
    for (const sheet of document.styleSheets) { let r; try { r = sheet.cssRules; } catch { continue; } if (r) walk(r, null); }
    return out;
  };
  const res = { url: location.href, title: document.title, vw: innerWidth };
  const all = [...document.querySelectorAll('body *')];

  // article body
  const paras = [...document.querySelectorAll('article p, main p, p')].filter(p => p.textContent.trim().length > 120 && p.getBoundingClientRect().width > 100 && p.getBoundingClientRect().top > 0);
  let bodyEl = null;
  if (paras.length) { const best = paras[Math.max(0, Math.floor(paras.length / 3))]; const pr = best.getBoundingClientRect(); let cur = best;
    while (cur.parentElement) { const r = cur.parentElement.getBoundingClientRect(); if (Math.abs(r.width - pr.width) < 8 && r.width < innerWidth * 0.95) cur = cur.parentElement; else break; } bodyEl = cur; }
  if (bodyEl) { const cs = getComputedStyle(bodyEl); res.body = { cls: (bodyEl.className||'').toString().slice(0,150), box: box(bodyEl), maxWidth: cs.maxWidth, fontSize: cs.fontSize, lh: cs.lineHeight, color: cs.color, rules: classRules(bodyEl, 14) }; }
  res.ancestors = []; let a = bodyEl, g = 0;
  while (a && a !== document.documentElement && g++ < 10) { const cs = getComputedStyle(a); res.ancestors.push({ tag: a.tagName.toLowerCase(), cls: (a.className||'').toString().slice(0,120), box: box(a), maxWidth: cs.maxWidth, display: cs.display, gtc: (cs.gridTemplateColumns||'').slice(0,150), gap: cs.gap, pad: cs.padding }); a = a.parentElement; }

  // right rail
  const cands = [];
  for (const el of all) { const r = el.getBoundingClientRect(); if (r.width < 90 || r.width > 480 || r.height < 60) continue;
    const cs = getComputedStyle(el); const isAside = ['ASIDE','NAV'].includes(el.tagName); const sticky = cs.position === 'sticky';
    if (!sticky && !isAside) continue; if (r.left < innerWidth * 0.5) continue; cands.push({ el, r, sticky }); }
  cands.sort((p,q)=>(q.sticky-p.sticky)||(q.r.height-p.r.height));
  res.rails = cands.slice(0,3).map(c => {
    const cs = getComputedStyle(c.el);
    const links = [...c.el.querySelectorAll('a')].slice(0, 60);
    const activeLink = links.find(l => /active|current/i.test((l.className||'').toString()) || l.getAttribute('aria-current')) || null;
    const plainLink = links.find(l => l !== activeLink) || links[0] || null;
    const lstyle = (l) => { if (!l) return null; const s = getComputedStyle(l); const bs = getComputedStyle(l,'::before'); const af = getComputedStyle(l,'::after');
      return { t: l.textContent.trim().slice(0,40), cls: (l.className||'').toString().slice(0,110), aria: l.getAttribute('aria-current'), fs: s.fontSize, lh: s.lineHeight, fw: s.fontWeight, color: s.color, bg: s.backgroundColor,
        padL: s.paddingLeft, borderLeft: s.borderLeftWidth+' '+s.borderLeftStyle+' '+s.borderLeftColor, opacity: s.opacity, display: s.display,
        before: { content: bs.content, bg: bs.backgroundColor, w: bs.width, h: bs.height, pos: bs.position, left: bs.left, top: bs.top, radius: bs.borderRadius, transform: bs.transform, opacity: bs.opacity },
        after: { content: af.content, bg: af.backgroundColor, w: af.width, h: af.height, pos: af.position, left: af.left, radius: af.borderRadius } }; };
    return { tag: c.el.tagName.toLowerCase(), cls: (c.el.className||'').toString().slice(0,140), box: box(c.el), pos: cs.position, top: cs.top, maxHeight: cs.maxHeight, overflowY: cs.overflowY, padding: cs.padding, borderLeft: cs.borderLeftWidth+' '+cs.borderLeftStyle+' '+cs.borderLeftColor, bg: cs.backgroundColor,
      rules: classRules(c.el, 16), linkRules: classRules(plainLink, 8), activeRules: classRules(activeLink, 8),
      plainLink: lstyle(plainLink), activeLink: lstyle(activeLink), linkCount: links.length };
  });
  if (bodyEl && res.rails.length) { const br = bodyEl.getBoundingClientRect(); res.gaps = res.rails.map(r => r.box.x - Math.round(br.right)); }
  res.h2 = document.querySelectorAll('h2').length;
  res.tocHeading = (() => { const h = document.querySelector('aside h2, aside h3, nav h2, [class*=toc] h2, [class*=TableOfContents] h2, [class*=toc] h3'); if (!h) return null; const s = getComputedStyle(h); return { t: h.textContent.trim().slice(0,40), fs: s.fontSize, lh: s.lineHeight, fw: s.fontWeight, color: s.color, tt: s.textTransform, ls: s.letterSpacing, mb: s.marginBottom }; })();
  return res;
};

const browser = await chromium.launch({ headless: true });
const results = {};
const JOBS = [
  ['joshwcomeau', 'https://www.joshwcomeau.com/css/interactive-guide-to-flexbox/'],
  ['mdn', 'https://developer.mozilla.org/en-US/docs/Web/CSS/position'],
  ['stripe-docs', 'https://docs.stripe.com/payments/accept-a-payment'],
  ['astro-docs', 'https://docs.astro.build/en/guides/markdown-content/'],
  ['vercel-docs', 'https://vercel.com/docs/frameworks/frontend/astro'],
  ['overreacted', 'https://overreacted.io/'],
  ['leerob', 'https://leerob.com/'],
  ['smashing', 'https://www.smashingmagazine.com/'],
  ['linear-docs', 'https://linear.app/docs'],
  ['tailwind-docs', 'https://tailwindcss.com/docs/installation/using-vite'],
];
for (const [name, url] of JOBS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', locale: 'en-US' });
  const page = await ctx.newPage();
  await page.route('**/*', (route) => { const t = route.request().resourceType(); if (t === 'image' || t === 'media' || t === 'font') return route.abort().catch(() => {}); return route.continue().catch(() => {}); });
  const rec = { url, ok: false };
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    rec.status = resp ? resp.status() : null; rec.finalUrl = page.url(); rec.title = await page.title();
    await page.waitForTimeout(3500);
    // for index pages, follow a plausible article link
    if (['overreacted','leerob','smashing','linear-docs'].includes(name)) {
      const h = await page.evaluate(() => { const a = [...document.querySelectorAll('a[href]')].map(x=>x.href).filter(u => /\/\d{4}\/|\/blog\/|\/posts?\/|overreacted\.io\/[a-z0-9-]{6,}|leerob\.com\/[a-z0-9-]{4,}|smashingmagazine\.com\/\d{4}\//.test(u)); return a.slice(0,4); });
      rec.foundLinks = h;
      if (h.length) { await page.goto(h[0], { waitUntil: 'domcontentloaded', timeout: 30000 }); await page.waitForTimeout(3000); rec.articleUrl = page.url(); rec.articleTitle = await page.title(); }
    }
    rec.data = await page.evaluate(PROBE);
    rec.ok = true;
  } catch (e) { rec.error = String(e).slice(0, 250); }
  results[name] = rec;
  console.log('DONE', name, rec.ok ? ('ok ' + (rec.articleUrl || rec.finalUrl)) : 'FAIL ' + rec.error);
  await ctx.close().catch(() => {});
}
await browser.close();
fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log('WROTE', OUT, fs.statSync(OUT).size);
