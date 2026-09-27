import type { Tool, ToolDefinition } from "./types";
import { buildCompetitorMessages } from "@/prompts/competitor-analysis";
import { buildFeedbackMessages } from "@/prompts/feedback-insights";
import { buildPrdMessages } from "@/prompts/prd-draft";
import {
  competitorInputSchema,
  feedbackInputSchema,
  prdInputSchema,
} from "./schemas";
import {
  COMPETITOR_FIXTURE,
  FEEDBACK_FIXTURE,
  PRD_FIXTURE,
} from "./fixtures";

// 单点类型擦除：调用方必须先 inputSchema.safeParse，再传入 data
function defineTool<TInput>(def: ToolDefinition<TInput>): Tool {
  return def as unknown as Tool;
}

export const TOOLS: Tool[] = [
  defineTool({
    id: "competitor-analysis",
    name: "竞品分析",
    tagline: "输入你的产品和竞品，产出带证据链标注的六章分析报告",
    inputSchema: competitorInputSchema,
    outputKind: "markdown",
    buildMessages: buildCompetitorMessages,
    fixture: COMPETITOR_FIXTURE,
  }),
  defineTool({
    id: "feedback-insights",
    name: "用户反馈洞察",
    tagline: "粘贴用户反馈，聚类成主题并生成优先级矩阵",
    inputSchema: feedbackInputSchema,
    outputKind: "json",
    buildMessages: buildFeedbackMessages,
    fixture: FEEDBACK_FIXTURE,
  }),
  defineTool({
    id: "prd-draft",
    name: "PRD 草稿",
    tagline: "按精简 PRD 模板生成初稿，信息缺口标注【待补充】",
    inputSchema: prdInputSchema,
    outputKind: "markdown",
    buildMessages: buildPrdMessages,
    fixture: PRD_FIXTURE,
  }),
];

export const TOOL_IDS = TOOLS.map((t) => t.id);

export function getTool(id: string): Tool | undefined {
  return TOOLS.find((t) => t.id === id);
}
