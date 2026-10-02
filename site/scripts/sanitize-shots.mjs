// A1 发布截图脱敏：staging shot.png → site/public/assets/dissections/<id>.png
// 原则：原图（含账号昵称）永不入 git；发布图裁掉侧栏/遮盖昵称区。
// 用法（在 toolkit 目录跑，借它的 playwright）：node ../site/scripts/sanitize-shots.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// playwright 从调用方 CWD 解析（脚本本体在 site，playwright 装在 toolkit）
const { chromium } = await import(pathToFileURL(join(process.cwd(), "node_modules", "playwright", "index.mjs")).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const STAGING = join(HERE, "..", "out", "dissection-staging");
const OUTDIR = join(HERE, "..", "public", "assets", "dissections");
mkdirSync(OUTDIR, { recursive: true });

// 每张图的脱敏配置：crop = 裁切窗口（原图坐标）；redact = 遮盖块（裁后坐标，白色盖板）
const PLAN = {
  // 豆包会话布局：左 283px 是侧栏（含昵称 Mr.墨言无殇），全部裁掉
  defaultDoubao: { crop: { x: 283, y: 0, width: 997, height: 720 } },
  "doubao/doubao-struct-004": { crop: { x: 283, y: 0, width: 997, height: 505 } },
  // 豆包画布布局（write-003）：无侧栏；右侧云文档面板有两处昵称，白块遮盖
  "doubao/doubao-write-003": {
    crop: { x: 0, y: 0, width: 1280, height: 720 },
    redact: [
      { x: 720, y: 0, width: 260, height: 42 },
      { x: 720, y: 168, width: 280, height: 36 },
    ],
  },
  // Kimi 截图侧栏已折叠（无昵称），原图直出
  defaultKimi: { crop: null },
};

const jobs = [];
for (const product of ["doubao", "kimi"]) {
  const base = join(STAGING, product);
  if (!existsSync(base)) continue;
  for (const dir of readdirSyncDir(base)) {
    const shot = join(base, dir, "shot.png");
    if (!existsSync(shot)) continue;
    const key = `${product}/${dir}`;
    const plan = PLAN[key] ?? (product === "doubao" ? PLAN.defaultDoubao : PLAN.defaultKimi);
    jobs.push({ id: dir, shot, plan });
  }
}

function readdirSyncDir(p) {
  return readdirSync(p).filter(d => statSync(join(p, d)).isDirectory());
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
let done = 0;
const manifest = {};
for (const { id, shot, plan } of jobs) {
  const b = readFileSync(shot);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  const { crop, redact = [] } = plan;
  const box = crop ?? { x: 0, y: 0, width: w, height: h };
  const dataUrl = `data:image/png;base64,${b.toString("base64")}`;
  await page.setContent(
    `<body style="margin:0"><img id="im" src="${dataUrl}" style="position:absolute;left:0;top:0;width:${w}px;height:${h}px">
     ${redact.map(r => `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;background:#fff"></div>`).join("")}
    </body>`
  );
  await page.evaluate(() => new Promise(res => { const im = document.getElementById("im"); im.complete ? res() : (im.onload = res); }));
  const out = join(OUTDIR, `${id}.png`);
  await page.screenshot({ path: out, clip: box });
  manifest[id] = [box.width, box.height];
  done++;
  console.log(`${id}.png ✓ ${box.width}×${box.height}${redact.length ? `（遮盖 ${redact.length} 处）` : ""}`);
}
await browser.close();
writeFileSync(join(OUTDIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`完成 ${done}/${jobs.length} → site/public/assets/dissections/（含 manifest.json）`);
