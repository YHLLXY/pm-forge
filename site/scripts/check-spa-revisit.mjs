// site/scripts/check-spa-revisit.mjs —— E 轨 P0 验收：二次站内跳转可用性（手动跑，不进构建门禁）
//
// 背景：<ClientRouter /> 下「打包后的模块脚本只执行一次」（astro@7.3.5 的
// transitions/swap-functions.js:29-45 用 script.src / textContent 做去重键，router.js:82-98
// 跳过带 data-astro-exec 的脚本）。search.astro 与 data-stories/userbehavior.astro 的初始化
// 逻辑若写在模块顶层，第二次用站内跳转进入本页时整段被跳过 —— 新 DOM 上没有任何监听：
// 搜索框长得正常、也能打字，但一个字都搜不出来，且控制台无报错。
//
// 用法：
//   node scripts/check-spa-revisit.mjs                                 # 自起 astro preview（端口 4329）
//   node scripts/check-spa-revisit.mjs --only=search                   # 只跑搜索页
//   node scripts/check-spa-revisit.mjs --base=https://yuhailinlxy.com  # 打线上（修复前复现红用）
//
// 断言口径：看**用户可见结果**（搜出结果 / 查询出表），不拿「网络请求数」当断言 ——
// 修好之后二次进入会复用 window.__pagefind，fragment 命中内存缓存，请求数是 0，
// 用「请求数 > 0」当断言会在修好之后假红。请求数只作为诊断信息打印。
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const argOf = name => {
  const hit = process.argv.find(a => a.startsWith("--" + name + "="));
  return hit ? hit.slice(name.length + 3) : null;
};
const only = argOf("only") || "all";
const external = argOf("base");

const CANDIDATES = [
  join(process.cwd(), "node_modules", "playwright", "index.mjs"),
  join(HERE, "..", "..", "toolkit", "node_modules", "playwright", "index.mjs"),
];
const playwrightPath = CANDIDATES.find(p => existsSync(p));
if (!playwrightPath) {
  console.log("SKIP 找不到 playwright（试过：" + CANDIDATES.join("、") + "）");
  console.log("     本脚本需要真实浏览器。在 toolkit 目录 npm install 后可用（与 story-gates.mjs 同一借装模式）。");
  process.exit(0);
}
const { chromium } = await import(pathToFileURL(playwrightPath).href);

const PORT = 4329;
const BASE = (external || "http://localhost:" + PORT).replace(/\/+$/, "");

// Astro 7 preview 是常驻守护且全局单槽注册（同 story-gates.mjs 的处理）：先清槽，结束后再清一次。
async function stopPreviewDaemon() {
  await Promise.race([
    new Promise(resolve => {
      const p = spawn("npx", ["astro", "preview", "stop"], { cwd: join(HERE, ".."), shell: true, stdio: "ignore" });
      p.on("exit", resolve);
      p.on("error", () => resolve());
    }),
    new Promise(r => setTimeout(r, 30000)),
  ]);
}

let server = null;
if (!external) {
  await stopPreviewDaemon();
  server = spawn("npx", ["astro", "preview", "--port", String(PORT), "--force"], {
    cwd: join(HERE, ".."),
    shell: true,
    stdio: "ignore",
  });
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    await new Promise(r => setTimeout(r, 500));
    ready = await fetch(BASE)
      .then(r => r.ok)
      .catch(() => false);
  }
  if (!ready) {
    console.error("✗ preview 服务器未就绪（" + BASE + "）");
    server.kill();
    await stopPreviewDaemon();
    process.exit(1);
  }
} else {
  const reachable = await fetch(BASE)
    .then(r => r.ok)
    .catch(() => false);
  if (!reachable) {
    console.error("✗ 目标不可达：" + BASE);
    process.exit(1);
  }
}

const trim = p => p.replace(/\/+$/, "") || "/";
const failures = [];

async function softNav(page, pathname) {
  try {
    await page.evaluate(p => {
      const hit = [...document.querySelectorAll("a[href]")].find(el => {
        try {
          return (new URL(el.getAttribute("href"), location.href).pathname.replace(/\/+$/, "") || "/") === p;
        } catch {
          return false;
        }
      });
      if (!hit) throw new Error("页面上没有指向 " + p + " 的链接，无法做站内跳转");
      hit.click();
    }, trim(pathname));
  } catch (err) {
    failures.push(String(err && err.message ? err.message : err));
  }
  await page.waitForFunction(
    p => (location.pathname.replace(/\/+$/, "") || "/") === p,
    trim(pathname),
    { timeout: 20000 }
  );
}

