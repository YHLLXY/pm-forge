// site/scripts/check-detail-rail.mjs —— 详情页桌面右栏的手动验收（不进构建链）
//
// 为什么是手动脚本而不是构建门禁：它要真实浏览器、要五个视口、还要往磁盘写截图。
// 与 check-spa-revisit.mjs / check-reduce-motion.mjs 同一性质。
//
// 用法：
//   node scripts/check-detail-rail.mjs            # 自起 astro preview（端口 4336）
//   node scripts/check-detail-rail.mjs --shots    # 额外输出五张验收截图
//
// 十条断言对应 06 篇的十个决策，逐条打印 ✓/✗，最后汇总、有失败则 exit 1。
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = process.argv.includes("--shots");
const SHOT_DIR = "E:\\homework\\“余粮”项目\\docs\\research\\shots";
const PAGE = "/case-studies/student-union-platform/";

const CANDIDATES = [
  join(process.cwd(), "node_modules", "playwright", "index.mjs"),
  join(HERE, "..", "..", "toolkit", "node_modules", "playwright", "index.mjs"),
];
const playwrightPath = CANDIDATES.find(p => existsSync(p));
if (!playwrightPath) {
  console.log("SKIP 找不到 playwright（试过：" + CANDIDATES.join("、") + "）");
  process.exit(0);
}
const { chromium } = await import(pathToFileURL(playwrightPath).href);

const PORT = 4336;
const BASE = "http://localhost:" + PORT;

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

await stopPreviewDaemon();
const server = spawn("npx", ["astro", "preview", "--port", String(PORT), "--force"], {
  cwd: join(HERE, ".."),
  shell: true,
  stdio: "ignore",
});
let ready = false;
for (let i = 0; i < 60 && !ready; i++) {
  await new Promise(r => setTimeout(r, 500));
  ready = await fetch(BASE).then(r => r.ok).catch(() => false);
}
if (!ready) {
  console.error("✗ preview 服务器未就绪（" + BASE + "）");
  server.kill();
  await stopPreviewDaemon();
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 第 9 条的基线：采于 Task 1 之后的 commit 9ebd4f3（计划附录 A），
// 7 条稳定选择器 × 视口 390 / 768，每项都断言"恰好命中 1 个"。
// 前 6 条比**文档坐标四元组** [top, left, w, h]；第 7 条 #btt-btn-container
// 是 sticky + float，scrollY=0 时不可见且受包含块钳制 —— 按计划改成
// 0.6 滚动比例下的**视口坐标**（见计划 Task 10 表下实测说明）。
const BASELINE = {
  390: [
    [169, 16, 358, 504],
    [689, 16, 358, 184],
    [889, 16, 358, 20],
    [933, 16, 358, 276],
    [1257, 16, 358, 2917],
    [4206, 16, 358, 1],
  ],
  768: [
    [177, 16, 736, 613],
    [806, 16, 736, 86],
    [908, 16, 736, 20],
    [952, 16, 736, 110],
    [1110, 16, 640, 1909],
    [3052, 16, 736, 1],
  ],
};
const SEL6 = [
  "main > header",
  "main .not-prose.my-4.grid",
  "main .not-prose.my-3",
  "main ul.not-prose.my-6",
  "main #article",
  "main hr",
];
const BTT_EXPECT = { 768: { top: 960, left: 660 } };

const failures = [];
function check(name, ok, detail) {
  if (ok) console.log("✓ " + name);
  else {
    console.log("✗ " + name + (detail ? " —— " + detail : ""));
    failures.push(name);
  }
}

async function newPage(browser, w, h) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.goto(BASE + PAGE, { waitUntil: "networkidle" });
  await p.waitForTimeout(300);
  return p;
}

