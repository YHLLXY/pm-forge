// A1 评测记录交叉校验（挂 build 链）：zod 管单条记录形状，这里管跨记录不变量。
// 章程 v2.0：铁律 3（无版本标注的结论不得存在）、失败归因、隐私红线、验收②数据层兜底。
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

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

// ── ⑦ 报告正文数字 ↔ 记录集合一致性（A1/B 两轮审查人工抓错类的机械化，2026-10-06 计划 Task 2）──
// 分层：claims 形状由 zod（astro build）验；本层管跨文件不变量 + 正文措辞 + 引用完整性。
const recordIds = new Set(records.map(r => r.id).filter(Boolean));
let claimsChecked = 0;
let reportMdFiles = [];
try {
  reportMdFiles = readdirSync(REPORTS_DIR).filter(f => f.endsWith(".md") && !f.startsWith("_"));
} catch {
  // 报告目录不存在（0 条目态）：⑦ 无事可做，③ 已覆盖该态
}
for (const f of reportMdFiles) {
  const raw = readFileSync(join(REPORTS_DIR, f), "utf8");
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!fmMatch) {
    fail(`${f}: 找不到 frontmatter`);
    continue;
  }
  let fm;
  try {
    fm = parseYaml(fmMatch[1]);
  } catch {
    fail(`${f}: frontmatter YAML 解析失败（zod 门禁应已先报错）`);
    continue;
  }
  const body = raw.slice(fmMatch[0].length);
  const claims = fm.claims;
  if (!claims || typeof claims.recordCount !== "number" || !claims.verdicts) {
    fail(`${f}: 缺 claims（recordCount/verdicts）——报告条数与判定分布必须结构化声明（⑦）`);
    continue;
  }
  claimsChecked++;
  const mine = records.filter(r => r.product === fm.product);
  const v = claims.verdicts;
  // 7a 求和自洽
  if (v["成功"] + v["部分"] + v["失败"] !== claims.recordCount) {
    fail(`${f}: claims.verdicts 求和 ≠ recordCount（${v["成功"]}+${v["部分"]}+${v["失败"]} ≠ ${claims.recordCount}）`);
  }
  // 7b 声称 ↔ 实际记录集合
  if (claims.recordCount !== mine.length) {
    fail(`${f}: claims.recordCount=${claims.recordCount} 但 product=${fm.product} 实际 ${mine.length} 条记录`);
  }
  for (const verdict of ["成功", "部分", "失败"]) {
    const actual = mine.filter(r => r.verdict === verdict).length;
    if (v[verdict] !== actual) {
      fail(`${f}: claims.verdicts.${verdict}=${v[verdict]} 但实际 ${actual} 条`);
    }
  }
  // 7c 正文判定分布句 ↔ claims（标准句式：「N 条实测：**X 条成功、Y 条部分完成、Z 条失败**」）
  // 锚定「条成功」而非「条失败」：deepseek.md「chat 模式的 3 条失败不代表 reasoner 档」这类叙述不应误报。
  // 可选组缺段按 0 比对——正文三段句式必须写全（如「X 条成功、Y 条失败」省略部分完成段，而 claims.部分>0 时会误报不一致）。
  let distSeen = false;
  for (const m of body.matchAll(/(\d+)\s*条成功(?:、\s*(\d+)\s*条部分完成)?(?:、\s*(\d+)\s*条失败)?/g)) {
    distSeen = true;
    const [s, p, fl] = [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)];
    if (s !== v["成功"] || p !== v["部分"] || fl !== v["失败"]) {
      fail(`${f}: 正文判定分布 ${s}成功/${p}部分/${fl}失败 与 claims（${v["成功"]}/${v["部分"]}/${v["失败"]}）不一致`);
    }
  }
  if (!distSeen) warn(`${f}: 正文未见判定分布句——claims 仍是权威层，但建议正文保留标准句式`);
  // 7d 正文条数总声称 ↔ recordCount（只认「N 条实测：」「N 条记录：」引导句；标题/描述在 frontmatter 已排除）
  for (const m of body.matchAll(/(\d+)\s*条(?:实测|记录)：/g)) {
    if (Number(m[1]) !== claims.recordCount) {
      fail(`${f}: 正文条数声称「${m[1]} 条」与 claims.recordCount=${claims.recordCount} 不一致`);
    }
  }
  // 7e 正文引用的记录 id 必须存在（允许前缀引用记录对：ds-reason-004 → ds-reason-004-chat/-reasoner）
  for (const m of body.matchAll(/(?:doubao|kimi|ds)-[a-z0-9]+-\d{3}(?:-[a-z]+)?/g)) {
    const ref = m[0];
    if (!recordIds.has(ref) && ![...recordIds].some(id => id.startsWith(`${ref}-`))) {
      fail(`${f}: 引用了不存在的记录 id「${ref}」`);
    }
  }
}

if (problems.length) {
  console.error(`评测记录校验 ${problems.length} 项不通过：\n` + problems.map(p => `  - ${p}`).join("\n"));
  process.exit(1);
}
for (const w of warnings) console.warn(`  ⚠ ${w}`);
console.log(`评测记录校验通过 ✓（${records.length} 条记录；失败 ${failureCount} 条；报告 ${reportCount} 篇；claims 核对 ${claimsChecked} 篇）`);
