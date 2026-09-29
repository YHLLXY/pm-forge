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
  // 可选的服务端输出契约校验：返回违例清单（空 = 通过）。route 层据此决定
  // 是否带着具体违例重试一次。机械可判定项才进这里，语义质量不归它管。
  validateOutput?(output: string, input: TInput): string[];
}
export type Tool = ToolDefinition<unknown>;
