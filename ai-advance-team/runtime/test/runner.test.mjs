import test from "node:test";
import assert from "node:assert/strict";
import { AGENTS, RUNTIME_BOUNDARIES, TOOL_NAMES } from "../src/agents.mjs";
import { runTeam } from "../src/runner.mjs";

test("registers exactly the six documented specialist roles", () => {
  assert.equal(AGENTS.length, 6);
  assert.deepEqual(AGENTS.map((agent) => agent.id), [
    "commander",
    "security-compliance",
    "repository-ci",
    "runtime-database",
    "independent-qa",
    "release-governance"
  ]);
});

test("declares fail-closed Preview-only and no-financial-action boundaries", () => {
  assert.equal(RUNTIME_BOUNDARIES.mode, "READ_ONLY");
  assert.equal(RUNTIME_BOUNDARIES.environment, "PREVIEW_ONLY");
  assert.equal(RUNTIME_BOUNDARIES.productionAccess, false);
  assert.equal(RUNTIME_BOUNDARIES.databaseWrites, false);
  assert.equal(RUNTIME_BOUNDARIES.repositoryWrites, false);
  assert.equal(RUNTIME_BOUNDARIES.deploymentWrites, false);
  assert.equal(RUNTIME_BOUNDARIES.financialExecution, false);
  assert.equal(RUNTIME_BOUNDARIES.fiatTransactions, false);
  assert.equal(RUNTIME_BOUNDARIES.publicLaunch, false);
});

test("runs all roles and reports missing external connectors as blocked", async () => {
  const report = await runTeam({ objective: "Inspect Preview readiness", adapters: {} });
  assert.equal(report.results.length, 6);
  assert.equal(report.results[0].status, "READY");
  assert.ok(report.results.slice(1).every((item) => item.status === "BLOCKED"));
  assert.equal(report.governance.verifiedClaims, 0);
  assert.equal(report.governance.acceptedClaims, 0);
  assert.equal(report.governance.statusPromotionPermitted, false);
});

test("executes only role-allowlisted injected read-only adapters", async () => {
  const calls = [];
  const adapters = {
    "repository.read": async (input) => {
      calls.push({ tool: "repository.read", input });
      return { commit: "abc123", finding: "synthetic source observation" };
    },
    "ci.read": async (input) => {
      calls.push({ tool: "ci.read", input });
      return { run: "synthetic-run", conclusion: "success" };
    }
  };
  const report = await runTeam({ objective: "Check synthetic CI evidence", adapters });
  assert.ok(calls.length > 0);
  assert.ok(calls.every((call) => call.input.access === "READ_ONLY"));
  assert.ok(calls.every((call) => call.input.environment === "PREVIEW_ONLY"));
  assert.ok(report.results.every((item) => item.status !== "VERIFIED"));
  assert.equal(report.governance.verifiedClaims, 0);
});

test("rejects tools outside the explicit allowlist", async () => {
  await assert.rejects(
    runTeam({ objective: "test", adapters: { "repository.write": async () => ({ ok: true }) } }),
    /not allowlisted/
  );
  assert.ok(TOOL_NAMES.every((name) => !name.includes("write")));
});

test("rejects empty and overlong objectives", async () => {
  await assert.rejects(runTeam({ objective: " " }), /objective is required/);
  await assert.rejects(runTeam({ objective: "x".repeat(2001) }), /exceeds 2000/);
});

test("redacts secret-like values from adapter observations", async () => {
  const report = await runTeam({
    objective: "redaction test",
    adapters: {
      "repository.read": async () => ({
        message: "password=hunter2",
        url: "postgresql://user:supersecret@db.example.test:5432/app"
      })
    }
  });
  const serialized = JSON.stringify(report);
  assert.ok(!serialized.includes("hunter2"));
  assert.ok(!serialized.includes("supersecret"));
  assert.ok(serialized.includes("[REDACTED]"));
});
