// 结构化数据校验（二期 E4，挂 build 链）：dist 内全部 ld+json 必须合法 JSON，
// 首页必有 WebSite(name/url)+Person，三集合详情页必有 BlogPosting(headline/datePublished/author)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const problems = [];
const fail = msg => problems.push(msg);

function ldBlocks(html, label) {
  const blocks = [];
  const re = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  for (const m of html.matchAll(re)) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch {
      fail(`${label}: 存在非法 JSON 的 ld+json 块`);
    }
  }
  return blocks;
}

// 1) 全站扫描：每个 HTML 的 ld+json 都必须能解析
const pageBlocks = new Map();
let scanned = 0;
for (const p of walk(DIST)) {
  if (!p.endsWith(".html")) continue;
  scanned++;
  const rel = relative(DIST, p).replaceAll("\\", "/");
  pageBlocks.set(rel, ldBlocks(readFileSync(p, "utf8"), rel));
}

const hasType = (blocks, type) => blocks.some(b => b?.["@type"] === type);

// 2) 首页断言（注意不是 404.html）
const homeBlocks = pageBlocks.get("index.html") ?? [];
if (!hasType(homeBlocks, "WebSite")) fail("首页缺 WebSite");
const ws = homeBlocks.find(b => b?.["@type"] === "WebSite");
if (ws && (!ws.name || !ws.url)) fail("首页 WebSite 缺 name/url");
if (!hasType(homeBlocks, "Person")) fail("首页缺 Person");

// 3) 详情页断言：BlogPosting + 必需属性
const detailDirs = ["case-studies", "analysis", "toolbox/reports"];
let postingCount = 0;
for (const dir of detailDirs) {
  const abs = join(DIST, dir);
  const st = statSync(abs, { throwIfNoEntry: false });
  if (!st?.isDirectory()) {
    fail(`详情目录缺失：${dir}`);
    continue;
  }
  for (const p of walk(abs)) {
    if (!p.endsWith("index.html")) continue;
    const rel = relative(DIST, p).replaceAll("\\", "/");
    // 集合目录的列表页（case-studies/index.html）不走 PostLayout，不在断言范围
    if (rel === `${dir}/index.html`) continue;
    const post = (pageBlocks.get(rel) ?? []).find(b => b?.["@type"] === "BlogPosting");
    if (!post) {
      fail(`${rel} 缺 BlogPosting`);
      continue;
    }
    postingCount++;
    for (const prop of ["headline", "datePublished", "author"]) {
      if (post[prop] === undefined) fail(`${rel} BlogPosting 缺 ${prop}`);
    }
  }
}
if (postingCount < 1) fail("未在任何详情页发现 BlogPosting");

if (problems.length) {
  console.error(`JSON-LD 校验 ${problems.length} 项不通过：\n` + problems.map(p => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`JSON-LD 校验通过 ✓（扫描 ${scanned} 页；WebSite/Person + ${postingCount} 个 BlogPosting 均合规）`);
