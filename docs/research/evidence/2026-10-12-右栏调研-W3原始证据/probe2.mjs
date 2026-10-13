
import { chromium } from 'file:///C:/dev/pm-forge/toolkit/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const out = { pages: {} };
const lists = ['/case-studies/','/analysis/','/dissections/','/toolbox/reports/'];
const hrefs = [];
for (const l of lists) {
  await page.goto('http://127.0.0.1:4321' + l, { waitUntil: 'domcontentloaded', timeout: 15000 });
  const hs = await page.evaluate((pre) => [...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h && h.startsWith(pre) && h.replace(pre,'').split('/').filter(Boolean).length===1).slice(0,2), l);
  hrefs.push(...hs);
}
for (const h of hrefs) {
  try {
    await page.goto('http://127.0.0.1:4321' + h, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(300);
    out.pages[h] = await page.evaluate(() => {
      const body = document.querySelector('.max-w-readable');
      const h2s = [...(body ? body.querySelectorAll('h2') : [])];
      const h3s = [...(body ? body.querySelectorAll('h3') : [])];
      const probeEl = document.createElement('span');
      probeEl.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:13px;line-height:1.25;font-family:' + getComputedStyle(document.body).fontFamily;
      document.body.appendChild(probeEl);
      const widths = h2s.map(x => { probeEl.textContent = x.textContent.trim(); return Math.round(probeEl.getBoundingClientRect().width); });
      probeEl.remove();
      return { h2: h2s.map(x=>({t:x.textContent.trim(), id:x.id})), h3: h3s.length, maxH2TextWidth: Math.max(0,...widths), docH: document.documentElement.scrollHeight, bodyW: body ? Math.round(body.getBoundingClientRect().width) : null };
    });
  } catch(e) { out.pages[h] = { err: String(e).slice(0,90) }; }
}
await b.close();
fs.writeFileSync('C:/dev/pm-forge/_w3/project2.json', JSON.stringify(out, null, 1));
for (const [k,v] of Object.entries(out.pages)) { console.log('\n' + k + '  h2=' + (v.h2?v.h2.length:'?') + ' h3=' + v.h3 + ' maxH2TextWidth@13px=' + v.maxH2TextWidth + ' docH=' + v.docH); (v.h2||[]).forEach(x=>console.log('   - [' + x.id + '] ' + x.t.slice(0,60))); }
