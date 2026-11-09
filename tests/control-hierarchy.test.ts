import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";

const originalEnvironment = { ...process.env };

function clearCachedClient() {
  delete (globalThis as typeof globalThis & { cedarsPrisma?: unknown }).cedarsPrisma;
}

describe("M6 global and economic-layer control hierarchy", () => {
  beforeEach(() => {
    vi.resetModules();
    clearCachedClient();
    process.env.CEDARS_USE_IN_MEMORY_DB = "1";
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnvironment)) delete process.env[key];
    }
    Object.assign(process.env, originalEnvironment);
    clearCachedClient();
  });

  it("fails closed when global or layer control records are missing", async () => {
    const { evaluateGridControl, listControlScopes } = await import("../src/features/control-hierarchy.js");
    const scopes = await listControlScopes();
    expect(scopes).toHaveLength(5);
    expect(scopes.every((scope) => scope.enabled === false && scope.effectiveEnabled === false)).toBe(true);
    await expect(evaluateGridControl("solar", "WORKING")).resolves.toMatchObject({
      effectiveState: "BLOCKED",
      blockReason: "GLOBAL_SOFTWARE_OFF"
    });
  });

  it("does not allow an enabled child layer to bypass the global OFF control", async () => {
    const { prisma } = await import("../src/db.js");
    const { evaluateGridControl } = await import("../src/features/control-hierarchy.js");
    await prisma.controlScopeConfig.upsert({
      where: { scopeType_scopeId: { scopeType: "ECONOMIC_LAYER", scopeId: "CEDARS EARTH" } },
      create: { scopeType: "ECONOMIC_LAYER", scopeId: "CEDARS EARTH", enabled: true },
      update: { enabled: true }
    });
    await expect(evaluateGridControl("solar", "WORKING")).resolves.toMatchObject({
      effectiveState: "BLOCKED",
      blockReason: "GLOBAL_SOFTWARE_OFF"
    });
  });

  it("requires both global and layer authorization before a working Grid is eligible", async () => {
    const { prisma } = await import("../src/db.js");
    const { evaluateGridControl } = await import("../src/features/control-hierarchy.js");
    await prisma.controlScopeConfig.upsert({
      where: { scopeType_scopeId: { scopeType: "GLOBAL_SOFTWARE", scopeId: "global" } },
      create: { scopeType: "GLOBAL_SOFTWARE", scopeId: "global", enabled: true },
      update: { enabled: true }
    });
    await expect(evaluateGridControl("solar", "WORKING")).resolves.toMatchObject({
      effectiveState: "BLOCKED",
      blockReason: "ECONOMIC_LAYER_OFF"
    });
    await prisma.controlScopeConfig.upsert({
      where: { scopeType_scopeId: { scopeType: "ECONOMIC_LAYER", scopeId: "CEDARS EARTH" } },
      create: { scopeType: "ECONOMIC_LAYER", scopeId: "CEDARS EARTH", enabled: true },
      update: { enabled: true }
    });
    await expect(evaluateGridControl("solar", "STANDBY")).resolves.toMatchObject({
      effectiveState: "BLOCKED",
      blockReason: "STANDBY"
    });
    await expect(evaluateGridControl("solar", "WORKING")).resolves.toMatchObject({
      effectiveState: "ELIGIBLE",
      blockReason: null
    });
  });

  it("requires independent approval to enable the global software control", async () => {
    const { prisma } = await import("../src/db.js");
    const { updateControlScope } = await import("../src/features/control-hierarchy.js");
    const { decideApproval } = await import("../src/features/approvals.js");
    const proposal = await updateControlScope({
      actorSubject: "global-requester",
      actorRole: Role.FOUNDER,
      scopeType: "GLOBAL_SOFTWARE",
      scopeId: "global",
      enabled: true,
      reason: "Request global software authorization"
    });
    expect(proposal).toMatchObject({ approvalRequired: true });
    expect((await prisma.controlScopeConfig.findUnique({
      where: { scopeType_scopeId: { scopeType: "GLOBAL_SOFTWARE", scopeId: "global" } }
    }))?.enabled).toBeUndefined();
    await expect(decideApproval({
      actorSubject: "global-requester",
      actorRole: Role.FOUNDER,
      requestId: proposal.approval.id,
      decision: "APPROVE",
      reason: "Attempt self approval"
    })).rejects.toMatchObject({ statusCode: 403 });
    await expect(decideApproval({
      actorSubject: "global-reviewer",
      actorRole: Role.SUPER_ADMIN,
      requestId: proposal.approval.id,
      decision: "APPROVE",
      reason: "Independent review completed"
    })).resolves.toMatchObject({ applied: true });
    expect((await prisma.controlScopeConfig.findUnique({
      where: { scopeType_scopeId: { scopeType: "GLOBAL_SOFTWARE", scopeId: "global" } }
    }))?.enabled).toBe(true);
  });

  it("applies global OFF immediately and blocks a previously eligible Grid", async () => {
    const { prisma } = await import("../src/db.js");
    const { evaluateGridControl, updateControlScope } = await import("../src/features/control-hierarchy.js");
    await prisma.controlScopeConfig.upsert({
      where: { scopeType_scopeId: { scopeType: "GLOBAL_SOFTWARE", scopeId: "global" } },
      create: { scopeType: "GLOBAL_SOFTWARE", scopeId: "global", enabled: true },
      update: { enabled: true }
    });
    await prisma.controlScopeConfig.upsert({
      where: { scopeType_scopeId: { scopeType: "ECONOMIC_LAYER", scopeId: "CEDARS EARTH" } },
      create: { scopeType: "ECONOMIC_LAYER", scopeId: "CEDARS EARTH", enabled: true },
      update: { enabled: true }
    });
    await expect(evaluateGridControl("solar", "WORKING")).resolves.toMatchObject({ effectiveState: "ELIGIBLE" });
    await updateControlScope({
      actorSubject: "global-operator",
      actorRole: Role.FOUNDER,
      scopeType: "GLOBAL_SOFTWARE",
      scopeId: "global",
      enabled: false,
      reason: "Disable global software operations"
    });
    await expect(evaluateGridControl("solar", "WORKING")).resolves.toMatchObject({
      effectiveState: "BLOCKED",
      blockReason: "GLOBAL_SOFTWARE_OFF"
    });
  });

  it("rejects non-canonical scope identifiers", async () => {
    const { updateControlScope } = await import("../src/features/control-hierarchy.js");
    await expect(updateControlScope({
      actorSubject: "scope-operator",
      actorRole: Role.FOUNDER,
      scopeType: "ECONOMIC_LAYER",
      scopeId: "CEDARS UNKNOWN",
      enabled: true,
      reason: "Request an unknown economic layer"
    })).rejects.toThrow("Control scope is not in the supported hierarchy.");
  });

  it("exposes requested and effective states separately across Grid, worker, and module views", async () => {
    const { prisma } = await import("../src/db.js");
    const { listGrids } = await import("../src/features/grids.js");
    const { listWorkers } = await import("../src/features/workers.js");
    const { listModules } = await import("../src/features/modules.js");

    const grids = await listGrids();
    expect(grids).toHaveLength(53);
    expect(grids.every((grid) => grid.effectiveState === "BLOCKED")).toBe(true);

    const workers = await listWorkers();
    expect(workers.every((worker) => worker.effectiveState === "BLOCKED")).toBe(true);
    expect(workers.every((worker) => worker.blockReason === "GLOBAL_SOFTWARE_OFF")).toBe(true);

    await prisma.controlScopeConfig.upsert({
      where: { scopeType_scopeId: { scopeType: "GLOBAL_SOFTWARE", scopeId: "global" } },
      create: { scopeType: "GLOBAL_SOFTWARE", scopeId: "global", enabled: true },
      update: { enabled: true }
    });
    const workersWithGlobalOn = await listWorkers();
    expect(workersWithGlobalOn.every((worker) => worker.effectiveState === "BLOCKED")).toBe(true);
    expect(workersWithGlobalOn.every((worker) => worker.blockReason === "WORKER_GRID_ASSIGNMENT_UNVERIFIED")).toBe(true);

    const modules = await listModules();
    expect(modules.every((module) => module.effectiveEnabled === false || module.enabled === false)).toBe(true);
  });
});
