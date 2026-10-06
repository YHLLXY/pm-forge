// site/scripts/check-story-budget.mjs —— B 线体积门禁（spec §4 门禁 1）
// 预算唯一事实源 src/config/story-budget.json；实测 dist 之前的 public/ 目录体积，超限 exit 1。
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const cfg = JSON.parse(readFileSync(join(process.cwd(), "src/config/story-budget.json"), "utf8"));
let failed = false;
for (const dir of cfg.dirs) {
  const p = join(process.cwd(), dir.path);
  if (!existsSync(p)) {
    console.error(`✗ 门禁：缺目录 ${dir.path}`);
    failed = true;
    continue;
  }
  let bytes = 0;
  const walk = name => {
    const s = statSync(join(p, name));
    if (s.isDirectory()) for (const e of readdirSync(join(p, name))) walk(join(name, e));
    else bytes += s.size;
  };
  for (const e of readdirSync(p)) walk(e);
  const mb = bytes / 1048576;
  const ok = mb <= dir.maxMB;
  console.log(`${ok ? "✓" : "✗"} ${dir.path}：${mb.toFixed(2)}MB / 上限 ${dir.maxMB}MB`);
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
