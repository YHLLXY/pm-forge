(() => {
  const cs = (el) => getComputedStyle(el);
  const px = (v) => parseFloat(v) || 0;
  const rootCS = cs(document.documentElement);
  const bodyCS = cs(document.body);
  const props = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
    if (!rules) continue;
    for (const r of rules) {
      if (r.type === CSSRule.STYLE_RULE && r.selectorText && r.selectorText.indexOf(':root') >= 0) {
        for (const p of r.style) { if (p.indexOf('--') === 0) props.push([p, r.style.getPropertyValue(p).trim()]); }
      }
    }
  }
  const els = Array.from(document.querySelectorAll('body *'));
  const counter = (fn) => { const m = new Map(); for (const e of els) { const v = fn(e); if (!v) continue; m.set(v, (m.get(v) || 0) + 1); } return Array.from(m).sort((a,b)=>b[1]-a[1]); };
  const colors = counter((e) => { const c = cs(e).color; return c === 'rgb(0, 0, 0)' ? null : c; });
  const bgs = counter((e) => { const b = cs(e).backgroundColor; return (b === 'rgba(0, 0, 0, 0)' || b === 'transparent') ? null : b; });
  const fonts = counter((e) => cs(e).fontFamily.split(',')[0].replace(/["']/g, '').trim());
  const sizes = counter((e) => { const t = e.textContent && e.textContent.trim(); return t ? Math.round(px(cs(e).fontSize)) : null; });
  const weights = counter((e) => { const t = e.textContent && e.textContent.trim(); return t ? cs(e).fontWeight : null; });
  const radii = counter((e) => { const r = px(cs(e).borderTopLeftRadius); return r ? r : null; });
  const shadows = counter((e) => { const s = cs(e).boxShadow; return (s && s !== 'none') ? s.slice(0, 90) : null; });
  const transitions = els.filter((e) => { const t = cs(e).transitionDuration; return t && t !== '0s' && parseFloat(t) > 0; }).length;
  const anims = els.filter((e) => { const a = cs(e).animationName; return a && a !== 'none'; }).length;
  const animNames = counter((e) => { const a = cs(e).animationName; return (a && a !== 'none') ? a : null; });
  const gradients = els.filter((e) => { const b = cs(e).backgroundImage; return b && b.indexOf('gradient') >= 0; }).length;
  const blur = els.filter((e) => { const b = cs(e).backdropFilter; return b && b !== 'none'; }).length;
  const sticky = els.filter((e) => cs(e).position === 'sticky').length;
  const fixed = els.filter((e) => cs(e).position === 'fixed').length;
  const outline = [];
  document.querySelectorAll('h1,h2,h3,h4').forEach((h) => { const t = h.textContent.trim().replace(/\s+/g, ' '); if (t) outline.push([h.tagName, t.slice(0, 70)]); });
  const sections = [];
  const cand = Array.from(document.querySelectorAll('section, header, footer, main > div, body > div')).slice(0, 60);
  for (const s of cand) { const r = s.getBoundingClientRect(); if (r.height < 80) continue; sections.push({ tag: s.tagName.toLowerCase(), id: s.id || '', cls: (s.className && s.className.toString ? s.className.toString() : '').slice(0, 90), h: Math.round(r.height), w: Math.round(r.width) }); }
  const res = performance.getEntriesByType('resource');
  const byType = {};
  for (const r of res) { const k = r.initiatorType; byType[k] = (byType[k] || 0) + 1; }
  const big = res.filter((r) => r.transferSize > 50000).sort((a, b) => b.transferSize - a.transferSize).slice(0, 25).map((r) => [Math.round(r.transferSize / 1024) + 'KB', r.name.slice(-90)]);
  const media = { img: document.querySelectorAll('img').length, svg: document.querySelectorAll('svg').length, video: document.querySelectorAll('video').length, canvas: document.querySelectorAll('canvas').length, picture: document.querySelectorAll('picture').length, iframe: document.querySelectorAll('iframe').length, source: document.querySelectorAll('source').length };
  const fontList = []; document.fonts.forEach((f) => fontList.push([f.family, f.weight, f.style, f.status]));
  const scrollSnap = els.filter((e) => cs(e).scrollSnapType && cs(e).scrollSnapType !== 'none').length;
  return {
    url: location.href, title: document.title,
    docHeight: Math.round(document.documentElement.scrollHeight), docWidth: Math.round(document.documentElement.scrollWidth),
    innerWidth: innerWidth, innerHeight: innerHeight,
    bodyBg: bodyCS.backgroundColor, rootFontSize: rootCS.fontSize, bodyFont: bodyCS.fontFamily,
    lang: document.documentElement.lang,
    propsCount: props.length, props: props.slice(0, 120),
    colors: colors.slice(0, 25), bgs: bgs.slice(0, 25), fonts: fonts.slice(0, 12), sizes: sizes.slice(0, 25), weights: weights.slice(0, 10),
    radii: radii.slice(0, 15), shadows: shadows.slice(0, 12), animNames: animNames.slice(0, 20),
    transitions: transitions, anims: anims, gradients: gradients, blur: blur, sticky: sticky, fixed: fixed, scrollSnap: scrollSnap,
    outline: outline.slice(0, 80), sections: sections, media: media, fontList: fontList.slice(0, 25),
    nodes: document.querySelectorAll('*').length, resources: res.length, byType: byType, big: big,
    hasHorizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
    navText: (document.querySelector('nav, header') ? document.querySelector('nav, header').innerText.replace(/\s+/g, ' ').slice(0, 400) : ''),
    bodyText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 3000)
  };
})()