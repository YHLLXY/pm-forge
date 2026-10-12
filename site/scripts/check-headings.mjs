// site/scripts/check-headings.mjs —— 每个 dist HTML 恰好一个 h1；正文标题层级不跳级
// 为什么需要：把 <h1> 从四个详情页搬进共享组件 EntryHeader 之后，最大的回归风险是
// 「同一页出现两个 h1」。Lighthouse 的 a11y 审计**没有** h1 唯一性这一项，现有 100 分挡不住。
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const problems = [];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

let pages = 0;
for (const p of walk(DIST)) {
  if (!p.endsWith(".html")) continue;
  pages++;
  const rel = relative(DIST, p).replaceAll("\\", "/");
  // dist/reports/** 是 Quarto 生成的独立报告（作为 iframe 资源引用，不是 Astro 页面），
  // 它自己带 h1，不在本门禁口径内 —— 这里按目录整体排除，而不是靠白名单文件。
  if (rel.startsWith("reports/")) continue;
  const html = readFileSync(p, "utf8");
  // 只数标签本身（<h2> / <h2 class=...>），转义过的 &lt;h2&gt; 不会命中
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map(m => Number(m[1]));
  const h1 = levels.filter(l => l === 1).length;
  if (h1 !== 1) problems.push(`${rel}: h1 数量 = ${h1}（必须恰好 1）`);
  let prev = 0;
  for (const lv of levels) {
    if (prev && lv > prev + 1) problems.push(`${rel}: 标题从 h${prev} 跳到 h${lv}`);
    prev = lv;
  }
}

if (problems.length) {
  console.error("✗ 标题结构检查失败（" + problems.length + " 项）：");
  for (const m of problems) console.error("  " + m);
  process.exit(1);
}
console.log(`✓ 标题结构检查通过（${pages} 页，每页恰好一个 h1，无跳级）`);
