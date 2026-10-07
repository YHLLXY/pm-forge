// site/scripts/toolbox-shots.mjs —— 一次性产物生成：本地 mock 模式跑三工具演示样例并截图。
// 用法: node scripts/toolbox-shots.mjs（产物 site/public/assets/toolbox/*.png，入库；脚本只重跑不常驻）
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const TOOLKIT = join(REPO, "toolkit");
const OUT = join(REPO, "site", "public", "assets", "toolbox");
const CANDIDATES = [
  join(process.cwd(), "node_modules", "playwright", "index.mjs"),
  join(TOOLKIT, "node_modules", "playwright", "index.mjs"),
];
const playwrightPath = CANDIDATES.find(p => existsSync(p));
if (!playwrightPath) {
  console.error("✗ 找不到 playwright（试过 site 与 toolkit 的 node_modules）");
  process.exit(1);
}
const { chromium } = await import(pathToFileURL(playwrightPath).href);

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
  cwd: TOOLKIT,
  shell: true, // Windows npx 需要 shell；杀进程用 taskkill /T 杀树（杀壳不杀子进程的教训处方）
  stdio: "ignore",
  env: { ...process.env, MOCK_LLM: "1", ALLOWED_ORIGINS: BASE },
});
let ready = false;
for (let i = 0; i < 90 && !ready; i++) {
  await new Promise(r => setTimeout(r, 1000));
  ready = await fetch(BASE).then(r => r.ok).catch(() => false);
}
if (!ready) {
  console.error("✗ toolkit dev 未就绪");
  spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { shell: true });
  process.exit(1);
}

const FILL = {
  "competitor-analysis": [
    ["分析目的", "为 Q4 迭代选择差异化方向"],
    ["我方产品", "随手记账：面向大学生的极简记账小程序，主打 10 秒记一笔"],
    ["竞品名称", "钱迹"],
  ],
  "feedback-insights": [
    ["反馈列表", "等了十分钟没人接单\n司机爽约了\n界面很好看\n支付总是失败\n想要包月套餐\n客服不理人"],
  ],
  "prd-draft": [
    ["产品/模块", "随手记账"],
    ["需求名称", "月度报告导出 PDF"],
    ["背景描述", "用户只能截图分享月度报告，排版差"],
    ["目标用户与场景", "大学生月底查看并分享消费报告给家人"],
  ],
};
const CLICK = { "competitor-analysis": "生成报告", "feedback-insights": "开始分析", "prd-draft": "生成 PRD 草稿" };
const WAIT = {
  "competitor-analysis": page => page.getByTestId("tool-output").getByText("差异化与机会点").waitFor({ timeout: 30_000 }),
  "feedback-insights": async page => {
    await page.getByText("叫车匹配慢").waitFor({ timeout: 30_000 });
    await page.getByTestId("priority-matrix").waitFor({ timeout: 30_000 });
  },
  "prd-draft": page => page.getByTestId("tool-output").getByText("六、风险与开放问题").waitFor({ timeout: 30_000 }),
};
const SCROLL_TO = {
  "competitor-analysis": () => "[data-testid=\"tool-output\"]",
  "feedback-insights": () => "[data-testid=\"priority-matrix\"]",
  "prd-draft": () => "[data-testid=\"tool-output\"]",
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
// try/finally 保证中途异常（选择器失配/超时）也杀掉 dev server 树，不在 3100 留孤儿套件
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  for (const id of Object.keys(FILL)) {
    await page.goto(`${BASE}/tools/${id}`);
    for (const [label, value] of FILL[id]) await page.getByLabel(label).fill(value);
    await page.getByRole("button", { name: CLICK[id] }).click();
    await WAIT[id](page);
    await page.waitForTimeout(1000); // 流式收尾
    await page.locator(SCROLL_TO[id]()).scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(OUT, `${id}.png`) });
    console.log(`✓ ${id}.png`);
  }
} finally {
  await browser.close();
  spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { shell: true });
}
console.log("完成：", OUT);
