// 一次性存量转换：把 Markdown 正文里的成对直引号 "…" 换成全角 “…”。
// 背景：smartypants 对中文上下文会把 "…" 错误转成两个右引号 ”…”（2026-09-30 用户反馈），
// 已在 astro.config.ts 关闭 smartypants；本脚本负责存量内容，跳过 frontmatter / 围栏代码块 /
// 行内代码 / HTML 属性 / Markdown 链接的 URL 与 title 部分。
// 用法：node scripts/fix-quotes.mjs [--dry]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dry = process.argv.includes("--dry");
const roots = ["src/content"];
const files = [];

function walk(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p);
    else if (name.name.endsWith(".md")) files.push(p);
  }
}
roots.forEach(walk);

let total = 0;
for (const file of files) {
  const src = readFileSync(file, "utf-8");
  const lines = src.split("\n");

  // 定位 frontmatter 边界（首行是 --- 时）。fmCount 从 0 起：首行 --- 计数 1，
  // 再次遇到 --- 才是结束（2026-09-30 首版把开头 --- 当结尾，把 frontmatter 也转了——已修）
  let inFrontmatter = lines[0]?.trim() === "---";
  let fmCount = 0;

  let inFence = false;
  let open = false; // 成对配对状态
  const out = lines.map(line => {
    if (inFrontmatter) {
      fmCount += 1;
      if (fmCount > 1 && line.trim() === "---") inFrontmatter = false;
      return line; // frontmatter 原样（YAML 语法需要直引号）
    }
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line; // 代码块原样（JSON 等需要直引号）

    // 按片段处理：行内代码与 HTML 属性、链接 URL 原样保留
    const parts = line.split(/(`[^`]*`|="[^"]*"|=\{[^}]*\}|\]\([^)]*\))/g);
    return parts
      .map((part, i) => {
        if (i % 2 === 1) return part; // 捕获组（代码/属性/链接）原样
        return part.replace(/"/g, () => {
          open = !open;
          return open ? "\u201C" : "\u201D"; // “ ”
        });
      })
      .join("");
  });

  const changed = out.join("\n");
  const n = (changed.match(/[\u201C\u201D]/g) ?? []).length - (src.match(/[\u201C\u201D]/g) ?? []).length;
  if (n > 0) {
    console.log(`${file}: 转换 ${n} 处`);
    total += n;
    if (!dry) writeFileSync(file, changed, "utf-8");
  }
  if (open) console.warn(`⚠ ${file}: 引号不成对（已转换部分可能错向），请人工检查`);
}
console.log(dry ? `[dry] 共 ${total} 处待转换` : `完成，共转换 ${total} 处`);