const grid = `(() => {
  const aside = document.querySelector("aside");
  const article = document.getElementById("article");
  const box = aside.parentElement;
  const ar = article.getBoundingClientRect();
  const sr = aside.getBoundingClientRect();
  const br = box.getBoundingClientRect();
  return {
    article: Math.round(ar.width), articleLeft: Math.round(ar.left),
    aside: Math.round(sr.width), asideLeft: Math.round(sr.left),
    gutter: Math.round(sr.left - (ar.left + ar.width)),
    rightSlack: Math.round(br.right - (sr.left + sr.width)),
    boxRight: Math.round(br.right),
  };
})()`;

const browser = await chromium.launch();

// ---- 断言 1 / 2 / 3：三个视口的栅格数字 ----
for (const [w, exp] of [
  [1440, { aside: 384, article: 640, gutter: 64 }],
  [1024, { aside: 320, article: 624, gutter: 48 }],
  [1920, { aside: 384, article: 640, gutter: 64 }],
]) {
  const p = await newPage(browser, w, 900);
  const g = await p.evaluate(grid);
  const ok =
    g.aside === exp.aside && g.article === exp.article && g.gutter === exp.gutter && g.rightSlack === 0;
  check(
    "断言 " + (w === 1440 ? 1 : w === 1024 ? 2 : 3) + "：" + w + " 视口 aside=" + exp.aside + " / article=" + exp.article + " / gutter=" + exp.gutter + " / 右侧余量=0",
    ok,
    "实测 " + JSON.stringify(g)
  );
  await p.close();
}

// ---- 断言 4：sticky 生效 ----
{
  const p = await newPage(browser, 1440, 900);
  const top = await p.evaluate(async () => {
    const a = document.getElementById("article");
    const y = a.getBoundingClientRect().top + window.scrollY + a.getBoundingClientRect().height * 0.5;
    await new Promise(r => {
      window.scrollTo({ top: Math.round(y), behavior: "instant" });
      requestAnimationFrame(() => requestAnimationFrame(r));
    });
    await new Promise(r => setTimeout(r, 200));
    return Math.round(document.querySelector("aside").getBoundingClientRect().top);
  });
  check("断言 4：滚动到正文中段后 aside.rect.top === 96", top === 96, "实测 " + top);
  await p.close();
}

// ---- 断言 5 / 6：唯一 aria-current + 计算样式真的生效 ----
{
  const p = await newPage(browser, 1440, 900);
  const r = await p.evaluate(() => {
    const nav = document.querySelector("[data-article-toc]");
    const all = document.querySelectorAll("[aria-current]");
    const cur = nav.querySelector("a[aria-current]");
    const other = [...nav.querySelectorAll("a:not([aria-current])")][0];
    if (!cur || !other) return { found: false, allCount: all.length };
    const cs = getComputedStyle(cur);
    const os = getComputedStyle(other);
    return {
      found: true,
      allCount: all.length,
      allAreTocLinks: [...all].every(e => e.tagName === "A" && nav.contains(e)),
      colorDiff: cs.color !== os.color,
      shadow: cs.boxShadow,
      shadowDiff: cs.boxShadow !== os.boxShadow,
      weight: Number(cs.fontWeight),
      otherWeight: Number(os.fontWeight),
      bgDiff: cs.backgroundColor !== os.backgroundColor,
    };
  });
  check(
    "断言 5：全页 [aria-current] 恰好 1 个且是目录里的 a",
    r.found && r.allCount === 1 && r.allAreTocLinks === true,
    JSON.stringify(r)
  );
  check(
    "断言 6：当前项 颜色/字重/竖条 与默认项不同（box-shadow !== none、fontWeight >= 600）",
    r.found && r.colorDiff && r.shadowDiff && r.shadow !== "none" && r.weight >= 600 && r.weight > r.otherWeight,
    JSON.stringify(r)
  );
  await p.close();
}

