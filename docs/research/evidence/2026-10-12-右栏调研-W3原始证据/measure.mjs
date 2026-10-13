
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
  const info = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 240) : null,
      id: el.id || null,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) },
      position: cs.position, top: cs.top, maxHeight: cs.maxHeight, width: cs.width, maxWidth: cs.maxWidth,
      padding: cs.padding, margin: cs.margin,
      fontSize: cs.fontSize, lineHeight: cs.lineHeight, fontWeight: cs.fontWeight,
      color: cs.color, bg: cs.backgroundColor,
      borderLeft: cs.borderLeftWidth + ' ' + cs.borderLeftStyle + ' ' + cs.borderLeftColor,
      borderRight: cs.borderRightWidth + ' ' + cs.borderRightStyle + ' ' + cs.borderRightColor,
      overflowY: cs.overflowY, letterSpacing: cs.letterSpacing,
      fontFamily: cs.fontFamily.slice(0, 90),
    };
  };

  const res = { vw: innerWidth, vh: innerHeight, url: location.href, docH: document.documentElement.scrollHeight };
  const all = [...document.querySelectorAll('body *')];

  const paras = [...document.querySelectorAll('article p, main p, [class*=prose] p, p')]
    .filter(p => p.textContent.trim().length > 120 && p.getBoundingClientRect().width > 100 && p.getBoundingClientRect().top > 0);
  let bodyEl = null;
  if (paras.length) {
    const best = paras[Math.max(0, Math.floor(paras.length / 3))];
    const pr = best.getBoundingClientRect();
    let cur = best;
    while (cur.parentElement) {
      const r = cur.parentElement.getBoundingClientRect();
      if (Math.abs(r.width - pr.width) < 8 && r.width < innerWidth * 0.95) cur = cur.parentElement;
      else break;
    }
    bodyEl = cur;
  }
  res.body = info(bodyEl);
  if (bodyEl) {
    const pcs = getComputedStyle(bodyEl);
    res.bodyText = { fontSize: pcs.fontSize, lineHeight: pcs.lineHeight, color: pcs.color, fontFamily: pcs.fontFamily.slice(0, 80) };
    const fp = bodyEl.querySelector('p');
    if (fp) { const f = info(fp); res.bodyFirstP = { fontSize: f.fontSize, lineHeight: f.lineHeight, color: f.color, width: f.rect.w }; }
  }

  res.ancestors = [];
  let a = bodyEl, guard = 0;
  while (a && a !== document.documentElement && guard++ < 12) {
    const r = a.getBoundingClientRect(); const cs = getComputedStyle(a);
    res.ancestors.push({ tag: a.tagName.toLowerCase(), cls: (typeof a.className === 'string' ? a.className : '').slice(0, 170), w: Math.round(r.width), x: Math.round(r.x), maxWidth: cs.maxWidth, padL: cs.paddingLeft, padR: cs.paddingRight, display: cs.display, gtc: cs.gridTemplateColumns, gap: cs.gap });
    a = a.parentElement;
  }

  const cands = [];
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width < 90 || r.width > 460) continue;
    if (r.height < 60) continue;
    const cs = getComputedStyle(el);
    const isAside = ['ASIDE', 'NAV'].includes(el.tagName);
    const sticky = cs.position === 'sticky' || cs.position === 'fixed';
    if (!sticky && !isAside) continue;
    if (r.left < innerWidth * 0.5) continue;
    cands.push({ el, r, cs, sticky, isAside });
  }
  cands.sort((p, q) => (q.sticky - p.sticky) || (q.r.height - p.r.height));
  res.sidebars = cands.slice(0, 6).map(c => {
    const i = info(c.el);
    const kids = [...c.el.querySelectorAll('*')].slice(0, 600);
    const leaves = kids.filter(k => k.children.length === 0 && k.textContent.trim().length > 1 && k.textContent.trim().length < 90);
    const act = [...c.el.querySelectorAll('[aria-current],[class*=active],[class*=current],[data-active]')].slice(0, 8)
      .map(k => { const s = getComputedStyle(k); const bs = getComputedStyle(k, '::before'); const kr = k.getBoundingClientRect();
        return { t: k.textContent.trim().slice(0, 40), cls: (typeof k.className === 'string' ? k.className : '').slice(0, 140), aria: k.getAttribute('aria-current'), color: s.color, fw: s.fontWeight, bg: s.backgroundColor, borderLeft: s.borderLeftWidth + ' ' + s.borderLeftStyle + ' ' + s.borderLeftColor, padL: s.paddingLeft, beforeContent: bs.content, beforeBg: bs.backgroundColor, beforeW: bs.width, w: Math.round(kr.width) }; });
    return { ...i, sticky: c.sticky, isAside: c.isAside,
      leaves: leaves.slice(0, 25).map(k => ({ t: k.textContent.trim().slice(0, 40), fs: getComputedStyle(k).fontSize, fw: getComputedStyle(k).fontWeight, c: getComputedStyle(k).color, tag: k.tagName.toLowerCase(), cls: (typeof k.className === 'string' ? k.className : '').slice(0, 100), lh: getComputedStyle(k).lineHeight })),
      activeItems: act };
  });

  if (bodyEl && res.sidebars.length) {
    const br = bodyEl.getBoundingClientRect();
    res.gaps = res.sidebars.map(s => ({ sidebarX: s.rect.x, gapFromBodyRight: s.rect.x - Math.round(br.right), sidebarRight: s.rect.right }));
  }

  res.progress = all.filter(el => {
    const c = (typeof el.className === 'string' ? el.className : '') + ' ' + (el.id || '');
    return /progress|reading-?time|scroll-?indicator/i.test(c) || el.tagName === 'PROGRESS';
  }).slice(0, 8).map(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 130), h: Math.round(r.height), w: Math.round(r.width), y: Math.round(r.y), pos: cs.position, bg: cs.backgroundColor, transform: cs.transform }; });

  res.toTop = all.filter(el => /back-?to-?top|to-?top|scroll-?top|scrollTop/i.test((typeof el.className === 'string' ? el.className : '') + ' ' + (el.id || ''))).slice(0, 6).map(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 130), pos: cs.position, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }; });

  const vars = {};
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    if (!rules) continue;
    for (const rule of rules) {
      if (rule.selectorText && /:root|^html/.test(rule.selectorText) && rule.style) {
        for (const p of rule.style) if (p.startsWith('--')) vars[p] = rule.style.getPropertyValue(p).trim().slice(0, 60);
      }
    }
  }
  res.cssVars = Object.fromEntries(Object.entries(vars).filter(([k, v]) => /width|size|col|gap|space|toc|side|prose|content|measure|container|margin/i.test(k + v)).slice(0, 45));

  res.h2count = document.querySelectorAll('h2').length;
  res.tocLinks = document.querySelectorAll('aside a[href^="#"], nav a[href^="#"], [class*=toc] a, [class*=TableOfContents] a').length;
  res.headingsFirst = [...document.querySelectorAll('h2')].slice(0, 4).map(h => ({ id: h.id, t: h.textContent.trim().slice(0, 40), fs: getComputedStyle(h).fontSize }));
  return res;
};

