// site/scripts/check-tokens.mjs
// 门禁：页面与组件里不许出现颜色字面量，颜色只能来自 src/styles/theme.css 的 token。
// 为什么需要：token 纪律现在靠自觉。四站拆解里法典 fadian.icu 的 CSS 有 21 处裸 hex，
// 结果同一套"品牌蓝"在不同区块深浅不一；本站组件层目前是 0 处，没有门禁就守不住下一次。
// 豁免：src/styles/*.css（token 定义处）与 src/assets/**（SVG 图标自带 fill/stroke）。
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = fileURLToPath(new URL("..", import.meta.url));
const SCAN = ["src/pages", "src/components"].map(d => join(SITE, d)).filter(existsSync);

// 8/6/4/3 位十六进制，且后面必须**不是**标识符字符。
// 为什么这么紧：`document.querySelector("#back-button")` 里的 `#bac` 是三位合法十六进制，
// 只排除十六进制数字的话会被误判成颜色（实测踩到）。加 - 与字母后，`#back-button` 不再命中。
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g;

// 两类必排除的"看起来像颜色"的用法：
//   href="#slug" / url(#grad) —— 锚点与 SVG 渐变引用；#ded / #face 这类纯十六进制 slug 会误判
const isReference = (line, index) => {
  const before = line.slice(Math.max(0, index - 8), index);
  return /url\(\s*$/.test(before) || /href=\s*["']$/.test(before) || /xlink:href=\s*["']$/.test(before);
};

const problems = [];
let files = 0;
let scannedLines = 0;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith(".astro")) yield p;
  }
}

for (const root of SCAN) {
  for (const file of walk(root)) {
    files++;
    const rel = relative(SITE, file).replaceAll("\\", "/");
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((raw, i) => {
      scannedLines++;
      // 先剥掉 HTML 实体：&#10005; / &#169; / &#x2713; 里的 #10005 会被朴素正则当成颜色
      const line = raw.replace(/&#\d+;|&#[xX][0-9a-fA-F]+;/g, " ");
      for (const m of line.matchAll(HEX)) {
        if (isReference(line, m.index)) continue;
        problems.push(rel + ":" + (i + 1) + "  " + m[0] + "   " + raw.trim());
      }
    });
  }
}

if (problems.length) {
  console.error("✗ 颜色 token 检查失败（" + problems.length + " 处裸 hex）：");
  for (const p of problems) console.error("  " + p);
  console.error("  修法：用 var(--accent) / var(--section-case) 等 token，或在 src/styles/theme.css 里新增 token");
  process.exit(1);
}
console.log(
  "✓ 颜色 token 检查通过（" + files + " 个 .astro，" + scannedLines + " 行，0 处裸 hex）"
);
