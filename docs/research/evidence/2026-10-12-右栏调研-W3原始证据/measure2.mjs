
import { chromium } from 'file:///C:/dev/pm-forge/toolkit/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const OUT = process.argv[2];
const SITES = [
  ['joshwcomeau', 'https://www.joshwcomeau.com/css/interactive-guide-to-flexbox/'],
  ['overreacted', 'https://overreacted.io/why-do-react-hooks-depend-on-arrays/'],
  ['leerob', 'https://leerob.io/blog/static-tweets'],
  ['smashing', 'https://www.smashingmagazine.com/2024/05/modern-css-carousel/'],
  ['stripe-docs', 'https://docs.stripe.com/payments/accept-a-payment'],
  ['linear-docs', 'https://linear.app/docs/keyboard-shortcuts'],
  ['vercel-docs', 'https://vercel.com/docs/frameworks/frontend/astro'],
  ['tailwind-docs', 'https://tailwindcss.com/docs/installation/using-vite'],
  ['astro-docs', 'https://docs.astro.build/en/guides/markdown-content/'],
  ['mdn', 'https://developer.mozilla.org/en-US/docs/Web/CSS/position'],
];

const PROBE = () => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) }; };
  const info = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 220), id: el.id || null, rect: box(el),
      position: cs.position, top: cs.top, maxHeight: cs.maxHeight, width: cs.width, maxWidth: cs.maxWidth, padding: cs.padding, margin: cs.margin,
      fontSize: cs.fontSize, lineHeight: cs.lineHeight, fontWeight: cs.fontWeight, color: cs.color, bg: cs.backgroundColor,
      borderLeft: cs.borderLeftWidth + ' ' + cs.borderLeftStyle + ' ' + cs.borderLeftColor,
      borderRight: cs.borderRightWidth + ' ' + cs.borderRightStyle + ' ' + cs.borderRightColor,
      overflowY: cs.overflowY, letterSpacing: cs.letterSpacing, fontFamily: cs.fontFamily.slice(0, 90), textTransform: cs.textTransform };
  };
  // collect verbatim CSS rules that match el (style rules + media-rule children)
  const matched = (el, re, limit) => {
    if (!el) return [];
    const out = [];
    const walk = (rules, media) => {
      for (const rule of rules) {
        if (out.length >= (limit || 14)) return;
        if (rule.cssRules && rule.conditionText !== undefined) { walk(rule.cssRules, '@media ' + rule.conditionText); continue; }
        if (!rule.selectorText) continue;
        let m = false; try { m = el.matches(rule.selectorText); } catch { m = false; }
        if (!m) continue;
        const t = rule.style.cssText || '';
        if (re && !re.test(t)) continue;
        out.push({ media: media || null, sel: rule.selectorText.slice(0, 200), css: t.slice(0, 700) });
      }
    };
    for (const sheet of document.styleSheets) { let r; try { r = sheet.cssRules; } catch { continue; } if (r) walk(r, null); }
    return out;
  };

  const res = { vw: innerWidth, vh: innerHeight, url: location.href, docH: document.documentElement.scrollHeight };
  const all = [...document.querySelectorAll('body *')];

  // ---- article body detection ----
  const paras = [...document.querySelectorAll('article p, main p, [class*=prose] p, p')]
    .filter(p => p.textContent.trim().length > 120 && p.getBoundingClientRect().width > 100 && p.getBoundingClientRect().top > 0);
  let bodyEl = null;
  if (paras.length) {
    const best = paras[Math.max(0, Math.floor(paras.length / 3))];
    const pr = best.getBoundingClientRect();
    let cur = best;
    while (cur.parentElement) { const r = cur.parentElement.getBoundingClientRect(); if (Math.abs(r.width - pr.width) < 8 && r.width < innerWidth * 0.95) cur = cur.parentElement; else break; }
    bodyEl = cur;
  }
  res.body = info(bodyEl);
  res.bodyRules = matched(bodyEl, /max-width|width|grid|column|padding|margin|font-size|line-height/, 12);
  if (bodyEl) { const fp = bodyEl.querySelector('p'); if (fp) { const cs = getComputedStyle(fp); const r = fp.getBoundingClientRect(); res.bodyFirstP = { fontSize: cs.fontSize, lineHeight: cs.lineHeight, color: cs.color, width: Math.round(r.width), marginBottom: cs.marginBottom }; } }

  // ---- ancestor chain, and the grid parent ----
  res.ancestors = []; let a = bodyEl, guard = 0;
  while (a && a !== document.documentElement && guard++ < 12) {
    const r = a.getBoundingClientRect(); const cs = getComputedStyle(a);
    res.ancestors.push({ tag: a.tagName.toLowerCase(), cls: (typeof a.className === 'string' ? a.className : '').slice(0, 170), box: box(a), maxWidth: cs.maxWidth, padL: cs.paddingLeft, padR: cs.paddingRight, display: cs.display, gtc: cs.gridTemplateColumns, gap: cs.gap });
    a = a.parentElement;
  }
  // find grid ancestor with multiple columns
  let grid = null, g2 = bodyEl, gg = 0;
  while (g2 && gg++ < 10) { const cs = getComputedStyle(g2); if (cs.display === 'grid' && cs.gridTemplateColumns.split(' ').length > 1) { grid = g2; break; } g2 = g2.parentElement; }
  res.gridParent = grid ? { ...info(grid), gtc: getComputedStyle(grid).gridTemplateColumns, gap: getComputedStyle(grid).gap, rules: matched(grid, /grid|gap|width|column/, 10) } : null;

  // ---- right-side sidebar candidates ----
  const cands = [];
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width < 90 || r.width > 480 || r.height < 60) continue;
    const cs = getComputedStyle(el);
    const isAside = ['ASIDE', 'NAV'].includes(el.tagName);
    const sticky = cs.position === 'sticky' || cs.position === 'fixed';
    if (!sticky && !isAside) continue;
    if (r.left < innerWidth * 0.5) continue;
    cands.push({ el, r, sticky, isAside });
  }
  cands.sort((p, q) => (q.sticky - p.sticky) || (q.r.height - p.r.height));
  res.sidebars = cands.slice(0, 4).map(c => {
    const i = info(c.el);
    const leaves = [...c.el.querySelectorAll('*')].filter(k => k.children.length === 0 && k.textContent.trim().length > 1 && k.textContent.trim().length < 90);
    const act = [...c.el.querySelectorAll('[aria-current],[class*=active],[class*=current],[data-active],[aria-selected]')].slice(0, 6)
      .map(k => { const s = getComputedStyle(k); const bs = getComputedStyle(k, '::before'); const af = getComputedStyle(k, '::after'); const kr = k.getBoundingClientRect();
        return { t: k.textContent.trim().slice(0, 40), cls: (typeof k.className === 'string' ? k.className : '').slice(0, 140), aria: k.getAttribute('aria-current'), color: s.color, fw: s.fontWeight, bg: s.backgroundColor,
          borderLeft: s.borderLeftWidth + ' ' + s.borderLeftStyle + ' ' + s.borderLeftColor, borderRight: s.borderRightWidth + ' ' + s.borderRightStyle + ' ' + s.borderRightColor,
          padL: s.paddingLeft, beforeContent: bs.content, beforeBg: bs.backgroundColor, beforeW: bs.width, afterContent: af.content, afterBg: af.backgroundColor, w: Math.round(kr.width), x: Math.round(kr.x), fs: s.fontSize }; });
    return { ...i, sticky: c.sticky, isAside: c.isAside,
      rules: matched(c.el, /position|top|width|max-height|overflow|border|padding|font-size|color|background|gap/, 16),
      leaves: leaves.slice(0, 20).map(k => ({ t: k.textContent.trim().slice(0, 40), fs: getComputedStyle(k).fontSize, lh: getComputedStyle(k).lineHeight, fw: getComputedStyle(k).fontWeight, c: getComputedStyle(k).color, tag: k.tagName.toLowerCase(), cls: (typeof k.className === 'string' ? k.className : '').slice(0, 110), tt: getComputedStyle(k).textTransform, ls: getComputedStyle(k).letterSpacing })),
      activeItems: act };
  });
  if (bodyEl && res.sidebars.length) { const br = bodyEl.getBoundingClientRect(); res.gaps = res.sidebars.map(s => ({ sidebarX: s.rect.x, gap: s.rect.x - Math.round(br.right) })); }

  res.progress = all.filter(el => { const c = (typeof el.className === 'string' ? el.className : '') + ' ' + (el.id || ''); return /progress|reading-?time|scroll-?indicator/i.test(c) || el.tagName === 'PROGRESS'; }).slice(0, 6)
    .map(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 130), box: box(el), pos: cs.position, bg: cs.backgroundColor, transform: cs.transform, height: cs.height, width: cs.width }; });
  res.toTop = all.filter(el => /back-?to-?top|to-?top|scroll-?top|scrollTop/i.test((typeof el.className === 'string' ? el.className : '') + ' ' + (el.id || ''))).slice(0, 5)
    .map(el => { const cs = getComputedStyle(el); return { tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 130), pos: cs.position, box: box(el) }; });

  const vars = {};
  for (const sheet of document.styleSheets) { let rules; try { rules = sheet.cssRules; } catch { continue; } if (!rules) continue;
    for (const rule of rules) { if (rule.selectorText && /:root|^html/.test(rule.selectorText) && rule.style) { for (const p of rule.style) if (p.startsWith('--')) vars[p] = rule.style.getPropertyValue(p).trim().slice(0, 60); } } }
  res.cssVars = Object.fromEntries(Object.entries(vars).filter(([k, v]) => /width|size|col|gap|space|toc|side|prose|content|measure|container|margin|line/i.test(k + v)).slice(0, 50));

  res.h2count = document.querySelectorAll('h2').length;
  res.tocLinks = document.querySelectorAll('aside a[href^="#"], nav a[href^="#"], [class*=toc] a, [class*=TableOfContents] a, a[href^="#"]').length;
  return res;
};

