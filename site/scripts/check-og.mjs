// site/scripts/check-og.mjs —— OG 门禁（五类真实失败模式）
// 1 陈旧：内容改了但没重跑 npm run og（比对 manifest 里的指纹与现算指纹）
// 2 文件缺失/损坏：manifest 登记了但 PNG 不在，或签名/IHDR 非法
// 3 尺寸不对：从 PNG 的 IHDR **读回**真实宽高（不 trust 常量）
// 4 og:image 指向不存在的本地文件（能抓出「构建成功但线上 404」的静默失败）
// 5 og:image:alt 缺失或为空（ogp.me 原文要求）
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";
import { COLLECTIONS, deriveCardData, entryHash } from "./og/card.mjs";

const SITE = fileURLToPath(new URL("..", import.meta.url));
const C = join(SITE, "src/content");
const DIST = join(SITE, "dist");
const PUBLIC_OG = join(SITE, "public/og");
const MANIFEST = join(PUBLIC_OG, "manifest.json");
const WIDTH = 1200;
const HEIGHT = 630;
const SITE_ORIGIN = "https://yuhailinlxy.com";
const problems = [];

function pngSize(buf) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(sig)) return null;
  if (buf.subarray(12, 16).toString("latin1") !== "IHDR") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

if (!existsSync(MANIFEST)) {
  console.error("✗ 缺少 public/og/manifest.json —— 先跑 npm run og 生成逐页 OG 图");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));

// ---- 1 陈旧 / 幽灵登记 ----
const seen = new Set();
for (const dir of Object.keys(COLLECTIONS)) {
  const abs = join(C, dir);
  if (!existsSync(abs)) continue;
  for (const f of readdirSync(abs).filter(x => x.endsWith(".md"))) {
    const id = f.replace(/\.md$/, "");
    const key = dir + "/" + id;
    seen.add(key);
    const fm = parseYaml(readFileSync(join(abs, f), "utf8").split(/^---$/m)[1] ?? "") ?? {};
    if (!fm.title) continue;
    const want = createHash("sha256").update(entryHash(deriveCardData(dir, fm))).digest("hex").slice(0, 16);
    const rec = manifest.images[key];
    if (!rec) problems.push(key + ": manifest 里没有登记（新增内容后没跑 npm run og）");
    else if (rec.hash !== want) problems.push(key + ": OG 图已陈旧（内容改过但没重跑 npm run og）");
  }
}
for (const key of Object.keys(manifest.images)) {
  if (!seen.has(key)) problems.push(key + ": manifest 有登记，但 src/content 下已无对应条目");
}

// ---- 2/3 文件存在性 + PNG 合法性 + 读回尺寸 ----
const records = [...Object.values(manifest.images), manifest.default].filter(Boolean);
if (!records.length) problems.push("manifest 里一张图都没有");
for (const rec of records) {
  const p = join(PUBLIC_OG, rec.file);
  if (!existsSync(p)) {
    problems.push(rec.file + ": manifest 登记了但文件不存在");
    continue;
  }
  const size = pngSize(readFileSync(p));
  if (!size) {
    problems.push(rec.file + ": 不是合法 PNG（签名或 IHDR 非法）");
    continue;
  }
  if (size.width !== WIDTH || size.height !== HEIGHT)
    problems.push(rec.file + ": 实际 " + size.width + "×" + size.height + "，要求 " + WIDTH + "×" + HEIGHT);
}

// ---- 4/5 页面 meta ----
let pages = 0;
const uniqueImages = new Set();
for (const file of walk(DIST)) {
  if (!file.endsWith(".html")) continue;
  const rel = relative(DIST, file).replaceAll("\\", "/");
  // reports/ 是 Quarto 生成的独立报告（iframe 资源）、pagefind/ 是检索索引，都不是站点页面
  if (rel.startsWith("reports/") || rel.startsWith("pagefind/")) continue;
  pages++;
  const html = readFileSync(file, "utf8");
  const imgs = [...html.matchAll(/<meta property="og:image" content="([^"]*)"/g)].map(m => m[1]);
  const alts = [...html.matchAll(/<meta property="og:image:alt" content="([^"]*)"/g)].map(m => m[1]);
  const w = html.match(/<meta property="og:image:width" content="(\d+)"/);
  const h = html.match(/<meta property="og:image:height" content="(\d+)"/);
  if (imgs.length !== 1) {
    problems.push(rel + ": og:image 数量 = " + imgs.length + "（必须恰好 1）");
    continue;
  }
  const url = imgs[0];
  const isLocal = url.startsWith("/") || url.startsWith(SITE_ORIGIN);
  if (isLocal) {
    const path = url.startsWith("/") ? url : new URL(url).pathname;
    uniqueImages.add(path);
    const distFile = join(DIST, decodeURIComponent(path));
    if (!existsSync(distFile)) problems.push(rel + ": og:image 指向的本地文件不存在 → " + path);
  } else {
    uniqueImages.add(url);
  }
  if (!alts.length || !alts[0].trim()) problems.push(rel + ": og:image:alt 缺失或为空（ogp.me 明确要求）");
  if (!w || Number(w[1]) !== WIDTH) problems.push(rel + ": og:image:width 缺失或不等于 " + WIDTH);
  if (!h || Number(h[1]) !== HEIGHT) problems.push(rel + ": og:image:height 缺失或不等于 " + HEIGHT);
}

if (problems.length) {
  console.error("✗ OG 检查失败（" + problems.length + " 项）：");
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(
  "✓ OG 检查通过（" + records.length + " 张图 / " + pages + " 个页面 / og:image 去重后 " + uniqueImages.size + " 个）"
);

