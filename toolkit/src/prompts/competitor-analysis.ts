import type { ChatMessage } from "@/lib/llm/types";
import type { CompetitorInput } from "@/tools/schemas";

export const PROMPT_VERSION = "1.0.0";

// 报告骨架来自 shared/templates/04-竞品分析.md（内嵌以避免运行时读盘）
const SYSTEM_PROMPT = `你是资深产品分析师。任务：仅根据用户提供的信息，产出一份竞品分析报告初稿。

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

export function buildCompetitorMessages(input: CompetitorInput): ChatMessage[] {
  const competitorLines = input.competitors
    .map((c, i) => `${i + 1}. ${c.name}${c.notes ? `（${c.notes}）` : ""}`)
    .join("\n");
  const user = [
    "## 我要做的决策",
    input.purpose,
    "",
    "## 我方产品",
    input.myProduct,
    "",
    "## 竞品清单",
    competitorLines,
    "",
    input.materials
      ? `## 补充材料（证据只来自这里和【行业常识】）\n${input.materials}`
      : "## 补充材料\n（无。所有竞品信息基于【行业常识】，逐条标注建议核实方式。）",
  ].join("\n");
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}
