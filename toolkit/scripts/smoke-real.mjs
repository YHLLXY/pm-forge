// 真实 LLM 冒烟脚本（M2 验收②的准备件）
// 用法：npm run smoke:real —— 需 toolkit/.env 配好 LLM_API_KEY；未配置则退出并给指引。
// 产出：toolkit/artifacts/<tool>-<日期>.<ext> 三份真实产出（artifacts/ 已 gitignore，含真实输入输出，永不入库）。
// 注意：提示词文本与 src/prompts/*.ts（PROMPT_VERSION 1.0.0）保持同构，若改 TS 侧提示词必须同步本文件。
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

let env = {};
try {
  env = Object.fromEntries(
    readFileSync(path.join(root, ".env"), "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
} catch {
  console.error("未找到 toolkit/.env：请复制 .env.example 为 .env 并填入 LLM_API_KEY 后重试。");
  process.exit(1);
}
const BASE_URL = (env.LLM_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
const MODEL = env.LLM_MODEL || "deepseek-chat";
const MAX_OUTPUT = Number(env.LLM_MAX_OUTPUT_TOKENS) || 4096;
if (!env.LLM_API_KEY) {
  console.error("未配置 LLM_API_KEY：请在 toolkit/.env 填入 key 后重试（DeepSeek: https://platform.deepseek.com）。");
  process.exit(1);
}

// ---------- 提示词（与 src/prompts/*.ts 同构） ----------

const COMPETITOR_SYSTEM = `你是资深产品分析师。任务：仅根据用户提供的信息，产出一份竞品分析报告初稿。

## 证据链铁律（最高优先级）
1. 每条具体判断后面标注来源：【依据输入】= 来自用户材料；【行业常识】= 公开普遍认知、建议核实；【推断】= 由已知信息推出的假设。
2. 严禁编造具体数字（用户量、收入、市场份额、评分等）。没有可靠出处就写"待验证"，或改用定性描述。
3. 无法填写的栏目写"（材料不足，待补充）"，不要为了填表而虚构。
4. 功能矩阵用 0-4 分：0 没有；1 有但很弱；2 基础可用；3 体验较好；4 明显领先。每个非 0 评分在备注给一句依据。

## 输出结构（严格按以下六章，逐章输出 Markdown）
# 竞品分析：<用户需求名称>
## 一、分析目的
（一句话回扣决策目的；没有决策目的的分析是资料堆砌。）
## 二、市场与竞品选择
（各竞品定位一句话 + 选择理由；直接/间接竞品区分。）
## 三、竞品画像
| 竞品 | 定位 | 目标用户 | 商业模式 | 数据表现 |
（数据表现列没有出处就写"待验证"。）
## 四、功能矩阵与体验对比
| 功能 | 我方 | 竞品A | 竞品B | 备注 |
（功能行按用户产品领域选 6-10 个关键功能；用 0-4 分。）
## 五、差异化与机会点
（结论先行：明确给出机会点判断和依据，不要中立罗列。）
## 六、信息来源
（列出用户材料之外你引用的【行业常识】类判断清单，每条附"建议核实方式"。）

## 写作要求
- 中文，直接输出 Markdown 正文；不要输出额外说明、道歉或代码围栏。
- 诚实优先：这份报告会被用于真实决策，一个编造的数字比十个"待验证"危害更大。`;

const FEEDBACK_SYSTEM = `你是用户研究分析师。把用户逐条编号的反馈做主题聚类，并给出优先级建议。只输出一个 JSON 对象：不要任何解释文字，不要代码围栏。

## JSON 契约
{
  "themes": [
    {
      "name": "主题名，不超过10个字",
      "summary": "两句话：用户在抱怨/称赞什么",
      "sentiment": "positive | negative | mixed 三选一",
      "count": 归入该主题的反馈条数（整数）,
      "quotes": ["最能代表该主题的原文，最多3条，必须逐字来自输入"],
      "impact": 1到5整数（影响面：涉及用户范围多广）,
      "severity": 1到5整数（严重度：对体验/转化的伤害或价值大小）,
      "opportunities": ["由此可做的产品机会点，每条一句话"]
    }
  ],
  "overallSentiment": "positive | negative | mixed",
  "notableOutliers": ["不属于任何主题但值得单独关注的反馈，写明编号"]
}

## 铁律
1. 每条反馈必须且只能归入一个主题；所有 themes 的 count 之和必须等于反馈总条数；无法归类的放入 notableOutliers 并注明编号。
2. quotes 必须逐字复制输入原文，禁止改写、翻译或虚构。
3. 主题 3-8 个：按"用户要完成的任务/遇到的问题"聚类，不按字面关键词。
4. impact 与 severity 为你的判断，但依据要写进 summary 或 opportunities。`;

const PRD_SYSTEM = `你是资深产品经理。任务：根据用户提供的信息，产出一份 PRD 初稿。

## 铁律
1. 严格按下方六章结构输出 Markdown，章标题逐字一致。
2. 信息不足的地方绝不编造业务细节：写"【待补充：需要什么、找谁确认】"，并在第六章"风险与开放问题"里汇总一条"信息缺口清单"。
3. 用户故事表每行：编号（F1、F2…）｜作为___，我想要___，以便___｜P0/P1/P2（P0=没有就不能上线）｜验收标准（可测试的条件，用"给定…当…则…"句式）。
4. 目标章：1 个北极星指标 + 2-3 个护栏指标，全部带统计口径（如"次/周·登录用户去重"）。
5. 埋点事件名用 action_object 短横线小写（如 export_report_clicked），写参数与触发时机。
6. 中文，直接输出 Markdown 正文，不要额外说明或代码围栏。

## 输出结构
# PRD：<需求名称>
## 一、背景与目标
（为什么做：问题、机会；要达成什么：1 个北极星指标 + 2-3 个护栏指标，全部带口径。）
## 二、用户与场景
目标用户是谁？核心场景一句话：谁在什么情况下用它解决什么问题。
## 三、用户故事与功能需求
| 编号 | 用户故事 | 优先级(P0/P1/P2) | 验收标准 |
|---|---|---|---|
| F1 | 作为___，我想要___，以便___ |  |  |
## 四、流程与交互
（主流程分步描述；关键页面说明；异常路径：空态、失败、权限不足。）
## 五、非功能需求
（性能、兼容、合规、数据埋点：事件名+参数+触发时机。）
## 六、风险与开放问题
| 风险/问题 | 影响 | 当前判断 | 需要谁拍板 |
|---|---|---|---|`;

// ---------- 样例输入（真实输入，与 src/tools/schemas.ts 契约一致） ----------

const SAMPLES = [
  {
    id: "competitor-analysis",
    ext: "md",
    mustContain: "六、信息来源",
    messages: [
      { role: "system", content: COMPETITOR_SYSTEM },
      {
        role: "user",
        content: [
          "## 我要做的决策",
          "为「随手记账」Q4 迭代选择差异化方向",
          "",
          "## 我方产品",
          "随手记账：面向大学生的极简记账小程序，主打 10 秒记一笔；当前用户约 2000（校园内测），主要差评是报表太简单。",
          "",
          "## 竞品清单",
          "1. 钱迹（无广告、资产管理强）",
          "2. 鲨鱼记账（模板多、上手快）",
          "",
          "## 补充材料（证据只来自这里和【行业常识】）",
          "应用商店：随手记账 4.6 分；钱迹 4.8 分；鲨鱼记账 4.7 分。差评关键词：随手记账——报表图表少；钱迹——上手门槛高；鲨鱼记账——广告多。",
        ].join("\n"),
      },
    ],
  },
  {
    id: "feedback-insights",
    ext: "json",
    mustContain: '"themes"',
    messages: [
      { role: "system", content: FEEDBACK_SYSTEM },
      {
        role: "user",
        content: [
          "## 产品背景",
          "校园拼车小程序（学生拼车回市区/机场）",
          "",
          "## 反馈列表（共 8 条）",
          "F01: 等了十分钟没人接单，最后只能坐地铁",
          "F02: 高峰期根本叫不到车，发单像石沉大海",
          "F03: 司机接单后又取消了，白白等了五分钟",
          "F04: 界面很好看，配色舒服",
          "F05: 支付总是失败，换微信支付才行",
          "F06: 想要包月套餐，一周拼三次好贵",
          "F07: 司机爽约过一次，客服也不理人",
          "F08: 行程分享给同学的功能很好用",
        ].join("\n"),
      },
    ],
  },
  {
    id: "prd-draft",
    ext: "md",
    mustContain: "六、风险与开放问题",
    messages: [
      { role: "system", content: PRD_SYSTEM },
      {
        role: "user",
        content: [
          "## 产品/模块",
          "随手记账",
          "",
          "## 需求名称",
          "月度消费报告导出 PDF",
          "",
          "## 背景描述",
          "用户想保存/分享月度消费报告，当前只能截图，排版差、信息不全；家人看不到完整收支结构。",
          "",
          "## 目标用户与场景",
          "大学生用户，月底查看消费报告并分享给家人。",
          "",
          "## 已知约束",
          "微信小程序环境；团队无后端图片服务，导出需前端生成或轻量方案。",
        ].join("\n\n"),
      },
    ],
  },
];

// ---------- 请求与校验 ----------

mkdirSync(path.join(root, "artifacts"), { recursive: true });
const date = new Date().toISOString().slice(0, 10);
let failed = 0;

for (const s of SAMPLES) {
  process.stdout.write(`▶ ${s.id} … `);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: s.messages,
        max_tokens: MAX_OUTPUT,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    if (!text.includes(s.mustContain)) {
      throw new Error(`输出缺少关键结构「${s.mustContain}」，长度 ${text.length}`);
    }
    const file = path.join(root, "artifacts", `${s.id}-${date}.${s.ext}`);
    writeFileSync(file, text, "utf8");
    const usage = data.usage ? ` | tokens: ${data.usage.prompt_tokens}+${data.usage.completion_tokens}` : "";
    console.log(`OK (${text.length} 字) → ${file}${usage}`);
  } catch (e) {
    failed++;
    console.log(`FAILED\n  ${e instanceof Error ? e.message : String(e)}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${SAMPLES.length} 个工具冒烟失败。`);
  process.exit(1);
}
console.log(`\n全部通过。产出在 toolkit/artifacts/（已 gitignore），可精选发布进 site/content/（验收②）。`);
