// RSS 全文校验（二期 E3，挂 build 链）：dist/rss.xml 结构断言 + 全文 + 链接绝对化检查
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

const RSS_PATH = join(fileURLToPath(new URL("../dist/", import.meta.url)), "rss.xml");

const problems = [];
const fail = msg => problems.push(msg);

if (!existsSync(RSS_PATH)) {
  console.error("dist/rss.xml 不存在——先跑 astro build 再校验");
  process.exit(1);
}

const parser = new XMLParser({ ignoreAttributes: false });
let doc;
try {
  doc = parser.parse(readFileSync(RSS_PATH, "utf8"));
} catch (e) {
  console.error(`rss.xml 不是合法 XML：${e.message}`);
  process.exit(1);
}

const channel = doc?.rss?.channel;
if (!channel) fail("缺少 <channel>");
if (!channel?.title) fail("channel.title 缺失");
if (!channel?.link) fail("channel.link 缺失");

const rawItems = channel?.item;
const items = rawItems ? (Array.isArray(rawItems) ? rawItems : [rawItems]) : [];
if (items.length < 1) fail("channel 至少要有 1 个 item");

// 阅读器内会断链的形态：根相对（/x）、裸相对（x）都算；绝对 URL / 锚点 / mailto 放行
const RELATIVE_REF = /(?:src|href)="(?!https?:|mailto:|tel:|#)[^"]*"/g;

for (const [i, item] of items.entries()) {
  const label = `item[${i}] ${item?.title ?? "(无标题)"}`;
  if (!item?.title) fail(`${label}: title 缺失`);
  if (!item?.link) fail(`${label}: link 缺失`);
  if (!item?.pubDate) fail(`${label}: pubDate 缺失`);
  const content = typeof item?.["content:encoded"] === "string" ? item["content:encoded"] : "";
  if (!content.trim()) fail(`${label}: content:encoded 为空——全文输出未生效`);
  else {
    const relative = content.match(RELATIVE_REF);
    if (relative) fail(`${label}: 正文含非绝对链接 ${relative.slice(0, 3).join("、")}`);
  }
}

if (problems.length) {
  console.error(`RSS 校验 ${problems.length} 项不通过：\n` + problems.map(p => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`RSS 全文校验通过 ✓（${items.length} 条 item，全文与非绝对链接检查均过）`);