// ---- 断言 7：点击第 3 条后它成为唯一 current ----
{
  const p = await newPage(browser, 1440, 900);
  const r = await p.evaluate(async () => {
    const nav = document.querySelector("[data-article-toc]");
    const links = [...nav.querySelectorAll("a")];
    links[2].click();
    await new Promise(r => setTimeout(r, 1600));
    const cur = [...nav.querySelectorAll("a[aria-current]")];
    const all = document.querySelectorAll("[aria-current]");
    return {
      idx: cur.length === 1 ? links.indexOf(cur[0]) : -1,
      count: cur.length,
      allCount: all.length,
      text: cur[0] ? cur[0].textContent.trim() : null,
      scrollY: Math.round(window.scrollY),
    };
  });
  check(
    "断言 7：点击第 3 条目录后，第 3 条是唯一 aria-current",
    r.idx === 2 && r.count === 1 && r.allCount === 1,
    JSON.stringify(r)
  );
  await p.close();
}

// ---- 断言 8：390 窄屏隔离 ----
{
  const p = await newPage(browser, 390, 844);
  const r = await p.evaluate(() => {
    const nav = document.querySelector("[data-article-toc]");
    const aside = document.querySelector("aside");
    const article = document.getElementById("article");
    const box = aside.parentElement;
    const bs = getComputedStyle(box);
    const contentW =
      box.getBoundingClientRect().width - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight);
    return {
      tocDisplay: getComputedStyle(nav).display,
      asideDisplay: getComputedStyle(aside).display,
      asideWidth: Math.round(aside.getBoundingClientRect().width),
      boxWidth: Math.round(box.getBoundingClientRect().width),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      articleW: Math.round(article.getBoundingClientRect().width),
      contentW: Math.round(contentW),
      asidePos: getComputedStyle(aside).position,
    };
  });
  check(
    "断言 8：390 目录 display:none、aside 普通块、无横向溢出、正文宽 = 容器内容宽",
    r.tocDisplay === "none" &&
      r.asideDisplay === "block" &&
      r.asidePos === "static" &&
      r.asideWidth === r.boxWidth &&
      r.overflowX === 0 &&
      r.articleW === r.contentW,
    JSON.stringify(r)
  );
  await p.close();
}

// ---- 断言 9：窄屏几何与基线逐项相等 ----
for (const w of [390, 768]) {
  const p = await newPage(browser, w, w === 390 ? 844 : 1024);
  const rows = await p.evaluate(
    sel => sel.map(s => {
      const hit = document.querySelectorAll(s);
      if (hit.length !== 1) return { s, error: "命中 " + hit.length + " 个" };
      const r = hit[0].getBoundingClientRect();
      return { s, q: [Math.round(r.top + window.scrollY), Math.round(r.left), Math.round(r.width), Math.round(r.height)] };
    }),
    SEL6
  );
  const bad = [];
  rows.forEach((row, i) => {
    if (row.error) return bad.push(row.s + " " + row.error);
    const base = BASELINE[w][i];
    if (!row.q.every((v, k) => v === base[k])) bad.push(row.s + " 基线[" + base + "] 实测[" + row.q + "]");
  });
  check(
    "断言 9a：" + w + " 视口前 6 条选择器四元组与基线逐项相等",
    bad.length === 0,
    bad.join("；")
  );

  const btt = await p.evaluate(async () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    await new Promise(r => {
      window.scrollTo({ top: Math.round(max * 0.6), behavior: "instant" });
      requestAnimationFrame(() => requestAnimationFrame(r));
    });
    // 该元素有 500ms 的 opacity + translate-y 过渡（BackToTopButton.astro:14 + :64-71）：
    // 刚滚过 30% 阈值时它一边淡入一边上移，立刻取 rect 会读到 translateY 的中间值
    // （实测早取 300ms 会得到 top = 966 而不是 960，差 6px）。
    // 所以等到"过渡结束"再断言 —— opacity 必须已经到 1。
    let prev = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 100));
      const el = document.getElementById("btt-btn-container");
      const cur = Math.round(el.getBoundingClientRect().top) + "|" + getComputedStyle(el).opacity;
      if (cur === prev && Number(getComputedStyle(el).opacity) > 0.99) break;
      prev = cur;
    }
    const el = document.getElementById("btt-btn-container");
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      left: Math.round(r.left),
      opacity: getComputedStyle(el).opacity,
      transform: getComputedStyle(el).transform,
    };
  });
  if (w === 768) {
    const e = BTT_EXPECT[768];
    check(
      "断言 9b：768 视口 0.6 滚动处 #btt-btn-container 视口坐标 = {top:" + e.top + ", left:" + e.left + "}",
      btt.top === e.top && btt.left === e.left && Number(btt.opacity) > 0.99,
      "实测 " + JSON.stringify(btt)
    );
  } else {
    // 390 是 fixed 定位，只断言"没有横向溢出、仍在右下角"这一层
    check(
      "断言 9b：390 视口 0.6 滚动处 #btt-btn-container 仍固定在右侧内边距内",
      btt.left === 390 - 16 - 56,
      "实测 " + JSON.stringify(btt)
    );
  }
  await p.close();
}

