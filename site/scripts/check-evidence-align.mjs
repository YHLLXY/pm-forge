// site/scripts/check-evidence-align.mjs
// 门禁：首页「本作品集包含」面板的 6 个格子必须**列对齐** —— 同一行内
// 数字顶（dd.top）、标签顶（dt.top）、数字块高度（dd.height）三者都要一致。
//
// 为什么不能用构建期静态检查：对齐是 CSS 布局的结果，HTML 里只有 class，没有坐标。
// 一个 flex / grid 属性的改动就能让数字错位 15px，而 markdown / a11y / 死链这些门禁全绿。
//
// 为什么值得为此起一个浏览器：2026-10-27 用户当场抓到「5 篇」比「2 篇」高 15px。
// 我当时验的是"首屏 4 个数字都可见"，没验"它们在同一条水平线上"——缩略图里 15px 看不出来，
// 量 getBoundingClientRect 才看得见。这个脚本就是把那次手工测量固化成门禁。
//
// 用法：
//   node scripts/check-evidence-align.mjs              # 量 1440 与 390 两档
//   node scripts/check-evidence-align.mjs --width 1440 # 只量一档
//   node scripts/check-evidence-align.mjs --verbose    # 打印每个格子的坐标
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const SITE = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(SITE, "dist");
const PORT = Number(process.env.ALIGN_PORT || 4911);
const TOLERANCE = 1.5; // px：允许亚像素取整差，超过就是真错位
const argv = process.argv.slice(2);
const argOf = name => {
  const i = argv.indexOf("--" + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
};
const WIDTHS = argOf("width") ? [Number(argOf("width"))] : [1440, 390];
const VERBOSE = argv.includes("--verbose");

if (!existsSync(join(DIST, "index.html"))) {
  console.error("✗ 找不到 dist/index.html —— 先 npm run build");
  process.exit(1);
}

/* ---------- 找浏览器：本机 Edge 优先，其次 playwright 自带的 chromium ---------- */
function findBrowser() {
  const direct = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const p of direct) if (existsSync(p)) return p;
  const base = join(process.env.LOCALAPPDATA || "", "ms-playwright");
  if (existsSync(base)) {
    for (const d of readdirSync(base).filter(x => x.startsWith("chromium-")).sort().reverse()) {
      for (const sub of ["chrome-win64", "chrome-win"]) {
        const p = join(base, d, sub, "chrome.exe");
        if (existsSync(p)) return p;
      }
    }
  }
  return null;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
};

const server = createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split("?")[0]);
  if (rel.endsWith("/")) rel += "index.html";
  let file = join(DIST, rel);
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

/* ---------- 极简 CDP 客户端 ---------- */
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
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
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

// 量：每个格子的 cellTop（用来分行）、dd/dtt 的 top 与高度、格子在行内的左边界
const MEASURE = `(() => {
  const panel = document.querySelector("#evidence");
  if (!panel) return { error: "no #evidence" };
  const dl = panel.querySelector("dl");
  if (!dl) return { error: "no dl" };
  return {
    cells: Array.from(dl.children).map((cell) => {
      const dd = cell.querySelector("dd");
      const dt = cell.querySelector("dt");
      if (!dd || !dt) return { error: "cell without dd/dt" };
      const c = cell.getBoundingClientRect();
      const a = dd.getBoundingClientRect();
      const b = dt.getBoundingClientRect();
      return {
        key: dd.getAttribute("data-evidence-key") || dt.textContent.trim().slice(0, 12),
        cellTop: Math.round(c.top * 100) / 100,
        cellLeft: Math.round(c.left * 100) / 100,
        ddTop: Math.round(a.top * 100) / 100,
        ddHeight: Math.round(a.height * 100) / 100,
        dtTop: Math.round(b.top * 100) / 100,
      };
    }),
  };
})()`;

const problems = [];

