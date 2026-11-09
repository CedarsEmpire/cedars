import { defineAgent } from "eve";

export default defineAgent({
  description: "Read-only security and compliance evidence reviewer.",
  model: "openai/gpt-6-luna-fast",
  reasoning: "medium",
  tool: false,
  limits: {
    sessionUsage: ({ window }) =>
      window.inputTokens - window.cacheReadTokens >= 30_000 ||
      window.outputTokens >= 4_000 ||
      (window.costUsd ?? 0) >= 0.35,
    sessionTimeoutMs: 20 * 60 * 1_000
  }
});