// ---- 断言 10：矮视口下的右栏高度 ----
{
  const p = await newPage(browser, 1440, 700);
  const r = await p.evaluate(async () => {
    const aside = document.querySelector("aside");
    const a = document.getElementById("article");
    const y = a.getBoundingClientRect().top + window.scrollY + a.getBoundingClientRect().height * 0.6;
    await new Promise(res => {
      window.scrollTo({ top: Math.round(y), behavior: "instant" });
      requestAnimationFrame(() => requestAnimationFrame(res));
    });
    await new Promise(res => setTimeout(res, 200));
    return {
      h: Math.round(aside.getBoundingClientRect().height),
      clientH: aside.clientHeight,
      scrollH: aside.scrollHeight,
      overflowY: getComputedStyle(aside).overflowY,
      top: Math.round(aside.getBoundingClientRect().top),
    };
  });
  const limit = 700 - 128;
  const scrollOk = r.scrollH > r.clientH ? r.overflowY === "auto" || r.overflowY === "scroll" : true;
  check(
    "断言 10：1440×700 右栏高度 <= " + limit + "，需要时内部可滚",
    r.h <= limit && scrollOk,
    JSON.stringify(r) + " limit=" + limit
  );
  await p.close();
}

// ---- --shots：五张验收图 ----
if (SHOTS) {
  if (!existsSync(SHOT_DIR)) mkdirSync(SHOT_DIR, { recursive: true });
  const shots = [
    ["rail-1440-article-top.png", 1440, 900, "top"],
    ["rail-1440-article-bottom.png", 1440, 900, "bottom"],
    ["rail-1024-article-top.png", 1024, 900, "top"],
    ["rail-1440-short.png", 1440, 700, "mid"],
    ["rail-390-article.png", 390, 844, "top"],
  ];
  for (const [name, w, h, pos] of shots) {
    const p = await newPage(browser, w, h);
    const y = await p.evaluate(async mode => {
      const a = document.getElementById("article").getBoundingClientRect();
      const abs = a.top + window.scrollY;
      const target =
        mode === "top" ? abs - 90 : mode === "mid" ? abs + a.height * 0.5 : abs + a.height - window.innerHeight + 120;
      const top = Math.max(0, Math.min(Math.round(target), document.documentElement.scrollHeight - window.innerHeight));
      await new Promise(r => {
        window.scrollTo({ top, behavior: "instant" });
        requestAnimationFrame(() => requestAnimationFrame(r));
      });
      await new Promise(r => setTimeout(r, 250));
      return top;
    }, pos);
    await p.screenshot({ path: join(SHOT_DIR, name) });
    console.log("  截图 " + name + "（scrollY=" + y + "）");
    await p.close();
  }
}

await browser.close();
server.kill();
await stopPreviewDaemon();

console.log("");
if (failures.length) {
  console.error("✗ 右栏验收失败（" + failures.length + " 项）：");
  for (const f of failures) console.error("  " + f);
  process.exit(1);
}
console.log("✓ 右栏验收全部通过（10 条断言）" + (SHOTS ? "，并已输出 5 张截图" : ""));
