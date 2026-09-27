import type { ChatMessage } from "@/lib/llm/types";
import type { FeedbackInput } from "@/tools/schemas";

export const PROMPT_VERSION = "1.0.0";

const SYSTEM_PROMPT = `你是用户研究分析师。把用户逐条编号的反馈做主题聚类，并给出优先级建议。只输出一个 JSON 对象：不要任何解释文字，不要代码围栏。

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

export function buildFeedbackMessages(input: FeedbackInput): ChatMessage[] {
  const numbered = input.feedbacks
    .map((f, i) => `F${String(i + 1).padStart(2, "0")}: ${f}`)
    .join("\n");
  const user = [
    input.productContext ? `## 产品背景\n${input.productContext}` : "## 产品背景\n（未提供）",
    "",
    `## 反馈列表（共 ${input.feedbacks.length} 条）`,
    numbered,
  ].join("\n");
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}
