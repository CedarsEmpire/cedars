import { randomUUID } from "node:crypto";
import { AGENTS, RUNTIME_BOUNDARIES, TOOL_NAMES } from "./agents.mjs";

const MAX_OBJECTIVE_LENGTH = 2000;
const MAX_RESULT_LENGTH = 12000;
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_CONCURRENCY = 3;
const SECRET_PATTERNS = [
  /(postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@[^\s]+)/gi,
  /(\b(?:password|passwd|secret|token|api[_-]?key)\b\s*[:=]\s*)[^\s,;]+/gi,
  /(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi
];

function redact(value) {
  let output = typeof value === "string" ? value : JSON.stringify(value);
  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern, (_match, prefix) => typeof prefix === "string" ? `${prefix}[REDACTED]` : "[REDACTED]");
  }
  return output.slice(0, MAX_RESULT_LENGTH);
}

function validateAdapters(adapters) {
  if (!adapters || typeof adapters !== "object" || Array.isArray(adapters)) {
    throw new TypeError("adapters must be an object of explicitly supplied read-only functions");
  }
  for (const [name, fn] of Object.entries(adapters)) {
    if (!TOOL_NAMES.includes(name)) throw new Error(`Tool is not allowlisted: ${name}`);
    if (typeof fn !== "function") throw new TypeError(`Adapter must be a function: ${name}`);
  }
}

function validateObjective(objective) {
  if (typeof objective !== "string" || !objective.trim()) {
    throw new TypeError("A bounded, user-approved objective is required");
  }
  if (objective.length > MAX_OBJECTIVE_LENGTH) {
    throw new RangeError(`Objective exceeds ${MAX_OBJECTIVE_LENGTH} characters`);
  }
  return objective.trim();
}

async function invokeAdapter(name, adapter, objective, signal) {
  if (signal.aborted) throw new Error("Run cancelled");
  const timeoutController = new AbortController();
  const onAbort = () => timeoutController.abort(signal.reason);
  signal.addEventListener("abort", onAbort, { once: true });
  let timeout;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeout = setTimeout(() => {
        const error = new Error("Tool timeout");
        timeoutController.abort(error);
        reject(error);
      }, DEFAULT_TIMEOUT_MS);
    });
    const adapterPromise = Promise.resolve().then(() => adapter({
      objective,
      environment: "PREVIEW_ONLY",
      access: "READ_ONLY",
      signal: timeoutController.signal
    }));
    const value = await Promise.race([adapterPromise, timeoutPromise]);
    return {
      tool: name,
      status: "OBSERVED",
      evidence: redact(value)
    };
  } catch (error) {
    return {
      tool: name,
      status: timeoutController.signal.aborted ? "BLOCKED" : "UNPROVEN",
      evidence: redact({ error: error instanceof Error ? error.message : "Unknown adapter error" })
    };
  } finally {
    if (timeout) clearTimeout(timeout);
    signal.removeEventListener("abort", onAbort);
  }
}

async function runAgent(agent, objective, adapters, signal) {
  const available = agent.tools.filter((name) => typeof adapters[name] === "function");
  if (agent.tools.length > 0 && available.length === 0) {
    return {
      agentId: agent.id,
      agentName: agent.name,
      status: "BLOCKED",
      reason: "No authorized read-only connector is configured for this role.",
      observations: []
    };
  }
  const observations = [];
  for (const name of available) {
    if (signal.aborted) {
      return { agentId: agent.id, agentName: agent.name, status: "BLOCKED", reason: "Run cancelled.", observations };
    }
    observations.push(await invokeAdapter(name, adapters[name], objective, signal));
  }
  return {
    agentId: agent.id,
    agentName: agent.name,
    status: agent.id === "commander" ? "READY" : "OBSERVED",
    reason: agent.id === "commander"
      ? "Coordination runtime initialized; no specialist evidence is asserted."
      : "Read-only adapter calls completed; observations are not formal verification or acceptance.",
    observations
  };
}

export async function runTeam({ objective, adapters = {}, signal: externalSignal } = {}) {
  const boundedObjective = validateObjective(objective);
  validateAdapters(adapters);
  const controller = new AbortController();
  const signal = externalSignal ?? controller.signal;
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const queue = [...AGENTS];
  const results = [];

  async function worker() {
    while (queue.length && !signal.aborted) {
      const agent = queue.shift();
      if (!agent) return;
      try {
        results.push(await runAgent(agent, boundedObjective, adapters, signal));
      } catch (error) {
        results.push({
          agentId: agent.id,
          agentName: agent.name,
          status: "BLOCKED",
          reason: redact(error instanceof Error ? error.message : "Agent execution failed"),
          observations: []
        });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, AGENTS.length) }, () => worker()));
  const orderedResults = AGENTS.map((agent) =>
    results.find((result) => result.agentId === agent.id) ?? {
      agentId: agent.id,
      agentName: agent.name,
      status: "BLOCKED",
      reason: "Run cancelled before this role started.",
      observations: []
    }
  );

  return Object.freeze({
    runId,
    objective: boundedObjective,
    startedAt,
    completedAt: new Date().toISOString(),
    status: orderedResults.every((item) => item.status === "READY" || item.status === "OBSERVED")
      ? "OBSERVATIONS_AVAILABLE"
      : "BLOCKED_OR_PARTIAL",
    boundaries: RUNTIME_BOUNDARIES,
    results: orderedResults,
    governance: {
      verifiedClaims: 0,
      acceptedClaims: 0,
      statusPromotionPermitted: false,
      note: "OBSERVED is not VERIFIED. ACCEPTED requires a separate human approval record."
    }
  });
}
