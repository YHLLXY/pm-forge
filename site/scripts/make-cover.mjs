// site/scripts/make-cover.mjs —— 把一张原始截图压成卡片封面 webp
// 用法：node scripts/make-cover.mjs --in C:/temp/shot.png --out src/assets/covers/name.webp [--width 1440]
// 为什么需要：案例卡真图必须能复现来源。截图原图（DPR2 的 2880 宽 PNG）不能入库，
// 入库的是压过的 webp，这张脚本就是"从哪张图、用什么参数、压到多大"的可复跑记录。
import { statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf("--" + n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const IN = arg("in");
const OUT = arg("out");
const WIDTH = Number(arg("width", "1440"));
const QUALITY = Number(arg("quality", "82"));
// --crop x,y,w,h（原图像素）：产品截图常要裁掉浏览器工具条/个人信息后再入封面。
// 先裁后缩，避免先缩再裁把目标区域切偏。
const CROP = arg("crop", "");

if (!IN || !OUT) {
  console.error("用法：node scripts/make-cover.mjs --in <png> --out <webp> [--width 1440] [--quality 82]");
  process.exit(1);
}

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch (e) {
  console.error("✗ 无法 import sharp：" + String((e && e.message) || e));
  process.exit(1);
}

const dst = resolve(OUT);
mkdirSync(dirname(dst), { recursive: true });
const meta = await sharp(IN).metadata();
let pipe = sharp(IN);
if (CROP) {
  const [left, top, width, height] = CROP.split(",").map(Number);
  if ([left, top, width, height].some(n => !Number.isFinite(n))) {
    console.error("--crop 需要 x,y,w,h 四个数字");
    process.exit(1);
  }
  pipe = pipe.extract({ left, top, width, height });
  console.log("裁切 " + width + "×" + height + " @(" + left + "," + top + ")");
}
await pipe.resize({ width: WIDTH }).webp({ quality: QUALITY, effort: 4 }).toFile(dst);
const out = await sharp(dst).metadata();
console.log(
  "源 " + meta.width + "×" + meta.height + " → 产出 " + out.width + "×" + out.height + " " + statSync(dst).size + " bytes → " + dst
);
