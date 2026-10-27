
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'C:/temp/audit/raw';
const CSS = 'C:/temp/audit/css';

const SITES = [
  { key: 'fadian', url: 'https://fadian.icu/' },
  { key: 'codeghub', url: 'https://webapp.codeghub.com/release/app/admin/home/index.html' },
  { key: 'international', url: 'https://international.cqupt.edu.cn/' },
  { key: 'uc', url: 'https://uc.cqupt.edu.cn/' },
  { key: 'ours', url: 'https://www.yuhailinlxy.com/' },
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function collect(html, base) {
  const abs = (u) => { try { return new URL(u, base).href; } catch { return null; } };
  const out = { scripts: [], styles: [], images: [], inlineStyles: 0, inlineScripts: 0, fonts: [] };
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    const a = m[1];
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(a);
    if (src) out.scripts.push(abs(src[1])); else out.inlineScripts++;
  }
  for (const m of html.matchAll(/<link\b([^>]*)>/gi)) {
    const a = m[1];
    const rel = /\brel\s*=\s*["']([^"']+)["']/i.exec(a);
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(a);
    if (!href || !rel) continue;
    const r = rel[1].toLowerCase();
    if (r.includes('stylesheet')) out.styles.push(abs(href[1]));
    else if (r.includes('preload') || r.includes('icon') || r.includes('manifest')) out.fonts.push(abs(href[1]));
  }
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    out.inlineStyles += m[1].length;
  }
  for (const m of html.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) out.images.push(abs(m[1]));
  return out;
}

const summary = [];

for (const s of SITES) {
  const rec = { key: s.key, url: s.url };
  try {
    const t0 = Date.now();
    const res = await fetch(s.url, { headers: { 'user-agent': UA, 'accept-language': 'zh-CN,zh;q=0.9' }, redirect: 'follow' });
    const html = await res.text();
    rec.status = res.status;
    rec.htmlBytes = Buffer.byteLength(html);
    rec.ms = Date.now() - t0;
    fs.writeFileSync(path.join(OUT, s.key + '.html'), html, 'utf8');
    const c = collect(html, res.url);
    rec.assets = { scripts: c.scripts.length, styles: c.styles.length, imgs: c.images.length, inlineCssBytes: c.inlineStyles, inlineJsCount: c.inlineScripts };
    rec.scripts = c.scripts.slice(0, 20);
    rec.styles = c.styles.slice(0, 20);
    rec.title = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [, ''])[1].trim();
    rec.desc = ((/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html) || [, ''])[1] || '').slice(0, 200);
    rec.og = /property=["']og:image["']/i.test(html);

    // fetch stylesheets
    let i = 0;
    for (const u of [...new Set(c.styles)].slice(0, 8)) {
      try {
        const r2 = await fetch(u, { headers: { 'user-agent': UA } });
        const t = await r2.text();
        const name = s.key + '-' + (i++) + '.css';
        fs.writeFileSync(path.join(CSS, name), t, 'utf8');
        rec.styles && rec.stylesFetched;
        (rec.fetchedCss ||= []).push({ url: u, bytes: Buffer.byteLength(t), file: name });
      } catch (e) { (rec.err ||= []).push('css ' + u + ': ' + e.message); }
    }
  } catch (e) {
    rec.error = String(e && e.message || e);
  }
  summary.push(rec);
}

fs.writeFileSync('C:/temp/audit/summary.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2).slice(0, 6000));
