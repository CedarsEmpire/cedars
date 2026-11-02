import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { AuthorizationError } from "../src/auth/authorization.js";
import { parseRoleClaim } from "../src/auth/roles.js";
import { assertModuleUpdateAllowed, getOperationsSummary, listAuditEvents, moduleNameSchema, moduleNames, requireAuditAccess, updateModuleSchema } from "../src/features/modules.js";
import { requireWorkerAdmin, updateWorkerSchema, workerIdSchema } from "../src/features/workers.js";

describe("feature module policy", () => {
  it("keeps the standalone console catalog aligned with the API module allowlist", () => {
    const consoleHtml = readFileSync("index.html", "utf8");
    for (const moduleName of moduleNames) {
      expect(consoleHtml).toContain(`apiName: "${moduleName}"`);
    }
  });

  it("keeps browser console scripts syntactically valid", () => {
    const consoleHtml = readFileSync("index.html", "utf8");
    const scripts = Array.from(consoleHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi));
    expect(scripts.length).toBeGreaterThan(0);
    for (const [, script] of scripts) {
      expect(() => new Function(script)).not.toThrow();
    }
  });

  it("uses binary terminal switches and exposes account-flow status without fake payment controls", () => {
    const consoleHtml = readFileSync("index.html", "utf8");
    expect(consoleHtml).toContain("data-grid-toggle");
    expect(consoleHtml).toContain("data-worker-switch");
    expect(consoleHtml).toContain("data-toggle-module");
    expect(consoleHtml).not.toContain("data-grid-state");
    expect(consoleHtml).not.toContain("grid-state-select");
    expect(consoleHtml).toContain("data-auth-register");
    expect(consoleHtml).toContain("data-auth-logout");
    expect(consoleHtml).toContain("Deposits");
    expect(consoleHtml).toContain("Withdrawals");
    expect(consoleHtml).toContain("10% referral bonus");
    expect(consoleHtml).toContain("Single treasury · separate accounting");
    expect(consoleHtml).toContain("Membership payments");
    expect(consoleHtml).toContain("one treasury, not separate wallets");
    expect(consoleHtml).toContain("wallet: walletView");
    expect(consoleHtml).toContain("ledger: ledgerView");
    expect(consoleHtml).toContain("treasuryMonitorData.ledgerMode");
    expect(consoleHtml).toContain("payable balances: no");
    expect(consoleHtml).toContain("Sync confirmed observations");
    expect(consoleHtml).toContain("Ownership amount (USD · $1–$50,000)");
    expect(consoleHtml).toContain("data-referral-amount");
    expect(consoleHtml).toContain("amount * 0.1");
    expect(consoleHtml).toContain("document.addEventListener(\"input\"");
    expect(consoleHtml).toContain("Boosting supports growth but is not operating revenue.");
    expect(consoleHtml).toContain("not payable");
    expect(consoleHtml).toContain('aria-checked="false" aria-label="Deposits are off');
    expect(consoleHtml).toContain('aria-checked="false" aria-label="Withdrawals are off');
  });

  it("assigns newly registered Auth0 accounts the least-privileged role by default", async () => {
    type LoginEvent = {
      secrets: { CEDARS_ROLE_CLAIM: string };
      user: { app_metadata?: { cedars_role?: unknown } };
    };
    type LoginApi = { accessToken: { setCustomClaim: (name: string, value: string) => void } };
    type LoginAction = (event: LoginEvent, api: LoginApi) => Promise<void>;
    const context = { exports: {} as { onExecutePostLogin?: LoginAction }, URL };
    runInNewContext(readFileSync("auth0/post-login-action.js", "utf8"), context);
    const action = context.exports.onExecutePostLogin;
    expect(action).toBeDefined();
    const claims: Array<[string, string]> = [];
    const setCustomClaim = (name: string, value: string) => claims.push([name, value]);

    await action?.({
      secrets: { CEDARS_ROLE_CLAIM: "https://preview.example/cedars/role" },
      user: { app_metadata: {} }
    }, { accessToken: { setCustomClaim } });
    expect(claims).toEqual([["https://preview.example/cedars/role", "USER"]]);
  });

  it("rejects an invalid Auth0 role claim secret and downgrades invalid metadata", async () => {
    type LoginEvent = {
      secrets: { CEDARS_ROLE_CLAIM: string };
      user: { app_metadata?: { cedars_role?: unknown } };
    };
    type LoginApi = { accessToken: { setCustomClaim: (name: string, value: string) => void } };
    type LoginAction = (event: LoginEvent, api: LoginApi) => Promise<void>;
    const context = { exports: {} as { onExecutePostLogin?: LoginAction }, URL };
    runInNewContext(readFileSync("auth0/post-login-action.js", "utf8"), context);
    const action = context.exports.onExecutePostLogin;
    expect(action).toBeDefined();
    const claims: Array<[string, string]> = [];
    const setCustomClaim = (name: string, value: string) => claims.push([name, value]);

    await expect(action?.({
      secrets: { CEDARS_ROLE_CLAIM: "http://preview.example/cedars/role" },
      user: { app_metadata: { cedars_role: "SUPER_ADMIN" } }
    }, { accessToken: { setCustomClaim } })).rejects.toThrow(/namespaced HTTPS URL/);
    expect(claims).toEqual([]);

    await action?.({
      secrets: { CEDARS_ROLE_CLAIM: "https://preview.example/cedars/role" },
      user: { app_metadata: { cedars_role: "UNKNOWN_ROLE" } }
    }, { accessToken: { setCustomClaim } });
    expect(claims).toEqual([["https://preview.example/cedars/role", "USER"]]);
  });

  it("calculates sandbox treasury projections without transaction wiring", () => {
    const consoleHtml = readFileSync("index.html", "utf8");
    const functionSource = consoleHtml.match(/function updateTreasuryScenario\(\) \{[\s\S]*?\n    \}/)?.[0];
    expect(functionSource).toBeDefined();
    const outputs = new Map([
      ["scenarioDailyResult", { textContent: "" }],
      ["scenarioMonthlyResult", { textContent: "" }],
      ["scenarioStakeResult", { textContent: "" }]
    ]);
    const values = new Map([
      ["scenarioStartingAmount", { valueAsNumber: 100 }],
      ["scenarioTreasuryBalance", { valueAsNumber: 1000 }],
      ["scenarioDurationDays", { valueAsNumber: 30 }]
    ]);
    const calculator = new Function(
      "document",
      "Intl",
      `return (${functionSource})`
    )({ getElementById: (id: string) => outputs.get(id) ?? values.get(id) }, Intl) as () => void;

    calculator();

    expect(outputs.get("scenarioDailyResult")?.textContent).toMatch(/^134\.78\d+ units after 30 days/);
    expect(outputs.get("scenarioMonthlyResult")?.textContent).toContain("150 units after 1 completed 30-day periods");
    expect(outputs.get("scenarioStakeResult")?.textContent).toContain("50 units as a one-time 5% allocation");

    values.set("scenarioDurationDays", { valueAsNumber: 3651 });
    calculator();
    expect(outputs.get("scenarioDailyResult")?.textContent).toContain("Enter valid non-negative amounts");
  });

  it("rejects unknown modules", () => {
    expect(moduleNameSchema.safeParse("arbitrary_module").success).toBe(false);
    expect(() => assertModuleUpdateAllowed(Role.FOUNDER, "arbitrary_module", false)).toThrow(/supported catalog/);
  });

  it("allows a founder to disable a non-financial module", () => {
    expect(() => assertModuleUpdateAllowed(Role.FOUNDER, "healthcare_ai", false)).not.toThrow();
  });

  it("rejects a partner attempting to toggle a module", () => {
    expect(() => assertModuleUpdateAllowed(Role.PARTNER, "healthcare_ai", true)).toThrow(AuthorizationError);
  });

  it("requires a separate dual-approval workflow before enabling financial modules", () => {
    expect(() => assertModuleUpdateAllowed(Role.FOUNDER, "wallet", true)).toThrow(/dual-approval/);
    expect(() => assertModuleUpdateAllowed(Role.SUPER_ADMIN, "ledger", true)).toThrow(/dual-approval/);
  });

  it("validates bounded reason text and rejects extra fields", () => {
    expect(updateModuleSchema.safeParse({ enabled: false, reason: "Deployment paused" }).success).toBe(true);
    expect(updateModuleSchema.safeParse({ enabled: false, reason: "short" }).success).toBe(false);
    expect(updateModuleSchema.safeParse({ enabled: false, reason: "Valid reason", actorRole: "FOUNDER" }).success).toBe(false);
  });

  it("aggregates module, worker, and grid state in the operational summary", async () => {
    const { prisma } = await import("../src/db.js");

    await prisma.featureFlag.upsert({
      where: { moduleName: "money_grid" },
      create: { moduleName: "money_grid", enabled: true },
      update: { enabled: true }
    });

    await prisma.workerConfig.upsert({
      where: { id: "opportunity" },
      create: { id: "opportunity", enabled: true, desiredInstances: 2 },
      update: { enabled: true, desiredInstances: 2 }
    });

    await prisma.gridConfig.upsert({
      where: { id: "internet" },
      create: { id: "internet", desiredState: "WORKING" },
      update: { desiredState: "WORKING" }
    });

    const actor = await prisma.user.upsert({
      where: { externalSubject: "operations-summary-audit-user" },
      create: { externalSubject: "operations-summary-audit-user", role: Role.FOUNDER },
      update: { role: Role.FOUNDER }
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "MODULE_ENABLED",
        entityType: "FEATURE_FLAG",
        entityId: "money_grid",
        payload: { reason: "Summary validation" }
      }
    });

    const summary = await getOperationsSummary();
    expect(summary.modules.enabled).toBeGreaterThanOrEqual(1);
    expect(summary.workers.enabled).toBeGreaterThanOrEqual(1);
    expect(summary.grids.working).toBeGreaterThanOrEqual(1);
    expect(summary.lastAuditEvent).toMatchObject({
      entityType: "FEATURE_FLAG"
    });
    expect(summary.observedAt).toBeTypeOf("string");
    expect(summary.lastModuleChange).toBeTruthy();
  });

  it("restricts audit access to governance roles", () => {
    expect(() => requireAuditAccess(Role.FOUNDER)).not.toThrow();
    expect(() => requireAuditAccess(Role.COMPLIANCE_OFFICER)).not.toThrow();
    expect(() => requireAuditAccess(Role.PARTNER)).toThrow(AuthorizationError);
    expect(() => requireAuditAccess(Role.USER)).toThrow(AuthorizationError);
  });

  it("surfaces audit filters in the governance UI and supports bounded audit queries", () => {
    const consoleHtml = readFileSync("index.html", "utf8");
    expect(consoleHtml).toContain("data-audit-entity-filter");
    expect(consoleHtml).toContain("data-audit-role-filter");
    expect(consoleHtml).toContain("data-audit-limit");
    expect(consoleHtml).toContain("new URLSearchParams");
  });

  it("exposes status and search filters across the control-plane views", () => {
    const consoleHtml = readFileSync("index.html", "utf8");
    expect(consoleHtml).toContain("data-control-search");
    expect(consoleHtml).toContain("data-module-status-filter");
    expect(consoleHtml).toContain("data-worker-status-filter");
    expect(consoleHtml).toContain("data-grid-status-filter");
  });

  it("adds a CSV export action for the audit trail", () => {
    const consoleHtml = readFileSync("index.html", "utf8");
    expect(consoleHtml).toContain("data-audit-export");
    expect(consoleHtml).toContain("URL.createObjectURL");
    expect(consoleHtml).toContain("Blob(");
  });

  it("adds a richer governance report summary above the audit trail", () => {
    const consoleHtml = readFileSync("index.html", "utf8");
    expect(consoleHtml).toContain("data-audit-report");
    expect(consoleHtml).toContain("Governance report");
    expect(consoleHtml).toContain("Top actions");
  });

  it("supports filtered audit queries with a bounded result limit", async () => {
    const { prisma } = await import("../src/db.js");
    const actor = await prisma.user.upsert({
      where: { externalSubject: "audit-query-seed-user" },
      create: { externalSubject: "audit-query-seed-user", role: Role.FOUNDER },
      update: { role: Role.FOUNDER }
    });

    for (let index = 0; index < 120; index += 1) {
      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          action: index % 2 === 0 ? "MODULE_ENABLED" : "MODULE_DISABLED",
          entityType: "FEATURE_FLAG",
          entityId: `module_${index}`,
          payload: { reason: `Audit seed ${index}` }
        }
      });
    }

    const initial = await listAuditEvents({ take: 25 });
    expect(initial.length).toBeLessThanOrEqual(25);

    const filtered = await listAuditEvents({
      entityType: "FEATURE_FLAG",
      actorRole: Role.FOUNDER,
      take: 10
    });
    expect(filtered.every((event) => event.entityType === "FEATURE_FLAG")).toBe(true);
    expect(filtered.every((event) => event.actor?.role === Role.FOUNDER)).toBe(true);
    expect(filtered).toHaveLength(10);

    await expect(listAuditEvents({ take: 101 })).resolves.toHaveLength(100);
  });

  it("supports text search across audit actions, entities, and payload reasons", async () => {
    const { prisma } = await import("../src/db.js");
    const actor = await prisma.user.upsert({
      where: { externalSubject: "audit-search-seed-user" },
      create: { externalSubject: "audit-search-seed-user", role: Role.SUPER_ADMIN },
      update: { role: Role.SUPER_ADMIN }
    });

    for (const payload of [
      {
        action: "MODULE_DISABLED",
        entityType: "FEATURE_FLAG",
        entityId: "security_review",
        reason: "Review security patch window"
      },
      {
        action: "GRID_UPDATED",
        entityType: "GRID_CONFIG",
        entityId: "water_recovery",
        reason: "Grid health review"
      },
      {
        action: "WORKER_UPDATED",
        entityType: "WORKER_CONFIG",
        entityId: "field_research",
        reason: "AI worker batch pacing"
      }
    ]) {
      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          action: payload.action,
          entityType: payload.entityType,
          entityId: payload.entityId,
          payload: { reason: payload.reason }
        }
      });
    }

    const searchResults = await listAuditEvents({ search: "review", take: 25 });
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults.every((event) => {
      const haystack = [event.action, event.entityType, event.entityId, JSON.stringify(event.payload ?? {})].join(" ").toLowerCase();
      return haystack.includes("review");
    })).toBe(true);

    const entitySearch = await listAuditEvents({ search: "water_recovery", take: 25 });
    expect(entitySearch.some((event) => event.entityId === "water_recovery")).toBe(true);
  });

  it("reads a role from the configured namespaced claim", () => {
    const claim = "https://auth.example/cedars/role";
    expect(parseRoleClaim({ sub: "user-1", [claim]: "FOUNDER" }, claim))
      .toEqual({ success: true, data: "FOUNDER" });
    expect(parseRoleClaim({ sub: "user-1", role: "FOUNDER" }, claim).success).toBe(false);
    expect(parseRoleClaim({ sub: "user-1", [claim]: "OWNER" }, claim).success).toBe(false);
    expect(parseRoleClaim({ sub: "user-1", [claim]: "founder" }, claim).success).toBe(false);
    expect(parseRoleClaim({ sub: "user-1" }, "").success).toBe(false);
  });

  it("allows only platform administrators to change worker configuration", () => {
    expect(() => requireWorkerAdmin(Role.FOUNDER)).not.toThrow();
    expect(() => requireWorkerAdmin(Role.SUPER_ADMIN)).not.toThrow();
    expect(() => requireWorkerAdmin(Role.PARTNER)).toThrow(AuthorizationError);
  });

  it("validates worker identifiers, desired capacity, and audited reasons", () => {
    expect(workerIdSchema.safeParse("opportunity").success).toBe(true);
    expect(workerIdSchema.safeParse("unknown").success).toBe(false);
    expect(updateWorkerSchema.safeParse({
      enabled: true,
      desiredInstances: 2,
      reason: "Configure opportunity pilot"
    }).success).toBe(true);
    expect(updateWorkerSchema.safeParse({
      enabled: true,
      desiredInstances: 11,
      reason: "Configure opportunity pilot"
    }).success).toBe(false);
    expect(updateWorkerSchema.safeParse({
      enabled: true,
      desiredInstances: 1,
      reason: "short"
    }).success).toBe(false);
  });
});