import type { ServerLlmConfig } from "@/lib/config";
import { createMockProvider } from "./mock-provider";
import { createOpenAIProvider } from "./openai-provider";
import type { LLMProvider } from "./types";

export type { ChatMessage, ChatRequest, LLMProvider } from "./types";
export { createMockProvider } from "./mock-provider";
export { createOpenAIProvider } from "./openai-provider";

export function getProvider(cfg: ServerLlmConfig, fixture: string): LLMProvider {
  if (cfg.forceMock || !cfg.apiKey) return createMockProvider(fixture);
  return createOpenAIProvider(cfg);
}
