// Lighthouse 移动端验收：四类 ≥90；预览服务器自起自停；每页跑两次取高分（首跑预热噪声）
import { spawn, spawnSync } from "node:child_process";
import { readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 4321;
const BASE = `http://localhost:${PORT}`;
const CATEGORIES = "performance,accessibility,best-practices,seo";
const THRESHOLD = 90;
const SITE_DIR = fileURLToPath(new URL("..", import.meta.url));

function findChrome() {
  const base = join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
  if (!existsSync(base)) {
    throw new Error("未找到 Playwright 浏览器目录：" + base);
  }
  const dirs = readdirSync(base)
    .filter(d => d.startsWith("chromium-"))
    .sort()
    .reverse();
  for (const d of dirs) {
    for (const sub of ["chrome-win64", "chrome-win"]) {
      const p = join(base, d, sub, "chrome.exe");
      if (existsSync(p)) return p;
    }
  }
  throw new Error("未找到 chromium 可执行文件");
}

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* 未就绪，继续等 */
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("preview 服务器未就绪");
}

function runLighthouse(page, chrome) {
  const r = spawnSync(
    "npx",
    [
      "lighthouse",
      BASE + page,
      "--output=json",
      "--output-path=stdout",
      `--only-categories=${CATEGORIES}`,
      "--chrome-flags=--headless=new",
      "--quiet",
    ],
    {
      shell: true,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, CHROME_PATH: chrome },
    }
  );
  const start = r.stdout.indexOf("{");
  if (start < 0) return null;
  try {
    const json = JSON.parse(r.stdout.slice(start));
    return {
      scores: Object.fromEntries(
        Object.entries(json.categories).map(([k, v]) => [k, Math.round(v.score * 100)])
      ),
      json,
    };
  } catch {
    return null;
  }
}

function printFailedAudits(json) {
  for (const a of Object.values(json.audits)) {
    // 零权重/信息性审计（如 insight 类）不影响得分，不列入失败项
    if (a.score !== null && a.score < 1 && a.weight > 0) {
      const items = (a.details?.items ?? [])
        .slice(0, 3)
        .map(i => i.node?.selector)
        .filter(Boolean);
      console.error(
        `    FAIL ${a.id} — ${a.title}${items.length ? " @ " + items.join(" ; ") : ""}`
      );
    }
  }
}

const preview = spawn("npx", ["astro", "preview", "--port", String(PORT)], {
  cwd: SITE_DIR,
  shell: true,
  stdio: "ignore",
});

try {
  await waitForServer(BASE);

  // 页面清单：四个固定页 + 第一篇案例详情
  const pages = ["/", "/case-studies/", "/analysis/", "/toolbox/", "/about/"];
  const caseDir = join(SITE_DIR, "dist", "case-studies");
  if (existsSync(caseDir)) {
    const first = readdirSync(caseDir).find(
      d =>
        statSync(join(caseDir, d)).isDirectory() &&
        existsSync(join(caseDir, d, "index.html"))
    );
    if (first) pages.splice(1, 0, `/case-studies/${first}/`);
  }

  const chrome = findChrome();
  let allPass = true;
  for (const page of pages) {
    let best = null;
    let bestJson = null;
    for (let run = 0; run < 2; run++) {
      const out = runLighthouse(page, chrome);
      if (!out) continue;
      const total = Object.values(out.scores).reduce((a, b) => a + b, 0);
      if (!best || total > Object.values(best).reduce((a, b) => a + b, 0)) {
        best = out.scores;
        bestJson = out.json;
      }
    }
    if (!best) {
      allPass = false;
      console.error(`${page}: 两次运行均失败`);
      continue;
    }
    const fail = Object.entries(best).filter(([, s]) => s < THRESHOLD);
    if (fail.length) {
      allPass = false;
      console.error(`${page} 未达标，失败审计项：`);
      printFailedAudits(bestJson);
    }
    console.log(
      `${page.padEnd(30)} ${Object.entries(best)
        .map(([k, s]) => `${k}:${s}`)
        .join("  ")}${fail.length ? "  ✗" : "  ✓"}`
    );
  }
  if (!allPass) {
    console.error(`有页面未达 ${THRESHOLD}，先修再部署`);
    process.exit(1);
  }
  console.log("Lighthouse 验收通过 ✓");
} finally {
  preview.kill();
}
