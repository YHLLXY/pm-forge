// site/scripts/check-reduce-motion.mjs —— reduced-motion 闸门验收（手动跑，不进构建门禁）
//
// 为什么单独留着它：调研实测「Astro 在 reduce 下照旧调用 startViewTransition，且产物里没有 Astro
// 自带的 reduce 闸门 CSS」，所以本站的 reduce 行为是**我们自己的 CSS 在负责**。C 轨的纪律是
// 「每次新增自定义动效都必须复测 reduce」——这条纪律只有变成一条可执行的命令才算数。
//
// 用法：在 site/ 下 node scripts/check-reduce-motion.mjs（自起 astro preview，端口 4335）
// 断言（对照两组 prefers-reduced-motion）：
//   no-preference：卡片 hover 上浮到 -2px；html scroll-behavior = smooth
//   reduce       ：卡片**不上浮**（translate 保持 none）；锚点不平滑滚动（auto）；
//                  ::view-transition-* 关停；**阴影反馈仍然保留**（reduce 用户不是没有反馈）
//
// v0.18 追加（本轨给右栏目录加了 200ms 的 color/background/box-shadow 过渡）：
//   详情页的 [data-article-toc] a —— no-preference 下必须**有**过渡，
//   reduce 下 transition-property 必须是 none（article-toc.css 的 reduce 分支）。
//   没有这条，新的动效词汇就只是在"靠人记得复测"。
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const cands = [join(process.cwd(), "node_modules", "playwright", "index.mjs"), "C:\\dev\\pm-forge\\toolkit\\node_modules\\playwright\\index.mjs"];
const pp = cands.find(existsSync);
const { chromium } = await import(pathToFileURL(pp).href);
const PORT = 4335;
const BASE = "http://localhost:" + PORT;
async function stop() {
  await Promise.race([ new Promise(r => { const p = spawn("npx", ["astro","preview","stop"], { cwd: join(HERE, ".."), shell: true, stdio: "ignore" }); p.on("exit", r); p.on("error", r); }), new Promise(r => setTimeout(r, 30000)) ]);
}
await stop();
const server = spawn("npx", ["astro","preview","--port",String(PORT),"--force"], { cwd: join(HERE, ".."), shell: true, stdio: "ignore" });
let ready = false;
for (let i = 0; i < 60 && !ready; i++) { await new Promise(r => setTimeout(r, 500)); ready = await fetch(BASE).then(r => r.ok).catch(() => false); }
if (!ready) { console.error("preview not ready"); server.kill(); await stop(); process.exit(1); }
const browser = await chromium.launch();
let bad = 0;
async function probe(mode) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: mode, locale: "zh-CN" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/case-studies/", { waitUntil: "networkidle" });
  const card = page.locator("a.group").first();
  const read = () => card.evaluate(el => { const s = getComputedStyle(el); return { translate: s.translate, shadow: s.boxShadow, transition: s.transitionProperty }; });
  const before = await read();
  await card.hover();
  await page.waitForTimeout(600);
  const after = await read();
  const scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  const vt = await page.evaluate(() => { try { return getComputedStyle(document.documentElement, "::view-transition-group(root)").animationName; } catch (e) { return "ERR"; } });
  await page.goto(BASE + "/case-studies/student-union-platform/", { waitUntil: "networkidle" });
  const toc = await page.evaluate(() => {
    const a = document.querySelector("[data-article-toc] a");
    if (!a) return null;
    const s = getComputedStyle(a);
    return { prop: s.transitionProperty, dur: s.transitionDuration };
  });
  // 2026-10-27 新增联系轨道图：新动效必须复测 reduce（本文件的立项纪律）
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const orbit = await page.evaluate(() => {
    const rotor = document.querySelector("#contact .crotor");
    const ring = document.querySelector("#contact .cring-a");
    const nodes = Array.from(document.querySelectorAll("#contact .cnode")).map(n => {
      const r = n.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    const dists = [];
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++)
        dists.push(Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y));
    return {
      rotorAnim: rotor ? getComputedStyle(rotor).animationName : "MISSING",
      ringAnim: ring ? getComputedStyle(ring).animationName : "MISSING",
      count: nodes.length,
      minGap: dists.length ? Math.round(Math.min.apply(null, dists)) : 0,
    };
  });
  console.log("  联系轨道 rotor animation-name: " + orbit.rotorAnim);
  console.log("  联系轨道 外环 animation-name: " + orbit.ringAnim);
  console.log("  联系节点 " + orbit.count + " 个，两两最小间距 " + orbit.minGap + "px");
  if (orbit.count !== 4) { console.log("  ✗ 首页联系区节点数不是 4（选择器或结构变了？）"); bad++; }

  console.log("--- prefers-reduced-motion: " + mode + " ---");
  console.log("  卡片 translate   : " + before.translate + "  ->  " + after.translate);
  console.log("  卡片 box-shadow  : " + (before.shadow === after.shadow ? "未变" : "有变化（阴影加深）"));
  console.log("  transition-property: " + before.transition);
  console.log("  html scroll-behavior: " + scrollBehavior);
  console.log("  ::view-transition-group(root) animation-name: " + vt);
  console.log("  目录项 transition        : " + (toc ? toc.prop + " / " + toc.dur : "找不到目录项"));
  if (mode === "reduce") {
    if (after.translate !== "none" && !/^0px 0px$|^0px$/.test(after.translate)) { console.log("  ✗ reduce 下卡片仍上浮"); bad++; }
    else console.log("  ✓ reduce 下卡片不上浮");
    if (scrollBehavior !== "auto") { console.log("  ✗ reduce 下 scroll-behavior 不是 auto"); bad++; }
    else console.log("  ✓ reduce 下锚点不做平滑滚动");
    if (vt !== "none") { console.log("  ✗ reduce 下 view-transition 动画未关停（" + vt + "）"); bad++; }
    else console.log("  ✓ reduce 下 ::view-transition-* animation: none");
    if (before.shadow === after.shadow) { console.log("  ✗ reduce 下连阴影反馈都没有了"); bad++; }
    else console.log("  ✓ reduce 下仍保留阴影反馈（reduce 用户不是没有反馈）");
    if (!toc) { console.log("  ✗ reduce 下在详情页找不到目录项（选择器或接线变了？）"); bad++; }
    else if (toc.prop !== "none") { console.log("  ✗ reduce 下目录项过渡没关掉（transition-property = " + toc.prop + "）"); bad++; }
    else console.log("  ✓ reduce 下目录项 transition: none");
    if (orbit.rotorAnim !== "none" || orbit.ringAnim !== "none") {
      console.log("  ✗ reduce 下联系轨道仍在转（rotor=" + orbit.rotorAnim + " / ring=" + orbit.ringAnim + "）");
      bad++;
    } else console.log("  ✓ reduce 下联系轨道动画关闭");
    if (orbit.minGap < 80) {
      console.log("  ✗ reduce 下联系区四个节点挤在一起（最小间距 " + orbit.minGap + "px）—— --phase 的静态角度没生效?");
      bad++;
    } else console.log("  ✓ reduce 下四个节点仍分居四方（最小间距 " + orbit.minGap + "px）");
  } else {
    if (!/^-?\d/.test(after.translate) || after.translate === before.translate) { console.log("  ✗ 正常模式下卡片没有上浮"); bad++; }
    else console.log("  ✓ 正常模式下卡片上浮到 " + after.translate);
    if (scrollBehavior !== "smooth") { console.log("  ✗ 正常模式下 scroll-behavior 不是 smooth"); bad++; }
    else console.log("  ✓ 正常模式下平滑滚动开着");
    if (!toc) { console.log("  ✗ 正常模式下在详情页找不到目录项"); bad++; }
    else if (toc.prop === "none" || /^0s(, 0s)*$/.test(toc.dur)) {
      console.log("  ✗ 正常模式下目录项过渡被误关（transition-property = " + toc.prop + " / " + toc.dur + "）"); bad++;
    } else console.log("  ✓ 正常模式下目录项有过渡（" + toc.prop + " / " + toc.dur + "）");
    if (orbit.rotorAnim === "none") { console.log("  ✗ 正常模式下联系轨道不动"); bad++; }
    else console.log("  ✓ 正常模式下联系轨道在转（" + orbit.rotorAnim + "）");
  }
  await ctx.close();
}
await probe("no-preference");
await probe("reduce");
await browser.close();
server.kill();
await stop();
console.log(bad ? "✗ reduce 闸门有 " + bad + " 项不达标" : "✓ reduce 闸门全部达标");
process.exit(bad ? 1 : 0);
