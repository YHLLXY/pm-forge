// A1 评测记录交叉校验（挂 build 链）：zod 管单条记录形状，这里管跨记录不变量。
// 章程 v2.0：铁律 3（无版本标注的结论不得存在）、失败归因、隐私红线、验收②数据层兜底。
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = fileURLToPath(new URL("../src/content/dissection-records/", import.meta.url));
const REPORTS_DIR = fileURLToPath(new URL("../src/content/dissections/", import.meta.url));

const problems = [];
const warnings = [];
const fail = msg => problems.push(msg);
const warn = msg => warnings.push(msg);

// ── 隐私模式规则（可入库层）：只放"模式"，真实人名等具体词表放 gitignored 私有文件 ──
// 词表文件 = ../out/dissection-privacy-lexicon.txt（每行一个词；缺失则跳过该子项并提示）
const PRIVACY_PATTERNS = [
  { name: "手机号", re: /(?<!\d)1[3-9]\d{9}(?!\d)/ },
  { name: "身份证号", re: /(?<!\d)\d{17}[\dXx](?!\d)/ },
];
let lexiconWords = [];
try {
  lexiconWords = readFileSync(join(BASE, "..", "..", "..", "out", "dissection-privacy-lexicon.txt"), "utf8")
    .split("\n")
    .map(w => w.trim())
    .filter(w => w.length > 1);
} catch {
  warn("私有隐私词表未加载（out/dissection-privacy-lexicon.txt 不存在），人名词表子项跳过——防御不完整");
}

function privacyScan(rec) {
  const texts = [rec.task, rec.inputExcerpt, rec.outputExcerpt, rec.failureAnalysis ?? ""].join("\n");
  for (const { name, re } of PRIVACY_PATTERNS) {
    if (re.test(texts)) fail(`${rec.id}: 疑似${name}命中（铁律 6）`);
  }
  for (const w of lexiconWords) {
    if (texts.includes(w)) fail(`${rec.id}: 命中私有词表「${w.length} 字词」（铁律 6，详情见本地词表）`);
  }
}

// ── 记录文件扫描 ──
let files;
try {
  files = readdirSync(BASE).filter(f => f.endsWith(".json") && !f.startsWith("_"));
} catch {
  files = []; // 目录不存在 = 尚无记录，走 0 条目态
}

const records = [];
for (const f of files) {
  let rec;
  try {
    rec = JSON.parse(readFileSync(join(BASE, f), "utf8"));
  } catch {
    fail(`${f}: 不是合法 JSON（zod 门禁应已先报错）`);
    continue;
  }
  // ⑥ 文件名 === 记录 id（glob loader 的 entry id 取自文件名）
  if (rec.id && f !== `${rec.id}.json`) fail(`${f}: 文件名与记录 id「${rec.id}」不一致`);
  // ① 日期 + 版本（zod 已强制，此处兜底人工直改文件绕过类型层的场景）
  if (!rec.evalDate || !/^\d{4}-\d{2}-\d{2}$/.test(rec.evalDate)) fail(`${rec.id ?? f}: evalDate 缺失或非 YYYY-MM-DD（铁律 3）`);
  if (!rec.versionNote || !String(rec.versionNote).trim()) fail(`${rec.id ?? f}: versionNote 缺失（铁律 3）`);
  // ② 失败必有归因
  if (rec.verdict && rec.verdict !== "成功" && !(rec.failureAnalysis ?? "").trim()) {
    fail(`${rec.id}: verdict=${rec.verdict} 但缺 failureAnalysis（章程 §4）`);
  }
  // ④ 引号平衡 → warning（≤400 字截断摘录在引号中间截断是合法形态）
  const full = (rec.outputExcerpt ?? "") + (rec.inputExcerpt ?? "");
  const open = (full.match(/“/g) ?? []).length;
  const close = (full.match(/”/g) ?? []).length;
  if (open !== close) warn(`${rec.id}: 摘录引号开闭不平衡（${open}/${close}）——若是截断所致可忽略，否则人工核对`);
  privacyScan(rec);
  records.push(rec);
}

// ── ③ 验收②数据层兜底：报告集合 ≥1 篇时，失败记录必须 ≥5（0 条目章程先行阶段放行）──
let reportCount = 0;
try {
  reportCount = readdirSync(REPORTS_DIR).filter(f => f.endsWith(".md") && !f.startsWith("_")).length;
} catch {
  reportCount = 0;
}
const failureCount = records.filter(r => r.verdict === "失败").length;
if (reportCount >= 1 && failureCount < 5) {
  fail(`已有 ${reportCount} 篇拆解报告但失败记录仅 ${failureCount} 条（spec 验收②要求 ≥5）——补失败案例或如实说明样本局限`);
}

if (problems.length) {
  console.error(`评测记录校验 ${problems.length} 项不通过：\n` + problems.map(p => `  - ${p}`).join("\n"));
  process.exit(1);
}
for (const w of warnings) console.warn(`  ⚠ ${w}`);
console.log(`评测记录校验通过 ✓（${records.length} 条记录；失败 ${failureCount} 条；报告 ${reportCount} 篇）`);
