// site/scripts/check-home-metrics.mjs
// 门禁：首页证据面板上的数字，必须与从 src/content **独立重算**的结果一致。
// 独立重算 = 不 import 站点的 src/utils/evidence.ts（否则是同义反复），而是自己数文件、自己读 JSON 字段。
// 这是「面板上没有假数字」的机械保证：任何一方改动而另一方没同步，构建就红。
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = fileURLToPath(new URL("..", import.meta.url));
const C = join(SITE, "src/content");
const DIST_INDEX = join(SITE, "dist/index.html");

const mdCount = d =>
  existsSync(join(C, d)) ? readdirSync(join(C, d)).filter(f => f.endsWith(".md")).length : 0;

const recordFiles = readdirSync(join(C, "dissection-records")).filter(f => f.endsWith(".json"));
const verdicts = recordFiles.map(
  f => JSON.parse(readFileSync(join(C, "dissection-records", f), "utf8")).verdict
);
const countVerdict = v => verdicts.filter(x => x === v).length;

// 与证据面板的 key 一一对应（这是两份实现之间的契约）
const expected = {
  cases: mdCount("case-studies"),
  analysis: mdCount("analysis"),
  dissections: mdCount("dissections"),
  records: recordFiles.length,
  reports: mdCount("toolkit-reports"),
};
const expectedNote = `成功 ${countVerdict("成功")} · 部分 ${countVerdict("部分")} · 失败 ${countVerdict("失败")}`;

// 最近更新：取四个集合 frontmatter 里最大的 pubDatetime，按站点时区拼成与 Datetime.astro
// （dayjs.format("YYYY年M月D日")，不补零）完全同口径的字符串。
const stamps = [];
for (const dir of ["case-studies", "analysis", "dissections", "toolkit-reports"]) {
  const full = join(C, dir);
  if (!existsSync(full)) continue;
  for (const f of readdirSync(full).filter(x => x.endsWith(".md"))) {
    const m = readFileSync(join(full, f), "utf8").match(/^pubDatetime:[ \t]*(.+?)[ \t\r]*$/m);
    if (m) stamps.push(m[1].replace(/^["']|["']$/g, "").trim());
  }
}
const latest = stamps
  .map(s => new Date(s))
  .filter(d => !Number.isNaN(d.valueOf()))
  .sort((a, b) => b - a)[0];
let expectedLatestLabel = null;
if (latest) {
  const iso = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(latest);
  const [y, mo, d] = iso.split("-").map(Number);
  expectedLatestLabel = `${y}年${mo}月${d}日`;
}

const html = readFileSync(DIST_INDEX, "utf8");
const actual = {};
for (const m of html.matchAll(/data-evidence-key="([^"]+)"[^>]*data-evidence-value="(\d+)"/g)) {
  actual[m[1]] = Number(m[2]);
}

const problems = [];
for (const [k, v] of Object.entries(expected)) {
  if (!(k in actual)) problems.push(`首页缺证据项 ${k}`);
  else if (actual[k] !== v) problems.push(`${k}: 页面显示 ${actual[k]}，内容集合实际 ${v}`);
}
const extra = Object.keys(actual).filter(k => !(k in expected));
if (extra.length) problems.push(`首页出现门禁不认识的证据项 ${extra.join("、")}（取数模块与门禁必须同步改）`);
if (!html.includes(expectedNote))
  problems.push(`首页判定分布文案与记录集合不一致，期望出现「${expectedNote}」`);
if (!latest) problems.push("未能从内容集合解析出任何 pubDatetime，无法核对「最近更新」");
else if (!html.includes(expectedLatestLabel))
  problems.push(`首页「最近更新」与内容集合最大 pubDatetime 不一致，期望出现「${expectedLatestLabel}」`);

if (problems.length) {
  console.error("✗ 首页证据面板校验失败：");
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(
  `✓ 首页证据面板校验通过（${Object.keys(expected).length} 项数字 + 判定分布「${expectedNote}」+ 最近更新「${expectedLatestLabel}」与内容集合一致）`
);
