// site/scripts/check-levels.mjs
// 门禁：案例详情页的「阅读档位」内容约定。
// 为什么需要：简明档只显示「每个 <h2> 后的第一段」，靠的是约定而不是标记——
//   约定一旦被破坏（写成列表开头、把第一段当正文写），简明档会安静地变成空页，
//   肉眼在完整档下看不出任何异常。这条门禁把约定变成可失败的检查。
// 断言：
//   ① 每篇必须有 .levelled 正文；
//   ② 每个 <h2> 后的第一个元素必须是 <p>（导读）；
//   ③ 导读 20–80 字（不计空白）；
//   ④ 导读里出现过的数字，必须在该节**正文**（导读之后）里出现——防止两处数字说岔；
//   ⑤ 导读不得命中术语黑名单（导读是给"小白"看的，术语应当在完整档里）。
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = fileURLToPath(new URL("..", import.meta.url));
const ROOT = join(SITE, "dist", "case-studies");

const BLACKLIST = ["注册中心", "双适配器", "幂等", "编排", "灰度", "evenodd", "适配器"];

const problems = [];
let pages = 0;
let sections = 0;

const strip = (s) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

if (!existsSync(ROOT)) {
  console.error("✗ 阅读档位检查失败：dist/case-studies 不存在（先 npm run build）");
  process.exit(1);
}

const dirs = readdirSync(ROOT).filter((name) => {
  const p = join(ROOT, name);
  return statSync(p).isDirectory() && existsSync(join(p, "index.html"));
});

for (const dir of dirs) {
  const file = join(ROOT, dir, "index.html");
  const rel = relative(SITE, file).replaceAll("\\", "/");
  const html = readFileSync(file, "utf8");
  pages++;

  const article = html.match(/<article[^>]*\blevelled\b[^>]*>([\s\S]*?)<\/article>/);
  if (!article) {
    problems.push(rel + "  找不到 .levelled 正文（详情页模板是不是没加 class？）");
    continue;
  }
  const body = article[1];
  const heads = [...body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
  if (heads.length === 0) {
    problems.push(rel + "  正文里没有 <h2>，无法分节");
    continue;
  }

  heads.forEach((m, i) => {
    sections++;
    const start = m.index + m[0].length;
    const end = i + 1 < heads.length ? heads[i + 1].index : body.length;
    const section = body.slice(start, end);
    const title = strip(m[1]).slice(0, 20);
    const leadMatch = section.match(/^\s*<p[^>]*>([\s\S]*?)<\/p>/);
    if (!leadMatch) {
      problems.push(rel + "  「" + title + "」第一个元素不是 <p>，简明档会是空节");
      return;
    }
    const lead = strip(leadMatch[1]);
    const rest = strip(section.slice(leadMatch[0].length));
    const len = lead.replace(/\s/g, "").length;
    if (len < 20 || len > 80) {
      problems.push(rel + "  「" + title + "」导读 " + len + " 字（应在 20–80）：" + lead.slice(0, 40) + "…");
    }
    for (const term of BLACKLIST) {
      if (lead.includes(term)) {
        problems.push(rel + "  「" + title + "」导读含术语「" + term + "」：" + lead.slice(0, 40) + "…");
      }
    }
    for (const num of lead.match(/\d+(?:\.\d+)?/g) || []) {
      if (!rest.includes(num)) {
        problems.push(rel + "  「" + title + "」导读里的 " + num + " 在本节正文里找不到（两处数字说岔了？）");
      }
    }
  });
}

if (problems.length) {
  console.error("✗ 阅读档位检查失败（" + problems.length + " 项）：");
  for (const p of problems) console.error("  " + p);
  console.error("  约定：每个 <h2> 后第一段就是导读，20–80 字、不含术语、数字与正文一致");
  process.exit(1);
}

console.log(
  "✓ 阅读档位检查通过（" + pages + " 篇 / " + sections + " 节，导读均在 20–80 字且数字与正文一致）"
);
