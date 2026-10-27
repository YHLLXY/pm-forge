// docs/tools/shoot-url.mjs —— 抓单个远程页面（1440×810 首屏），用于案例卡真图
// 用法：node docs/tools/shoot-url.mjs --url https://example.com/ --out C:\temp\x.png --width 1440 --height 810
import { spawn } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf("--" + n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const URL_ = arg("url");
const OUT = arg("out");
const W = Number(arg("width", "1440"));
const H = Number(arg("height", "810"));
const PORT = Number(arg("port", "4601"));

if (!URL_ || !OUT) {
  console.error("缺 --url 或 --out");
  process.exit(1);
}

const BROWSER = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find(p => existsSync(p));
if (!BROWSER) {
  console.error("未找到 Edge");
  process.exit(1);
}

class CDP {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
  }
  async connect() {
    const self = this;
    this.ws = new WebSocket(this.url);
    await new Promise((res, rej) => {
      self.ws.onopen = () => res();
      self.ws.onerror = () => rej(new Error("ws error"));
    });
    this.ws.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && self.pending.has(msg.id)) {
        const p = self.pending.get(msg.id);
        self.pending.delete(msg.id);
        if (msg.error) p.rej(new Error(msg.error.message));
        else p.res(msg.result);
      }
    };
  }
  send(method, params, timeout) {
    const self = this;
    const id = ++this.id;
    return new Promise((res, rej) => {
      self.pending.set(id, { res, rej });
      self.ws.send(JSON.stringify({ id, method, params: params || {} }));
      setTimeout(() => {
        if (self.pending.has(id)) {
          self.pending.delete(id);
          rej(new Error("timeout " + method));
        }
      }, timeout || 30000);
    });
  }
  close() {
    try {
      this.ws.close();
    } catch {}
  }
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

const profile = "C:\\temp\\shoot-url-" + Date.now();
rmSync(profile, { recursive: true, force: true });
const child = spawn(
  BROWSER,
  [
    "--headless=new",
    "--remote-debugging-port=" + PORT,
    "--user-data-dir=" + profile,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=2",
    "--lang=zh-CN",
    "about:blank",
  ],
  { stdio: "ignore" }
);

let cdp = null;
try {
  const page = await waitPage(PORT);
  cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: W,
    height: H,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await cdp.send("Page.navigate", { url: URL_ });
  await sleep(Number(arg("wait", "4000")));
  // 有些站在首屏放"点击任意处跳过"的启动页：--click 先点一下中间，再等 --after 毫秒后截图
  if (argv.includes("--click")) {
    const x = Math.round(W / 2);
    const y = Math.round(H / 2);
    for (const type of ["mousePressed", "mouseReleased"]) {
      await cdp.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
    }
    await sleep(Number(arg("after", "2500")));
  }
  const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, 60000);
  writeFileSync(OUT, Buffer.from(shot.data, "base64"));
  console.log("saved " + OUT);
} finally {
  try {
    if (cdp) cdp.close();
  } catch {}
  child.kill();
  await sleep(500);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {}
}
