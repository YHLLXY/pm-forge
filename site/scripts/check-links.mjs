// 构建产物死链检查：dist 内 HTML 引用的站内 href/src 必须有落点
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = decodeURIComponent(new URL("../dist/", import.meta.url).pathname);
const SKIP = /^(https?:|mailto:|tel:|data:|#|javascript:)/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const distFiles = new Set();
for (const p of walk(DIST)) {
  distFiles.add(p.slice(DIST.length).replaceAll("\\", "/"));
}

function resolves(link) {
  const clean = link.split("#")[0].split("?")[0];
  if (clean === "") return true;
  const target = clean.replace(/^\//, "");
  if (distFiles.has(target)) return true; // 命中文件
  if (distFiles.has(target.replace(/\/$/, "") + "/index.html")) return true; // 目录页
  if (distFiles.has(target.replace(/\/$/, ""))) return true; // 无尾斜杠文件
  return false;
}

const broken = [];
for (const p of [...distFiles].filter(f => f.endsWith(".html"))) {
  const html = readFileSync(join(DIST, p), "utf8");
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]);
  for (const ref of refs) {
    if (SKIP.test(ref)) continue;
    if (!ref.startsWith("/")) continue; // 相对路径按根处理（本站无 base）
    if (!resolves(ref)) broken.push(`${p} -> ${ref}`);
  }
}

if (broken.length) {
  console.error(
    `死链 ${broken.length} 条：\n` + broken.map(b => `  - ${b}`).join("\n")
  );
  process.exit(1);
}
console.log(`死链检查通过 ✓（扫描 ${distFiles.size} 个产物文件）`);
