// A1 DeepSeek 任务 API 执行器（用户 2026-10-02 授权代跑）
// 用法：node run_api.mjs [--model deepseek-chat|deepseek-reasoner] [--only id1,id2]
// 读取 toolkit/.env 的 LLM_API_KEY / LLM_BASE_URL；key 永不出现在输出与 git。
// 输出：site/out/dissection-staging/deepseek/<taskId>/raw.md（两步式第一态，gitignored）
// 口径：API 入口属计费服务正常用法（章程 v2.1 §2 修订款），消费端 UI 的交互/会员维度另行标注。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const MODEL = getArg("model", "deepseek-chat");
const ONLY = getArg("only", null);

// .env 解析（不 echo 值）
const envText = readFileSync(join(ROOT, "toolkit", ".env"), "utf8");
const env = Object.fromEntries(
  envText.split("\n").filter(l => l.includes("=") && !l.trim().startsWith("#")).map(l => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
  })
);
const KEY = env.LLM_API_KEY;
const BASE = (env.LLM_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
if (!KEY) {
  console.error("LLM_API_KEY 未配置");
  process.exit(1);
}

const expand = text =>
  text.replace(/\{ASSET:([^}]+)\}/g, (_, f) => readFileSync(join(HERE, "assets", f), "utf8"));

const tasksFile = getArg("tasks", "tasks-deepseek.jsonl");
const tasks = readFileSync(join(HERE, tasksFile), "utf8")
  .split("\n")
  .filter(l => l.trim())
  .map(l => JSON.parse(l))
  .filter(t => !ONLY || ONLY.split(",").includes(t.id));

const TODAY = new Date().toISOString().slice(0, 10);
let ok = 0;
for (const t of tasks) {
  const outDir = join(ROOT, "site", "out", "dissection-staging", "deepseek", t.id, MODEL);
  mkdirSync(outDir, { recursive: true });
  const input = expand(t.input);
  const body = JSON.stringify({ model: MODEL, messages: [{ role: "user", content: input }] });
  const started = Date.now();
  let content = "";
  let usage = null;
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body,
    });
    if (!res.ok) {
      console.error(`${t.id}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
      continue;
    }
    const data = await res.json();
    content = data.choices?.[0]?.message?.content ?? "";
    usage = data.usage ?? null;
    ok++;
  } catch (e) {
    console.error(`${t.id}: ${String(e).slice(0, 200)}`);
    continue;
  }
  const secs = Math.round((Date.now() - started) / 100) / 10;
  const meta = [
    `<!-- task: ${t.id} | model: ${MODEL} | API 入口（用户授权代跑） | 评测日期: ${TODAY} | 耗时: ${secs}s | usage: ${usage ? `${usage.prompt_tokens}+${usage.completion_tokens} tok` : "n/a"} -->`,
    `<!-- focus: ${t.focus} | expectedFailureMode: ${t.expectedFailureMode} -->`,
    "",
    "## 输入",
    "",
    input,
    "",
    "## 输出（原文全录）",
    "",
    content,
    "",
  ].join("\n");
  writeFileSync(join(outDir, "raw.md"), meta, "utf8");
  console.log(`${t.id} ✓ ${secs}s ${content.length} 字`);
}
console.log(`完成 ${ok}/${tasks.length}（model=${MODEL}，落盘 site/out/dissection-staging/deepseek/）`);
