// site/scripts/check-typography.mjs
// 门禁：正文里的"数字 ~ 数字"范围号一律拦下。
// 为什么需要：2026-10-27 用户指着分析页问"这些横杠什么意思"——
//   原文 `26~102%` 与 `40~60%`：`~` 在本站字体里渲染成一条低平横杠，
//   加上首位数字没写 %，读者一眼读成 "26102%" / "4060%"，数字直接失真。
//   `~` 和 `-`（连字符）、`—`（破折号）在同一行里根本分不清，这不是审美问题，是读数错误。
// 写法：中文里用 "26% 至 102%"；两个数字都要带单位。
// 豁免：markdown 的 fenced code block（数据样例里出现 1~2 是合法的）。
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = fileURLToPath(new URL("..", import.meta.url));
const SCAN = ["src/content", "src/pages", "src/components"]
  .map(d => join(SITE, d))
  .filter(existsSync);

// 数字（可带小数）~ 数字。前后都不许是标识符字符，避免把 SVG path 里的 "12~3" 之类算进来。
const RANGE = /(?<![0-9A-Za-z_.])\d+(?:\.\d+)?\s*~\s*\d+(?:\.\d+)?(?![0-9A-Za-z_])/g;

const problems = [];
let files = 0;
let scanned = 0;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(md|mdx|astro)$/.test(p)) yield p;
  }
}

for (const root of SCAN) {
  for (const file of walk(root)) {
    files++;
    const rel = relative(SITE, file).replaceAll("\\", "/");
    const isMd = /\.mdx?$/.test(file);
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    let fenced = false;
    lines.forEach((raw, i) => {
      if (isMd && /^\s*(```|~~~)/.test(raw)) fenced = !fenced;
      if (fenced) return;
      scanned++;
      for (const m of raw.matchAll(RANGE)) {
        problems.push(rel + ":" + (i + 1) + "  " + m[0] + "   " + raw.trim().slice(0, 100));
      }
    });
  }
}

if (problems.length) {
  console.error("✗ 排版检查失败（" + problems.length + " 处范围号）：");
  for (const p of problems) console.error("  " + p);
  console.error('  修法：把 "26~102%" 写成 "26% 至 102%"（两个数字都带单位），不要用 ~ 做范围号');
  process.exit(1);
}
console.log(
  "✓ 排版检查通过（" + files + " 个文件，" + scanned + " 行，0 处 ~ 范围号）"
);
