import type { ChatMessage } from "@/lib/llm/types";
import type { z } from "zod";

export type ToolId = "competitor-analysis" | "feedback-insights" | "prd-draft";
export type OutputKind = "markdown" | "json";

export interface ToolDefinition<TInput = unknown> {
  id: ToolId;
  name: string; // UI 显示名
  tagline: string; // 一句话说明（首页卡片/页头用）
  inputSchema: z.ZodType<TInput>;
  outputKind: OutputKind;
  buildMessages(input: TInput): ChatMessage[];
  fixture: string; // 演示模式输出
}
export type Tool = ToolDefinition<unknown>;
