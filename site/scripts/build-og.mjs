// site/scripts/build-og.mjs —— 本地生成逐页 OG 图（1200×630 PNG）+ public/og/manifest.json
//
// 路线：本地生成 + 产物入库 + 陈旧门禁（check-og.mjs）。理由：不让部署链依赖任何原生/浏览器依赖，
// 与 public/assets/dissections/*.png（40 张）「脚本生成 + 入库 + manifest」的既有做法一致。
// 不需要网络、不需要浏览器；改了标题/描述/metrics 必须重跑本脚本（由 check-og.mjs 强制）。
//
// 字体：Noto Sans SC（OFL-1.1），放在 site/scripts/og-assets/（已 .gitignore，不入库）。
//   node scripts/fetch-og-font.mjs 可重新下载（Google Fonts 旧 UA 端点，返回整份 chinese-simplified 子集 woff）。
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import subsetFont from "subset-font";
import { COLLECTIONS, deriveCardData, entryHash, collectTexts, buildCard, estimateWidth } from "./og/card.mjs";

const SITE = fileURLToPath(new URL("..", import.meta.url));
const C = join(SITE, "src/content");
const OUT = join(SITE, "public/og");
const ASSETS = process.env.OG_FONT_DIR || join(SITE, "scripts/og-assets");
const WEIGHTS = [400, 700];
const WIDTH = 1200;
const HEIGHT = 630;
// 兜底字符：数字、常见标点与中文单位，避免子集漏字导致豆腐块
const BASELINE = "0123456789-.·/｜年月日成功部分失败案例研究数据分析工具箱实跑报告条篇个其中可在线访问提示词版本…->";

function readEntries() {
  const out = [];
  for (const dir of Object.keys(COLLECTIONS)) {
    const abs = join(C, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs).filter(x => x.endsWith(".md"))) {
      const text = readFileSync(join(abs, f), "utf8");
      const fm = parseYaml(text.split(/^---$/m)[1] ?? "") ?? {};
      if (!fm.title) continue;
      out.push({ dir, id: f.replace(/\.md$/, ""), fm });
    }
  }
  return out;
}

function siteConfig() {
  const cfg = readFileSync(join(SITE, "astro-paper.config.ts"), "utf8");
  const pick = k => (cfg.match(new RegExp(k + ':\\s*"([^"]+)"')) || [])[1];
  return {
    title: pick("title") ?? "余翰林 · 产品作品集",
    description: pick("description") ?? "",
  };
}

async function buildFonts(charset) {
  const fonts = [];
  for (const weight of WEIGHTS) {
    const file = join(ASSETS, `NotoSansSC-${weight}.woff`);
    if (!existsSync(file)) {
      console.error(`✗ 找不到字体 ${file}（先跑 node scripts/fetch-og-font.mjs，或用 OG_FONT_DIR 指定目录）`);
      process.exit(1);
    }
    const src = readFileSync(file);
    // 变量字体会把 satori 打崩（parseFvarAxis），必须先用 harfbuzz 实例化成静态实例
    const hasFvar = src.includes(Buffer.from("fvar", "latin1"));
    const opts = { targetFormat: "woff", ...(hasFvar ? { variationAxes: { wght: weight } } : {}) };
    const data = await subsetFont(src, charset, opts);
    fonts.push({ name: "Noto Sans SC", data, weight, style: "normal" });
  }
  return fonts;
}

async function render(cardData, fonts, file) {
  const svg = await satori(buildCard(cardData), { width: WIDTH, height: HEIGHT, fonts });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } }).render().asPng();
  writeFileSync(join(OUT, file), png);
  return png;
}

const entries = readEntries();
if (!entries.length) {
  console.error("✗ 没有读到任何内容条目");
  process.exit(1);
}
const derived = entries.map(e => ({ ...e, data: deriveCardData(e.dir, e.fm) }));
const site = siteConfig();
const latest = derived
  .map(e => new Date(String(e.fm.pubDatetime ?? "")))
  .filter(d => !Number.isNaN(d.valueOf()))
  .sort((a, b) => b - a)[0];
const defaultData = {
  section: "story",
  kicker: "PORTFOLIO",
  headline: "",
  subline: "",
  title: site.title,
  description: site.description,
  dateText: latest ? new Date(latest).toISOString().slice(0, 10) : "",
  facts: [],
  domain: "yuhailinlxy.com",
};

const charset = derived.map(e => collectTexts(e.data)).join("") + collectTexts(defaultData) + BASELINE;
const fonts = await buildFonts(charset);
mkdirSync(OUT, { recursive: true });

// 不写 generatedAt：保持生成**幂等**（再跑一次零 diff），否则每次跑都产生一行无意义的时间戳变更
const manifest = { width: WIDTH, height: HEIGHT, images: {} };
for (const e of derived) {
  const file = `${e.data.section}-${e.id}.png`;
  const png = await render(e.data, fonts, file);
  manifest.images[`${e.dir}/${e.id}`] = {
    file,
    hash: createHash("sha256").update(entryHash(e.data)).digest("hex").slice(0, 16),
    bytes: png.length,
  };
}
const defaultPng = await render(defaultData, fonts, "og-default.png");
manifest.default = {
  file: "og-default.png",
  hash: createHash("sha256").update(entryHash(defaultData)).digest("hex").slice(0, 16),
  bytes: defaultPng.length,
};
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
const total = Object.values(manifest.images).reduce((a, i) => a + i.bytes, 0) + defaultPng.length;
// 出框自检：底排（headline + facts + 域名）的估算宽度必须留在可用宽度内
const widths = [...derived.map(e => ({ id: e.id, ...estimateWidth(e.data) })), { id: "og-default", ...estimateWidth(defaultData) }];
const tightest = widths.slice().sort((a, b) => b.total - a.total)[0];
if (widths.some(w => w.total > w.available)) {
  console.error("✗ 底排出框：" + widths.filter(w => w.total > w.available).map(w => w.id + " " + Math.round(w.total) + ">" + w.available).join("、"));
  process.exit(1);
}
console.log(`✓ 生成 ${Object.keys(manifest.images).length} 张逐页 OG 图 + 1 张默认图，共 ${(total / 1024).toFixed(0)} KB`);
console.log(`  底排最紧的一张：${tightest.id} ${Math.round(tightest.total)}/${tightest.available}px（${Math.round((tightest.total / tightest.available) * 100)}%）`);