async function waitBound(page, sel, key, label) {
  try {
    await page.waitForFunction(
      ([s, k]) => {
        const el = document.querySelector(s);
        return !!el && el.dataset[k] === "true";
      },
      [sel, key],
      { timeout: 15000 }
    );
    return true;
  } catch {
    failures.push(label + "：脚本没有重新初始化（" + sel + " 上没有 data-" + key + " 标记）");
    return false;
  }
}

const qStatus = "((document.getElementById(\"q-status\") || {}).textContent || \"\")";

let browser = null;
try {
  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "zh-CN" });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(String(e)));
  let fragments = 0;
  page.on("request", r => {
    if (/\/pagefind\/fragment\/zh/.test(r.url())) fragments++;
  });

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  console.log("目标：" + BASE + "（站内跳转 = 点击页面内链接，不是 goto）");

  if (only === "all" || only === "search") {
    for (let visit = 1; visit <= 3; visit++) {
      if (visit > 1) await softNav(page, "/");
      await softNav(page, "/search/");
      const bound = await waitBound(page, "#search-input", "searchBound", "搜索页第 " + visit + " 次进入");
      const fragBefore = fragments;
      await page.fill("#search-input", "案例");
      let got = true;
      try {
        await page.waitForFunction(
          () => /找到 [0-9]+ 条结果/.test((document.getElementById("search-status") || {}).textContent || ""),
          null,
          { timeout: 20000 }
        );
      } catch {
        got = false;
      }
      const status = ((await page.textContent("#search-status")) || "").trim();
      const rows = await page.locator("#search-results li").count();
      const ok = bound && got && rows > 0;
      if (!ok)
        failures.push("搜索页第 " + visit + " 次进入搜不出结果：status=" + JSON.stringify(status) + " 结果行=" + rows);
      console.log(
        (ok ? "✓" : "✗") +
          " 搜索页第 " + visit + " 次进入：status=" + JSON.stringify(status) + " 结果行=" + rows +
          "（诊断：本次新增 fragment 请求 " + (fragments - fragBefore) + "）"
      );
    }
  }

  if (only === "all" || only === "story") {
    const runQuery = async () => {
      await page.click("#q-run");
      try {
        await page.waitForFunction(
          () => /引擎就绪/.test((document.getElementById("q-status") || {}).textContent || ""),
          null,
          { timeout: 180000 }
        );
        return true;
      } catch {
        return false;
      }
    };

    await softNav(page, "/");
    await softNav(page, "/data-stories/userbehavior/");
    await waitBound(page, "#main-content", "storyBound", "数据故事页第 1 次进入");
    const first = await runQuery();
    const firstStatus = ((await page.textContent("#q-status")) || "").trim();
    console.log((first ? "✓" : "✗") + " 数据故事页第 1 次进入：点「开始探索」→ " + JSON.stringify(firstStatus));
    if (!first) failures.push("数据故事页第 1 次进入查询未成功：" + JSON.stringify(firstStatus));

    await softNav(page, "/");
    await softNav(page, "/data-stories/userbehavior/");
    const bound2 = await waitBound(page, "#main-content", "storyBound", "数据故事页第 2 次进入");
    const second = await runQuery();
    const secondStatus = ((await page.textContent("#q-status")) || "").trim();
    const tableRows = await page.locator("#query-result table tr").count();
    const ok2 = bound2 && second && tableRows >= 2;
    if (!ok2) failures.push("数据故事页第 2 次进入查询不可用：" + JSON.stringify(secondStatus) + " 表行=" + tableRows);
    console.log(
      (ok2 ? "✓" : "✗") +
        " 数据故事页第 2 次进入：点「开始探索」→ " + JSON.stringify(secondStatus) + " 表行=" + tableRows
    );
  }

  if (pageErrors.length) failures.push("页面出现 pageerror：" + pageErrors.join(" | "));
  console.log("pageerror 数：" + pageErrors.length);
} finally {
  if (browser) await browser.close();
  if (server) {
    server.kill();
    await stopPreviewDaemon();
  }
}

if (failures.length) {
  console.error("");
  for (const f of failures) console.error("✗ " + f);
  console.error("✗ 二次站内跳转可用性验收失败（" + failures.length + " 项）");
  process.exit(1);
}
console.log("✓ 搜索页三访均可用；数据故事页二访仍可查询");
process.exit(0);
