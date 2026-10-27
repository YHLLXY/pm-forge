// site/scripts/make-webp.mjs
// 把证据截图 PNG 转成 webp，并写一份尺寸旁路清单。
//
// 为什么不改 public/assets/dissections/manifest.json：
// 那份清单是 scripts/sanitize-shots.mjs 的产物、格式被 RecordCard 按文件名消费，
// 一改格式就得同步改生产端，容易断。这里只**新增** manifest-webp.json，
// 读不到就整段不渲染 <source>，浏览器回落 PNG —— 退化路径永远是能看的。
//
// 为什么用 sharp 而不是自研：sharp 已经是本项目可用的传递依赖（libvips 预编译），
// 再引一个编码器只会增加供应链面。实测 0.35.5 可从 site/ 直接 import。
//
// 用法：
//   node scripts/make-webp.mjs            # 只转新文件（webp 比 png 新则跳过）
//   node scripts/make-webp.mjs --force    # 全量重转
//   node scripts/make-webp.mjs --report   # 只统计，不写文件
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = fileURLToPath(new URL("..", import.meta.url));
const DIR = join(SITE, "public/assets/dissections");
const MANIFEST = join(DIR, "manifest-webp.json");
const QUALITY = 82;
const FORCE = process.argv.includes("--force");
const REPORT_ONLY = process.argv.includes("--report");

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch (e) {
  console.error("✗ 无法 import sharp：" + String((e && e.message) || e));
  console.error("  sharp 是本项目的传递依赖；若 node_modules 被重装且没带上，请 npm i -D sharp 后再跑。");
  process.exit(1);
}

const pngs = readdirSync(DIR).filter(f => f.endsWith(".png"));
if (!pngs.length) {
  console.error("✗ " + DIR + " 下没有 PNG");
  process.exit(1);
}

const out = {};
let pngBytes = 0;
let webpBytes = 0;
let converted = 0;
let skipped = 0;

for (const png of pngs) {
  const base = png.replace(/\.png$/, "");
  const src = join(DIR, png);
  const dst = join(DIR, base + ".webp");
  pngBytes += statSync(src).size;

  const fresh = existsSync(dst) && statSync(dst).mtimeMs >= statSync(src).mtimeMs;
  const meta = await sharp(src).metadata();
  out[base] = [meta.width, meta.height];

  if (REPORT_ONLY || (fresh && !FORCE)) {
    webpBytes += existsSync(dst) ? statSync(dst).size : 0;
    skipped++;
    continue;
  }
  await sharp(src).webp({ quality: QUALITY, effort: 4 }).toFile(dst);
  webpBytes += statSync(dst).size;
  converted++;
}

const mb = n => (n / 1024 / 1024).toFixed(2) + " MB";
const kb = n => Math.round(n / 1024) + " KB";
console.log(
  "证据图 " +
    pngs.length +
    " 张：PNG 合计 " +
    mb(pngBytes) +
    "（均 " +
    kb(pngBytes / pngs.length) +
    "）→ webp 合计 " +
    mb(webpBytes) +
    "（均 " +
    kb(webpBytes / pngs.length) +
    "），省 " +
    Math.round((1 - webpBytes / pngBytes) * 100) +
    "%"
);
console.log("本次转换 " + converted + " 张，跳过 " + skipped + " 张（--force 可全量重转）");

if (!REPORT_ONLY) {
  writeFileSync(MANIFEST, JSON.stringify(out, null, 0) + "\n");
  console.log("已写 " + MANIFEST + "（" + Object.keys(out).length + " 项尺寸）");
}
