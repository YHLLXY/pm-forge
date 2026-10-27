// docs/tools/print-check.mjs —— 检查某一页的"打印版"：出 PDF 数页数 + 截一张 print 媒体下的整页图
// 用法：node docs/tools/print-check.mjs --root site/dist --page /interviewers/ --out C:\temp\print --port 4701
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, rmSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf("--" + n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const ROOT = resolve(arg("root", "site/dist"));
const PAGE = arg("page", "/");
const OUT = resolve(arg("out", "docs/reviews/print"));
const PORT = Number(arg("port", "4701"));
const A4W = 794; // 210mm @96dpi
const A4H = 1123; // 297mm @96dpi

if (!existsSync(ROOT)) {
  console.error("根目录不存在：" + ROOT);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".xml": "application/xml; charset=utf-8" };
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

const BROWSER = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find(p => existsSync(p));
if (!BROWSER) {
  console.error("未找到 Edge");
  process.exit(1);
}

await new Promise(r => server.listen(PORT, "127.0.0.1", r));
const profile = "C:\\temp\\print-profile-" + Date.now();
rmSync(profile, { recursive: true, force: true });
const child = spawn(BROWSER, ["--headless=new", "--remote-debugging-port=" + (PORT + 1), "--user-data-dir=" + profile, "--no-first-run", "--disable-gpu", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });

let cdp = null;
try {
  const page = await waitPage(PORT + 1);
  cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Page.navigate", { url: "http://127.0.0.1:" + PORT + PAGE });
  await sleep(1500);

  // 1) 真出 PDF，数页数（PDF 里每页一个 /Type /Page，/Type /Pages 是目录节点，要减掉）
  const pdf = await cdp.send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true }, 120000);
  const buf = Buffer.from(pdf.data, "base64");
  const pdfPath = join(OUT, "print.pdf");
  writeFileSync(pdfPath, buf);
  const pdfText = buf.toString("latin1");
  const pageCount = (pdfText.match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log("PDF: " + pdfPath + " (" + buf.length + " bytes, " + pageCount + " 页)");

  // 2) print 媒体下截整页，肉眼看排版
  await cdp.send("Emulation.setEmulatedMedia", { media: "print" });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: A4W, height: A4H, deviceScaleFactor: 2, mobile: false });
  await sleep(1200);
  const lm = await cdp.send("Page.getLayoutMetrics");
  const cs = lm.cssContentSize || lm.contentSize;
  const h = Math.min(Math.round(cs.height), 6000);
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: A4W, height: h, scale: 1 } }, 120000);
  const pngPath = join(OUT, "print.png");
  writeFileSync(pngPath, Buffer.from(shot.data, "base64"));
  console.log("print 媒体整页：" + pngPath + " (" + A4W + "×" + h + "，约 " + (h / A4H).toFixed(2) + " 页 A4)");
} finally {
  try {
    if (cdp) cdp.close();
  } catch {}
  child.kill();
  await sleep(400);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {}
  server.close();
}