const browser = await chromium.launch({ headless: true });
const results = {};
for (const [name, url] of SITES) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await ctx.newPage();
  await page.route('**/*', (route) => {
    const t = route.request().resourceType();
    if (t === 'image' || t === 'media') return route.abort().catch(() => {});
    return route.continue().catch(() => {});
  });
  const rec = { url, ok: false };
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    rec.status = resp ? resp.status() : null;
    rec.finalUrl = page.url();
    await page.waitForTimeout(3000);
    rec.data = await page.evaluate(PROBE);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1500);
    rec.mobile = await page.evaluate(() => {
      const a = document.querySelector('aside,[class*=toc],[class*=TableOfContents],[class*=sidebar]');
      const r = a ? a.getBoundingClientRect() : null;
      const cs = a ? getComputedStyle(a) : null;
      const bodyP = document.querySelector('article p, main p, p');
      const br = bodyP ? bodyP.getBoundingClientRect() : null;
      return { asideFound: !!a, asideW: r ? Math.round(r.width) : null, asideX: r ? Math.round(r.x) : null, asideDisplay: cs ? cs.display : null, asidePos: cs ? cs.position : null, vw: innerWidth, bodyW: br ? Math.round(br.width) : null, bodyFs: bodyP ? getComputedStyle(bodyP).fontSize : null };
    });
    rec.ok = true;
  } catch (e) { rec.error = String(e).slice(0, 300); }
  results[name] = rec;
  console.log('DONE', name, rec.ok ? 'ok' : 'FAIL ' + rec.error);
  await ctx.close().catch(() => {});
}
await browser.close();
fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log('WROTE', OUT);
