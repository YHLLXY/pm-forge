// 验收②：每篇案例必须四段式 + 量化结果（metrics 或 resultsNote 二者其一）
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = new URL("../src/content/case-studies/", import.meta.url);
const REQUIRED = ["背景与问题", "我的角色", "过程与关键取舍", "结果与量化"];

let files = [];
try {
  files = readdirSync(DIR).filter(f => /\.(md|mdx)$/.test(f) && !f.startsWith("_"));
} catch {
  console.log("案例检查通过：case-studies 目录不存在（0 篇）");
  process.exit(0);
}

const errors = [];

for (const file of files) {
  const text = readFileSync(join(decodeURIComponent(DIR.pathname), file), "utf8");
  const fm = text.split(/^---$/m)[1] ?? "";
  const h2s = [...text.matchAll(/^##\s+(.+)$/gm)].map(m => m[1]);

  for (const need of REQUIRED) {
    if (!h2s.some(h => h.includes(need))) {
      errors.push(`${file}: 缺 H2 小节「${need}」`);
    }
  }
  const hasMetrics = /^\s*-\s*label:/m.test(fm);
  const hasNote = /^\s*resultsNote:\s*\S/m.test(fm);
  if (!hasMetrics && !hasNote) {
    errors.push(
      `${file}: 无 metrics 且无 resultsNote——量化结果检查不过（不许空着也不许编数）`
    );
  }
}

if (errors.length) {
  console.error(
    `案例检查未过（${errors.length} 处）：\n` +
      errors.map(e => `  - ${e}`).join("\n")
  );
  process.exit(1);
}
console.log(`案例检查通过：${files.length} 篇 × 四段式 + 量化结果 ✓`);
