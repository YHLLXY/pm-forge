// 粗估口径：中文为主的内容约 0.6~0.7 token/字符，取 0.7 偏保守——
// 宁可高估拦截，不可低估漏放（AGENTS.md 规则 5：token 守卫）。
const TOKENS_PER_CHAR = 0.7;
const OVERHEAD_PER_MESSAGE = 24;

export function estimateTextTokens(text: string): number {
  return Math.ceil(text.length * TOKENS_PER_CHAR);
}

export function estimateMessagesTokens(
  messages: { role: string; content: string }[],
): number {
  const raw = messages.reduce(
    (sum, m) => sum + estimateTextTokens(m.content) + OVERHEAD_PER_MESSAGE,
    0,
  );
  return Math.ceil(raw);
}

export interface BudgetCheck {
  estimated: number;
  max: number;
  over: boolean;
}

export function checkBudget(estimated: number, max: number): BudgetCheck {
  return { estimated, max, over: estimated > max };
}
