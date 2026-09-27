import type { ChatMessage } from "@/lib/llm/types";
import type { PrdInput } from "@/tools/schemas";

export const PROMPT_VERSION = "1.0.0";

// 骨架来自 shared/templates/03-PRD-精简版.md（内嵌以避免运行时读盘）
const SYSTEM_PROMPT = `你是资深产品经理。任务：根据用户提供的信息，产出一份 PRD 初稿。

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

export function buildPrdMessages(input: PrdInput): ChatMessage[] {
  const user = [
    `## 产品/模块\n${input.moduleName}`,
    `## 需求名称\n${input.requirementName}`,
    `## 背景描述\n${input.background}`,
    `## 目标用户与场景\n${input.users}`,
    input.constraints ? `## 已知约束\n${input.constraints}` : "## 已知约束\n（未提供）",
    input.materials ? `## 补充材料\n${input.materials}` : "## 补充材料\n（无）",
  ].join("\n\n");
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}