function checkWidth(width, cells) {
  if (!cells.length) {
    problems.push(width + "px：面板里一个格子都没量到");
    return;
  }
  // 按 cellTop 分行（容差内视为同一行）
  const rows = [];
  for (const cell of cells) {
    const row = rows.find(r => Math.abs(r[0].cellTop - cell.cellTop) <= TOLERANCE);
    if (row) row.push(cell);
    else rows.push([cell]);
  }
  rows.forEach((row, i) => {
    const ddTops = row.map(c => c.ddTop);
    const dtTops = row.map(c => c.dtTop);
    const heights = row.map(c => c.ddHeight);
    const spread = vals => Math.max(...vals) - Math.min(...vals);

    if (spread(ddTops) > TOLERANCE) {
      problems.push(
        width + "px 第 " + (i + 1) + " 行：数字顶差 " + spread(ddTops).toFixed(1) + "px（" +
          row.map(c => c.key + "=" + c.ddTop).join(" / ") + "）"
      );
    }
    if (spread(dtTops) > TOLERANCE) {
      problems.push(
        width + "px 第 " + (i + 1) + " 行：标签顶差 " + spread(dtTops).toFixed(1) + "px（" +
          row.map(c => c.key + "=" + c.dtTop).join(" / ") + "）"
      );
    }
    if (spread(heights) > 0.6) {
      problems.push(
        width + "px 第 " + (i + 1) + " 行：数字块高度不一致（" +
          row.map(c => c.key + "=" + c.ddHeight).join(" / ") + "）"
      );
    }
    if (VERBOSE) {
      console.log(
        "    " + width + "px 行 " + (i + 1) + "：" +
          row.map(c => c.key + " dd.top=" + c.ddTop + " dt.top=" + c.dtTop + " h=" + c.ddHeight).join(" | ")
      );
    }
  });

  // 列也要齐：同一列在不同行里的左边界必须一致
  const cols = cells.map(c => c.cellLeft);
  const byLeft = [...new Set(cols)].sort((a, b) => a - b);
  if (byLeft.length < 2) {
    problems.push(width + "px：格子全挤在一列（预期至少 2 列）");
  }
  if (byLeft.length > 3) {
    problems.push(width + "px：出现 " + byLeft.length + " 个不同的左边界（预期 2 或 3 列）");
  }
}

/* ---------- 跑 ---------- */
const browser = findBrowser();
if (!browser) {
  console.error("✗ 未找到 Edge / Chrome / playwright chromium —— 这个门禁必须在浏览器里量坐标");
  process.exit(1);
}

await new Promise(r => server.listen(PORT, "127.0.0.1", r));
const profile = join(process.env.TEMP || ".", "align-profile-" + Date.now());
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

  let total = 0;
  for (const width of WIDTHS) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height: width < 600 ? 844 : 900,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
    await cdp.send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/" });
    await sleep(1200);
    const out = await cdp.send("Runtime.evaluate", { expression: MEASURE, returnByValue: true }, 60000);
    const value = out.result.value || {};
    if (value.error) {
      problems.push(width + "px：" + value.error);
      continue;
    }
    total = value.cells.length;
    if (value.cells.length !== 6) {
      problems.push(width + "px：面板有 " + value.cells.length + " 个格子（预期 6：5 个数字 + 最近更新）");
    }
    if (VERBOSE) console.log("  量到 " + value.cells.length + " 个格子 @" + width + "px");
    checkWidth(width, value.cells);
  }

  if (problems.length) {
    console.error("✗ 证据面板对齐检查失败（" + problems.length + " 项）：");
    for (const p of problems) console.error("  " + p);
    console.error("  典型原因：flex-col-reverse 的内容贴底（标签行数不同就把数字顶偏）、或某个 dd 没共用高度变量");
    process.exitCode = 1;
  } else {
    console.log(
      "✓ 证据面板对齐检查通过（" + total + " 格 × " + WIDTHS.join("/") + "px：行内数字顶、标签顶、数字块高度一致）"
    );
  }
} catch (e) {
  console.error("✗ 对齐检查执行失败：" + String((e && e.stack) || e));
  process.exitCode = 1;
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
