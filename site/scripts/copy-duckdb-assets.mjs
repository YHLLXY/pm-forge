// site/scripts/copy-duckdb-assets.mjs —— @duckdb/duckdb-wasm 静态资产 → public/duckdb/
// EHDR 单线程形态（无 SharedArrayBuffer，免全站 COOP/COEP 头）。清单数组是唯一事实源。
// 实测 1.32.0 dist：EHDR 形态只有 duckdb-eh.wasm + duckdb-browser-eh.worker.js 两个文件
// （计划草案中的 duckdb-browser-eh.wasm 不存在；mvp 兜底不发布，loader 硬编码 eh bundle）。
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "node_modules", "@duckdb", "duckdb-wasm", "dist");
const OUT = join(process.cwd(), "public", "duckdb");
const FILES = ["duckdb-eh.wasm", "duckdb-browser-eh.worker.js"];
mkdirSync(OUT, { recursive: true });
for (const f of FILES) copyFileSync(join(SRC, f), join(OUT, f));
console.log(`✓ 拷贝 ${FILES.length} 个文件 → public/duckdb/`);
