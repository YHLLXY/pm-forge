// site/scripts/story-gates.mjs —— B 验收①③双门禁（spec §4 门禁 2）
// 场景 1：桌面首屏滚动到底也不点击「开始探索」→ 零 WASM/worker/parquet 请求
// 场景 2：移动视口+触控（Playwright isMobile+hasTouch，与页面 JS 判定同口径）→ 零重资源 + 降级提示在 DOM
// 场景 3：引擎冒烟（正常模式跑两条查询）——浏览器侧窗口口径与预置图表一致的机械锚
//         （类目 Top10 = 11 表行；pv 按天 = 10 表行，即官方窗口 9 天）
// 反向自检：node scripts/story-gates.mjs --reverse —— 注入脚本主动拉取重资源，
//           两个零重资源场景必须全红（exit 0 = 门禁探测与失败接线有效）。
// 运行方式：npm run check:story（在 site/ 下）；playwright 借 toolkit 的安装，
// 解析顺序 = 调用方 CWD → 仓库 toolkit/node_modules（仿 sanitize-shots.mjs 的借装模式）。
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const reverse = process.argv.includes("--reverse");

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
  if (reverse) {
    // 反向自检注入：主动拉重资源，模拟"页面 spontaneous 加载引擎"
    await dPage.addInitScript(() => {
      fetch("/assets/data-stories/userbehavior/userbehavior_100k.parquet").catch(() => {});
      fetch("/duckdb/duckdb-eh.wasm", { method: "HEAD" }).catch(() => {});
    });
  }
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

  // 场景 3：引擎冒烟——查询框跑两条，结果行数钉死窗口口径（仅正常模式）。
  // 注意：状态断言等"变化"而非"存在"——第二次查询的waitForFunction若只看"引擎就绪"，
  // 会读到上一次的旧表（本项目查询框验证踩过的竞态）。
  if (!reverse && !failed) {
    await dPage.selectOption("#q-dim", "category_id");
    await dPage.click("#q-run");
    await dPage.waitForFunction(() => (document.getElementById("q-status")?.textContent ?? "").includes("引擎就绪"), null, { timeout: 120000 });
    const catRows = await dPage.locator("#query-result table tr").count();
    const prevStatus = await dPage.textContent("#q-status");
    await dPage.selectOption("#q-dim", "day");
    await dPage.selectOption("#q-behavior", "pv");
    await dPage.click("#q-run");
    await dPage.waitForFunction(p => {
      const cur = document.getElementById("q-status")?.textContent ?? "";
      return cur !== p && cur.includes("引擎就绪");
    }, prevStatus, { timeout: 60000 });
    const dayRows = await dPage.locator("#query-result table tr").count();
    // 类目 Top10 = 表头 + 10 行；pv 按天 = 表头 + 9 天（官方窗口天数钉死）
    if (catRows === 11 && dayRows === 10) console.log("✓ 引擎冒烟：类目 Top10 与 pv 按天（9 天）行数符合口径（窗口/墙钟跨端一致）");
    else { console.error(`✗ 引擎冒烟行数异常：类目 ${catRows}（期望 11）、pv 按天 ${dayRows}（期望 10）`); failed = true; }
  }
  await desktop.close();

  // 场景 2：移动视口 + 触控 → 全程零重资源，且降级提示在 DOM
  const mobile = await chromium.launch();
  const mContext = await mobile.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mPage = await mContext.newPage();
  if (reverse) {
    await mPage.addInitScript(() => {
      fetch("/assets/data-stories/userbehavior/userbehavior_100k.parquet").catch(() => {});
    });
  }
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
if (reverse) {
  console.log(failed ? "✓ 反向自检：场景全红符合预期，门禁探测与失败接线有效" : "✗ 反向自检失败：没有任何场景变红，门禁形同虚设");
  process.exit(failed ? 0 : 1);
}
process.exit(failed ? 1 : 0);
