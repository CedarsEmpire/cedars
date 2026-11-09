import { defineAgent } from "eve";

export default defineAgent({
  description: "CEDARS AI Advance Team Commander. Coordinates five bounded, read-only specialist agents.",
  model: "openai/gpt-6-luna-fast",
  reasoning: "high",
  tool: false,
  limits: {
    sessionUsage: ({ window }) =>
      window.inputTokens - window.cacheReadTokens >= 50_000 ||
      window.outputTokens >= 6_000 ||
      (window.costUsd ?? 0) >= 0.75,
    sessionTimeoutMs: 30 * 60 * 1_000
  }
});
