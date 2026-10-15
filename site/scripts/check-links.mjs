// 构建产物死链检查：dist 内 HTML 引用的站内 href/src 必须有落点
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
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
  if (clean === "" || clean === "/") return true;
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

// 第二趟：内容里不得出现指向 *.vercel.app 的可点击链接。
// 为什么必须另开一趟：上面的 SKIP 正则 /^(https?:|...)/ 把一切外链显式跳过 —— 也就是说
// 「能过门禁、但在国内点不开」的链接，本脚本原来一条都抓不到。这正是本次的漏洞成因。
// 为什么要禁：*.vercel.app 整片域在国内被 DNS 污染（实测解析到 Facebook 网段 / SERVFAIL），
// 且 Vercel 边缘不会回 404，表现为 TCP 连接超时 —— 对读者形同死链。绑自定义域名即可解决。
const vercelRefs = [];
for (const p of [...distFiles].filter(f => f.endsWith(".html"))) {
  const html = readFileSync(join(DIST, p), "utf8");
  // 判据用 URL 解析而不是正则：能正确处理协议相对（//x.vercel.app）、大小写与裸根域，
  // 且不会把 vercel.app.evil.com 这类「只是长得像」的域名误判。
  // （正则版实测 3 漏 + 1 误报：漏协议相对/漏 src/漏裸根域，误报 *.vercel.app.* 后缀域名。）
  // href 与 src 都查：外链图片同样点不开。
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/gi)) {
    let host;
    try { host = new URL(m[1], "https://x.invalid/").hostname; } catch { continue; }
    if (host === "vercel.app" || host.endsWith(".vercel.app")) {
      vercelRefs.push(`${p} -> ${m[1]}`);
    }
  }
}
if (vercelRefs.length) {
  console.error(
    `内容里出现指向 *.vercel.app 的链接/资源 ${vercelRefs.length} 条（该域国内被 DNS 污染，点不开）：\n` +
    vercelRefs.map(b => `  - ${b}`).join("\n")
  );
  process.exit(1);
}

console.log(`死链检查通过 ✓（扫描 ${distFiles.size} 个产物文件；无 *.vercel.app 链接）`);
