// site/scripts/fetch-og-font.mjs —— 下载 OG 生成器要用的字体（OFL-1.1，Noto Sans SC，400/700）
//
// 为什么走「旧 UA + 旧 CSS 端点」：新端点（css2）只给 woff2，而 satori 官方明确 WOFF2 is not supported。
// 旧 UA 会让 Google Fonts 返回整份 chinese-simplified 子集的 woff（约 1.6MB/字重）。
// 产物落在 site/scripts/og-assets/（已 .gitignore）——只本地生成用，**不入库、不随站点分发**。
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(fileURLToPath(new URL(".", import.meta.url)), "og-assets");
const UA = "Mozilla/5.0 (Windows NT 5.1) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/14.0.835.202 Safari/535.1";
const CSS = "https://fonts.googleapis.com/css?family=Noto+Sans+SC:400,700&subset=chinese-simplified";

mkdirSync(OUT, { recursive: true });
const css = await fetch(CSS, { headers: { "user-agent": UA } }).then(r => r.text());
const faces = [...css.matchAll(/font-weight:\s*(\d+);[\s\S]*?url\((https:[^)]+)\)/g)].map(m => [m[1], m[2]]);
if (!faces.length) {
  console.error("✗ Google Fonts 没返回任何 @font-face，检查网络或用 OG_FONT_DIR 指定本地字体目录");
  process.exit(1);
}
for (const [weight, url] of faces) {
  const buf = Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
  writeFileSync(join(OUT, `NotoSansSC-${weight}.woff`), buf);
  console.log(`✓ NotoSansSC-${weight}.woff  ${(buf.length / 1024).toFixed(0)} KB`);
}
console.log("→ 字体在 " + OUT + "（已 gitignore）");

