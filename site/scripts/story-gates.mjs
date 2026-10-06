// site/scripts/story-gates.mjs —— B 验收①③双门禁（spec §4 门禁 2）
// 场景 1：桌面首屏滚动到底也不点击「开始探索」→ 零 WASM/worker/parquet 请求
// 场景 2：移动视口+触控（Playwright isMobile+hasTouch，与页面 JS 判定同口径）→ 零重资源 + 降级提示在 DOM
// 运行方式：npm run check:story（在 site/ 下）；playwright 借 toolkit 的安装，
// 解析顺序 = 调用方 CWD → 仓库 toolkit/node_modules（仿 sanitize-shots.mjs 的借装模式）。
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CANDIDATES = [
  join(process.cwd(), "node_modules", "playwright", "index.mjs"),
  join(HERE, "..", "..", "toolkit", "node_modules", "playwright", "index.mjs"),
];
const playwrightPath = CANDIDATES.find(p => existsSync(p));
if (!playwrightPath) {
  console.error(`✗ 找不到 playwright（试过：${CANDIDATES.join("、")}）——在 toolkit 目录跑一次 npm install 或在 site 装开发依赖`);
  process.exit(1);
}
const { chromium } = await import(pathToFileURL(playwrightPath).href);

const PORT = 4328; // 独立端口，避免与本地已开的 dev/preview 冲突
const BASE = `http://localhost:${PORT}`;
const STORY = `${BASE}/data-stories/userbehavior/`;
const HEAVY = /duckdb.*\.wasm|\.worker\.js|userbehavior_100k\.parquet/i;

const server = spawn("npx", ["astro", "preview", "--port", String(PORT), "--force"], {
  cwd: join(HERE, ".."),
  shell: true, // Windows 下 npx 需要 shell 解析
  stdio: "ignore",
});
let ready = false;
for (let i = 0; i < 60 && !ready; i++) {
  await new Promise(r => setTimeout(r, 500));
  ready = await fetch(BASE).then(r => r.ok).catch(() => false);
}
if (!ready) {
  console.error("✗ preview 服务器未就绪");
  server.kill();
  process.exit(1);
}

let failed = false;
try {
  // 场景 1：桌面首屏，只滚动不点击「开始探索」
  const desktop = await chromium.launch();
  const dPage = await desktop.newPage({ viewport: { width: 1280, height: 800 } });
  const heavyDesktop = [];
  dPage.on("request", r => { if (HEAVY.test(r.url())) heavyDesktop.push(r.url()); });
  await dPage.goto(STORY, { waitUntil: "networkidle" });
  for (let i = 0; i < 8; i++) {
    await dPage.mouse.wheel(0, 800);
    await dPage.waitForTimeout(300);
  }
  if (heavyDesktop.length) {
    console.error("✗ 首屏/滚动拉了重资源:", heavyDesktop);
    failed = true;
  } else {
    console.log("✓ 桌面首屏零 WASM/parquet 下载（B 验收①）");
  }
  await desktop.close();

  // 场景 2：移动视口 + 触控 → 全程零重资源，且降级提示在 DOM
  const mobile = await chromium.launch();
  const mContext = await mobile.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mPage = await mContext.newPage();
  const heavyMobile = [];
  mPage.on("request", r => { if (HEAVY.test(r.url())) heavyMobile.push(r.url()); });
  await mPage.goto(STORY, { waitUntil: "networkidle" });
  for (let i = 0; i < 10; i++) {
    await mPage.touchscreen.tap(195, 400).catch(() => {});
    await mPage.evaluate(() => window.scrollBy(0, 800));
    await mPage.waitForTimeout(300);
  }
  const degrade = await mPage.getByText("桌面端可自由查询").count();
  if (heavyMobile.length) {
    console.error("✗ 移动端拉了重资源:", heavyMobile);
    failed = true;
  }
  if (!degrade) {
    console.error("✗ 移动端降级提示缺失");
    failed = true;
  }
  if (!heavyMobile.length && degrade) console.log("✓ 移动端降级模式：零重资源 + 提示在位（B 验收③）");
  await mobile.close();
} finally {
  server.kill();
}
process.exit(failed ? 1 : 0);
