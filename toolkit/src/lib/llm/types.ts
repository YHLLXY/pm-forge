export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  maxOutputTokens?: number;
}

export interface LLMProvider {
  readonly id: string;
  chatStream(req: ChatRequest): AsyncGenerator<string, void, unknown>;
}
