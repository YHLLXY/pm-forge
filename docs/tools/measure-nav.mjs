// docs/tools/measure-nav.mjs —— 量「点卡片 / 点返回」到页面真正换掉的时间（毫秒）
// 用法：node docs/tools/measure-nav.mjs --url http://localhost:4321/case-studies/ --runs 3
// 依赖：本机 Edge 的 CDP（与 docs/tools/shoot-url.mjs 同一套做法）
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf("--" + n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const URL_ = arg("url", "http://localhost:4321/case-studies/");
const RUNS = Number(arg("runs", "3"));
const PORT = Number(arg("port", "4621"));
const LINK_SEL = arg("link", "a[href*='/case-studies/']");
const BACK_SEL = arg("back", "#back-button");

const BROWSER = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find(p => existsSync(p));
if (!BROWSER) { console.error("未找到 Edge"); process.exit(1); }

class CDP {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); }
  async connect() {
    const self = this;
    this.ws = new WebSocket(this.url);
    await new Promise((res, rej) => { self.ws.onopen = () => res(); self.ws.onerror = () => rej(new Error("ws error")); });
    this.ws.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && self.pending.has(msg.id)) {
        const p = self.pending.get(msg.id); self.pending.delete(msg.id);
        if (msg.error) p.rej(new Error(msg.error.message)); else p.res(msg.result);
      }
    };
  }
  send(method, params, timeout) {
    const self = this; const id = ++this.id;
    return new Promise((res, rej) => {
      self.pending.set(id, { res, rej });
      self.ws.send(JSON.stringify({ id, method, params: params || {} }));
      setTimeout(() => { if (self.pending.has(id)) { self.pending.delete(id); rej(new Error("timeout " + method)); } }, timeout || 30000);
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

async function waitPage(port) {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch("http://127.0.0.1:" + port + "/json/list");
      const list = await r.json();
      const p = list.find(t => t.type === "page" && t.webSocketDebuggerUrl);
      if (p) return p;
    } catch {}
    await sleep(250);
  }
  throw new Error("devtools 未就绪");
}

const INSTRUMENT = [
  "(function(){",
  "  if (window.__navlog) return;",
  "  window.__navlog = [];",
  "  var push = function(ev, extra){ window.__navlog.push(Object.assign({ ev: ev, t: performance.now() }, extra || {})); };",
  "  document.addEventListener(\"click\", function(e){",
  "    var a = e.target && e.target.closest ? e.target.closest(\"a\") : null;",
  "    push(\"click\", { href: a ? a.getAttribute(\"href\") : null, onLink: !!a });",
  "  }, true);",
  "  document.addEventListener(\"astro:before-preparation\", function(){ push(\"before-preparation\"); });",
  "  document.addEventListener(\"astro:after-swap\", function(){ push(\"after-swap\"); });",
  "  document.addEventListener(\"astro:page-load\", function(){ push(\"page-load\"); });",
  "  window.addEventListener(\"popstate\", function(){ push(\"popstate\"); });",
  "})();",
].join("\n");

const evalJs = async (cdp, expr) => {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("eval: " + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description));
  return r.result.value;
};

const clickSel = async (cdp, sel) => {
  await evalJs(cdp, "window.__sel = " + JSON.stringify(sel));
  const center = await evalJs(cdp, [
    "(() => {",
    "  const el = document.querySelector(window.__sel);",
    "  if (!el) return null;",
    "  el.scrollIntoView({ block: 'center', behavior: 'instant' });",
    "  const r = el.getBoundingClientRect();",
    "  if (!r.width || !r.height) return null;",
    "  return { x: r.x + Math.min(r.width / 2, 240), y: r.y + Math.min(r.height / 2, 180) };",
    "})()",
  ].join("\n"));
  if (!center) return false;
  await sleep(150);
  for (const type of ["mousePressed", "mouseReleased"]) {
    await cdp.send("Input.dispatchMouseEvent", { type: type, x: Math.round(center.x), y: Math.round(center.y), button: "left", clickCount: 1 });
  }
  return true;
};

const summarize = log => {
  const click = log.find(e => e.ev === "click" && e.onLink);
  if (!click) return null;
  const pick = name => log.find(e => e.ev === name && e.t >= click.t);
  const ms = x => (x ? Math.round(x.t - click.t) : null);
  return { href: click.href, pre: ms(pick("before-preparation")), swap: ms(pick("after-swap")), load: ms(pick("page-load")) };
};

const profile = "C:\\temp\\measure-nav-" + Date.now();
rmSync(profile, { recursive: true, force: true });
const child = spawn(BROWSER, [
  "--headless=new", "--remote-debugging-port=" + PORT, "--user-data-dir=" + profile,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--lang=zh-CN", "about:blank",
], { stdio: "ignore" });

let cdp = null;
try {
  const page = await waitPage(PORT);
  cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: INSTRUMENT });

  for (let i = 1; i <= RUNS; i++) {
    await cdp.send("Page.navigate", { url: URL_ });
    await sleep(2500);
    await evalJs(cdp, "window.__navlog = []; 1");
    const ok = await clickSel(cdp, LINK_SEL);
    if (!ok) { console.log("run " + i + ": 找不到可点元素 " + LINK_SEL); continue; }
    await sleep(3000);
    const log = (await evalJs(cdp, "window.__navlog")) || [];
    const card = summarize(log);
    let back = null;
    const hasBack = await evalJs(cdp, "!!document.querySelector(" + JSON.stringify(BACK_SEL) + ")");
    if (hasBack) {
      await evalJs(cdp, "window.__navlog = []; 1");
      await clickSel(cdp, BACK_SEL);
      await sleep(3000);
      const log2 = (await evalJs(cdp, "window.__navlog")) || [];
      back = summarize(log2);
    }
    console.log(JSON.stringify({ run: i, card: card, back: back }));
  }
} finally {
  try { if (cdp) cdp.close(); } catch {}
  child.kill();
  await sleep(400);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
