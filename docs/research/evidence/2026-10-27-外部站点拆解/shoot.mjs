import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SHOTS = 'C:/temp/audit/shots';
const OUT = 'C:/temp/audit';
const PORT = Number(process.env.CDP_PORT || 9444);
const SITES = JSON.parse(process.env.SITES_JSON || '[]');
const PROBE = fs.readFileSync('C:/temp/audit/probe.js', 'utf8');
const SCROLL = '(async () => { const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += 500) { window.scrollTo(0, y); await new Promise(function(r){ setTimeout(r, 90); }); } window.scrollTo(0, 0); await new Promise(function(r){ setTimeout(r, 700); }); })()';

class CDP {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); this.ws = null; }
  async connect() {
    const self = this;
    this.ws = new WebSocket(this.url);
    await new Promise(function (res, rej) { self.ws.onopen = function () { res(); }; self.ws.onerror = function () { rej(new Error('ws error')); }; });
    this.ws.onmessage = function (ev) {
      const msg = JSON.parse(ev.data);
      if (msg.id && self.pending.has(msg.id)) {
        const p = self.pending.get(msg.id); self.pending.delete(msg.id);
        if (msg.error) p.rej(new Error(msg.error.message)); else p.res(msg.result);
      }
    };
  }
  send(method, params, timeout) {
    const self = this; const id = ++this.id; const t = timeout || 30000;
    params = params || {};
    return new Promise(function (res, rej) {
      self.pending.set(id, { res: res, rej: rej });
      self.ws.send(JSON.stringify({ id: id, method: method, params: params }));
      setTimeout(function () { if (self.pending.has(id)) { self.pending.delete(id); rej(new Error('timeout ' + method)); } }, t);
    });
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

async function waitPage(port) {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + port + '/json/list');
      const list = await r.json();
      const page = list.find(function (t) { return t.type === 'page' && t.webSocketDebuggerUrl; });
      if (page) return page;
    } catch (e) {}
    await sleep(250);
  }
  throw new Error('no devtools page');
}

const results = [];

for (const site of SITES) {
  const profile = 'C:\\temp\\audit\\profile-' + site.key;
  fs.rmSync(profile, { recursive: true, force: true });
  const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--lang=zh-CN', site.url], { stdio: 'ignore' });
  let cdp = null;
  const rec = { key: site.key, url: site.url };
  try {
    const page = await waitPage(PORT);
    cdp = new CDP(page.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(2600);
    await cdp.send('Runtime.evaluate', { expression: SCROLL, awaitPromise: true }, 90000);
    await sleep(1200);
    const probe = await cdp.send('Runtime.evaluate', { expression: PROBE, returnByValue: true }, 60000);
    rec.probe = probe.result.value;
    const lm = await cdp.send('Page.getLayoutMetrics');
    const cs2 = lm.cssContentSize || lm.contentSize;
    const fullH = Math.min(Math.round(cs2.height), 16000);
    rec.contentSize = { w: Math.round(cs2.width), h: Math.round(cs2.height) };
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1440, height: fullH, scale: 1 } }, 120000);
    fs.writeFileSync(SHOTS + '/' + site.key + '-desktop-full.png', Buffer.from(shot.data, 'base64'));
    await cdp.send('Runtime.evaluate', { expression: 'window.scrollTo(0,0)' });
    await sleep(600);
    const vp = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(SHOTS + '/' + site.key + '-desktop-top.png', Buffer.from(vp.data, 'base64'));
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(1600);
    await cdp.send('Runtime.evaluate', { expression: SCROLL, awaitPromise: true }, 90000);
    await sleep(1000);
    const p2 = await cdp.send('Runtime.evaluate', { expression: PROBE, returnByValue: true }, 60000);
    rec.mobile = p2.result.value;
    const lm2 = await cdp.send('Page.getLayoutMetrics');
    const cs3 = lm2.cssContentSize || lm2.contentSize;
    const mh = Math.min(Math.round(cs3.height), 16000);
    const mshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: mh, scale: 1 } }, 120000);
    fs.writeFileSync(SHOTS + '/' + site.key + '-mobile-full.png', Buffer.from(mshot.data, 'base64'));
    const links = await cdp.send('Runtime.evaluate', { expression: 'Array.from(document.querySelectorAll("a[href]")).map(function(a){return a.href})', returnByValue: true });
    rec.links = Array.from(new Set(links.result.value || [])).slice(0, 60);
  } catch (e) {
    rec.error = String(e && e.stack || e).slice(0, 600);
  } finally {
    try { if (cdp) cdp.close(); } catch (e) {}
    child.kill();
    await sleep(700);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  }
  results.push(rec);
  fs.writeFileSync(OUT + '/probe-' + site.key + '.json', JSON.stringify(rec, null, 1));
  console.log('done ' + site.key + ' ' + (rec.error ? 'ERROR ' + rec.error : 'ok h=' + (rec.contentSize && rec.contentSize.h)));
}
fs.writeFileSync(OUT + '/probe-index.json', JSON.stringify(results.map(function(r){ return { key: r.key, error: r.error, contentSize: r.contentSize }; }), null, 1));