import OpenAI from "openai";
import type { LLMProvider } from "./types";

export function createOpenAIProvider(cfg: {
  apiKey: string;
  baseURL: string;
  model: string;
}): LLMProvider {
  const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
  return {
    id: "openai-compatible",
    async *chatStream(req) {
      const stream = await client.chat.completions.create({
        model: cfg.model,
        messages: req.messages,
        stream: true,
        ...(req.maxOutputTokens ? { max_tokens: req.maxOutputTokens } : {}),
      });
      for await (const part of stream) {
        const delta = part.choices[0]?.delta?.content;
        if (delta) yield delta;
      }
    },
  };
}
