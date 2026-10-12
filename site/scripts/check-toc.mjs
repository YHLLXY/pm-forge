// site/scripts/check-toc.mjs —— 详情页右栏目录的锚点门禁
//
// 为什么需要：check-links.mjs 的 SKIP 正则把 href="#..." 整个跳过，站内锚点从不校验。
// 而目录是构建期由 headings 生成的，作者一旦改 Markdown 标题就会漂移。
//
// 两道断言：
//   A. 反向 —— 每个含 nav[data-article-toc] 的页面，其每个 href="#X" 都能在本页找到 id="X"，
//      且目录非空、目录内锚点不重复；
//   B. 正向 —— 所有详情页都**必须**有目录。只查"含目录的页面"会让漏接线的页面静默通过
//      （pages === 0 只能兜住"全站一个都没有"）。
// 注意 decodeURIComponent：Astro 可能把中文锚点写成百分号编码。
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

// 详情页 = 四个集合的条目页 + 手写的拆解章程页
const DETAIL = /^(case-studies|analysis|dissections|toolbox\/reports)\/[^/]+\/index\.html$/;

const htmlFiles = [];
for (const p of walk(DIST)) if (p.endsWith(".html")) htmlFiles.push(p);

let pages = 0;
let links = 0;
const missingToc = [];

for (const p of htmlFiles) {
  const rel = relative(DIST, p).replaceAll("\\", "/");
  // dist/reports/** 是 Quarto 生成的独立报告（iframe 资源），不在本站口径内
  if (rel.startsWith("reports/")) continue;

  const isDetail = DETAIL.test(rel);
  const html = readFileSync(p, "utf8");
  const nav = html.match(/<nav[^>]*data-article-toc[^>]*>([\s\S]*?)<\/nav>/);
  if (!nav) {
    if (isDetail) missingToc.push(rel);
    continue;
  }
  pages++;

  const ids = new Set(
    [...html.matchAll(/\sid="([^"]+)"/g)].map(m => decodeURIComponent(m[1]))
  );
  const hrefs = [...nav[1].matchAll(/href="#([^"]+)"/g)].map(m =>
    decodeURIComponent(m[1])
  );

  if (hrefs.length === 0) problems.push(rel + "：目录存在但没有任何条目");
  for (const h of hrefs) {
    links++;
    if (!ids.has(h)) problems.push(rel + "：目录锚点 #" + h + " 在本页找不到 id");
  }
  const seen = new Set();
  for (const h of hrefs) {
    if (seen.has(h)) problems.push(rel + "：目录里有重复锚点 #" + h);
    seen.add(h);
  }
}

if (pages === 0) {
  console.error("✗ 目录检查失败：一个带目录的页面都没有（接线没生效？）");
  process.exit(1);
}
for (const rel of missingToc) {
  problems.push(rel + "：详情页没有目录（接线漏了？）");
}
if (problems.length) {
  console.error("✗ 目录检查失败（" + problems.length + " 项）：");
  for (const m of problems) console.error("  " + m);
  process.exit(1);
}
console.log("✓ 目录检查通过（" + pages + " 个页面 / " + links + " 条锚点全部命中）");