const browser = await chromium.launch({ headless: true });
const results = {};
for (const [name, url] of SITES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', locale: 'en-US' });
  const page = await ctx.newPage();
  await page.route('**/*', (route) => { const t = route.request().resourceType(); if (t === 'image' || t === 'media') return route.abort().catch(() => {}); return route.continue().catch(() => {}); });
  const rec = { url, ok: false };
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    rec.status = resp ? resp.status() : null; rec.finalUrl = page.url();
    await page.waitForTimeout(3500);
    rec.data = await page.evaluate(PROBE);
    // scroll down to trigger TOC active state
    await page.evaluate(() => window.scrollTo(0, Math.round(document.documentElement.scrollHeight * 0.45)));
    await page.waitForTimeout(1800);
    rec.afterScroll = await page.evaluate(() => {
      const act = [...document.querySelectorAll('aside [class*=active], aside [aria-current], nav [class*=active], nav [aria-current], [class*=toc] [class*=active], [class*=toc] [aria-current]')].slice(0, 6)
        .map(k => { const s = getComputedStyle(k); const bs = getComputedStyle(k, '::before'); const kr = k.getBoundingClientRect();
          return { t: k.textContent.trim().slice(0, 40), cls: (typeof k.className === 'string' ? k.className : '').slice(0, 130), color: s.color, fw: s.fontWeight, bg: s.backgroundColor, borderLeft: s.borderLeftWidth + ' ' + s.borderLeftStyle + ' ' + s.borderLeftColor, padL: s.paddingLeft, x: Math.round(kr.x), w: Math.round(kr.width), beforeContent: bs.content, beforeBg: bs.backgroundColor, beforeW: bs.width, beforeH: bs.height, beforePos: bs.position, opacity: s.opacity }; });
      // any sticky element top value that changed
      const st = [...document.querySelectorAll('*')].filter(e => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return c.position === 'sticky' && r.width > 90 && r.width < 480 && r.left > innerWidth * 0.5; }).slice(0, 4)
        .map(e => ({ cls: (typeof e.className === 'string' ? e.className : '').slice(0, 110), top: getComputedStyle(e).top, y: Math.round(e.getBoundingClientRect().y), h: Math.round(e.getBoundingClientRect().height) }));
      return { active: act, stickies: st, scrollY: Math.round(window.scrollY) };
    });
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(1500);
    rec.mobile = await page.evaluate(() => {
      const sels = ['aside', '[class*=toc]', '[class*=TableOfContents]', '[class*=sidebar]', '[class*=Sidebar]'];
      const found = [];
      for (const s of sels) for (const e of document.querySelectorAll(s)) { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); found.push({ sel: s, cls: (typeof e.className === 'string' ? e.className : '').slice(0, 90), w: Math.round(r.width), x: Math.round(r.x), y: Math.round(r.y), display: cs.display, pos: cs.position, visibility: cs.visibility }); }
      const bp = document.querySelector('article p, main p, [class*=prose] p, p'); const br = bp ? bp.getBoundingClientRect() : null;
      return { found: found.slice(0, 10), vw: innerWidth, bodyW: br ? Math.round(br.width) : null, bodyFs: bp ? getComputedStyle(bp).fontSize : null };
    });
    rec.ok = true;
  } catch (e) { rec.error = String(e).slice(0, 300); }
  results[name] = rec;
  console.log('DONE', name, rec.ok ? 'ok' : 'FAIL ' + rec.error);
  await ctx.close().catch(() => {});
}
await browser.close();
fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log('WROTE', OUT, fs.statSync(OUT).size);
