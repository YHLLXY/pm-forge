// docs/tools/shots.mjs —— 用 Edge headless + CDP 对静态产物截图（评审用，不入构建）
// 为什么不用 playwright：lite 依赖，playwright 在 site 的 devDeps 里，但本脚本要能在任意 cwd 跑。
// 用法（在仓库根）：
//   node docs/tools/shots.mjs --root site/dist --out docs/reviews/2026-10-27-P0-1 --pages "/=home" --widths 1440,390
//   node docs/tools/shots.mjs ... --full          # 额外输出整页长图
// 产出：<out>/<name>-<width>.png（首屏），<out>/<name>-<width>-full.png（整页，带 --full）
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf("--" + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const flag = name => argv.includes("--" + name);

const ROOT = resolve(arg("root", "site/dist"));
const OUT = resolve(arg("out", "docs/reviews/shots"));
const PORT = Number(arg("port", "4399"));
const WIDTHS = arg("widths", "1440,390").split(",").map(Number);
const FULL = flag("full");
const PAGES = arg("pages", "/=home").split(",").map(s => {
  const [p, n] = s.split("=");
  return { path: p, name: n || "page" };
});

if (!existsSync(ROOT)) {
  console.error("根目录不存在：" + ROOT);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
};

// 纯静态服务：不用 astro preview 的原因——Astro 7 的 preview 是全局单槽守护，
// 会和 scripts/lh.mjs 抢注册表（那边也在 spawn/stop preview），截图不该被它牵连。
const server = createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split("?")[0]);
  if (rel.endsWith("/")) rel += "index.html";
  let file = join(ROOT, rel);
  try {
    if (statSync(file).isDirectory()) file = join(file, "index.html");
  } catch {
    res.statusCode = 404;
    res.end("404");
    return;
  }
  if (!existsSync(file)) {
    res.statusCode = 404;
    res.end("404");
    return;
  }
  res.setHeader("Content-Type", MIME[extname(file)] || "application/octet-stream");
  res.end(readFileSync(file));
});

function findBrowser() {
  const cands = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const c of cands) if (existsSync(c)) return c;
  throw new Error("未找到 Edge/Chrome");
}

class CDP {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
    this.ws = null;
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

async function main() {
  await new Promise(r => server.listen(PORT, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + PORT;
  const browser = findBrowser();
  const profile = "C:\\temp\\shots-profile-" + Date.now();
  rmSync(profile, { recursive: true, force: true });
  const child = spawn(
    browser,
    [
      "--headless=new",
      "--remote-debugging-port=" + (PORT + 1),
      "--user-data-dir=" + profile,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--lang=zh-CN",
      "about:blank",
    ],
    { stdio: "ignore" }
  );
  let cdp = null;
  try {
    const page = await waitPage(PORT + 1);
    cdp = new CDP(page.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    for (const pg of PAGES) {
      for (const w of WIDTHS) {
        const mobile = w < 600;
        await cdp.send("Emulation.setDeviceMetricsOverride", {
          width: w,
          height: mobile ? 844 : 900,
          deviceScaleFactor: mobile ? 2 : 1,
          mobile,
        });
        await cdp.send("Page.navigate", { url: base + pg.path });
        await sleep(1200);
        // 触底再回顶：让懒加载图与 IntersectionObserver 都跑一遍
        await cdp.send(
          "Runtime.evaluate",
          {
            expression:
              "(async()=>{const H=document.documentElement.scrollHeight;for(let y=0;y<H;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,80));}window.scrollTo(0,0);await new Promise(r=>setTimeout(r,500));})()",
            awaitPromise: true,
          },
          90000
        );
        // 整页截图前把懒加载图强制拉起并等解码：否则截图里的图是空白，
        // 看起来像"图没接上"，其实是证据采集的时序问题（2026-10-27 踩到）。
        await cdp.send(
          "Runtime.evaluate",
          {
            expression:
              "(async()=>{const im=Array.from(document.images);im.forEach(i=>{if(i.loading==='lazy')i.loading='eager';});await Promise.all(im.map(i=>i.decode().catch(()=>null)));return im.length;})()",
            awaitPromise: true,
          },
          60000
        );
        await sleep(500);
        if (arg("eval", "")) {
          const r = await cdp.send(
            "Runtime.evaluate",
            { expression: arg("eval", ""), returnByValue: true, awaitPromise: true },
            60000
          );
          console.log("eval " + pg.name + "-" + w + ": " + JSON.stringify(r.result.value));
        }
        const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, 60000);
        const vpName = pg.name + "-" + w + ".png";
        writeFileSync(join(OUT, vpName), Buffer.from(shot.data, "base64"));
        console.log("shot " + vpName);
        if (FULL) {
          const lm = await cdp.send("Page.getLayoutMetrics");
          const cs = lm.cssContentSize || lm.contentSize;
          const h = Math.min(Math.round(cs.height), 20000);
          const full = await cdp.send(
            "Page.captureScreenshot",
            { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } },
            120000
          );
          const fName = pg.name + "-" + w + "-full.png";
          writeFileSync(join(OUT, fName), Buffer.from(full.data, "base64"));
          console.log("shot " + fName + " (h=" + h + ")");
        }
      }
    }
  } finally {
    try {
      if (cdp) cdp.close();
    } catch {}
    child.kill();
    await sleep(500);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {}
    server.close();
  }
}

main().catch(e => {
  console.error(String((e && e.stack) || e));
  process.exit(1);
});
