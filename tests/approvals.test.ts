import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalStatus, Role } from "@prisma/client";

const originalEnvironment = { ...process.env };

function clearCachedClient() {
  delete (globalThis as typeof globalThis & { cedarsPrisma?: unknown }).cedarsPrisma;
}

describe("control approval workflow", () => {
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

  it("requires an independent eligible approval before enabling a module", async () => {
    const { prisma } = await import("../src/db.js");
    const { decideApproval } = await import("../src/features/approvals.js");
    const { updateModule } = await import("../src/features/modules.js");
    const result = await updateModule({
      actorSubject: "module-requester",
      actorRole: Role.FOUNDER,
      moduleName: "healthcare_ai",
      enabled: true,
      reason: "Enable reviewed pilot module"
    });

    expect(result).toMatchObject({ approvalRequired: true });
    const requestId = result.approval.id;
    expect((await prisma.featureFlag.findUnique({ where: { moduleName: "healthcare_ai" } }))?.enabled).toBe(false);

    await expect(decideApproval({
      actorSubject: "module-requester",
      actorRole: Role.FOUNDER,
      requestId,
      decision: "APPROVE",
      reason: "Attempt self approval"
    })).rejects.toMatchObject({ statusCode: 403 });
    await expect(decideApproval({
      actorSubject: "finance-reviewer",
      actorRole: Role.FINANCE_ADMIN,
      requestId,
      decision: "APPROVE",
      reason: "Wrong reviewer role"
    })).rejects.toMatchObject({ statusCode: 403 });

    await expect(decideApproval({
      actorSubject: "second-admin",
      actorRole: Role.SUPER_ADMIN,
      requestId,
      decision: "APPROVE",
      reason: "Reviewed the module scope"
    })).resolves.toMatchObject({ status: ApprovalStatus.APPROVED, applied: true });
    expect((await prisma.featureFlag.findUnique({ where: { moduleName: "healthcare_ai" } }))?.enabled).toBe(true);

    const disabled = await updateModule({
      actorSubject: "module-requester",
      actorRole: Role.FOUNDER,
      moduleName: "healthcare_ai",
      enabled: false,
      reason: "Disable module after review"
    });
    expect(disabled).not.toHaveProperty("approvalRequired");
    expect((await prisma.featureFlag.findUnique({ where: { moduleName: "healthcare_ai" } }))?.enabled).toBe(false);
  });

  it("queues worker and grid increases while applying OFF and maintenance immediately", async () => {
    const { prisma } = await import("../src/db.js");
    const { decideApproval } = await import("../src/features/approvals.js");
    const { updateGrid } = await import("../src/features/grids.js");
    const { updateWorker } = await import("../src/features/workers.js");

    const workerProposal = await updateWorker({
      actorSubject: "worker-requester",
      actorRole: Role.FOUNDER,
      workerId: "research",
      enabled: true,
      desiredInstances: 2,
      reason: "Enable approved research worker"
    });
    expect(workerProposal).toMatchObject({ approvalRequired: true });
    expect((await prisma.workerConfig.findUnique({ where: { id: "research" } }))?.enabled).toBe(false);
    await decideApproval({
      actorSubject: "worker-reviewer",
      actorRole: Role.SUPER_ADMIN,
      requestId: workerProposal.approval.id,
      decision: "APPROVE",
      reason: "Reviewed worker scope"
    });
    expect(await prisma.workerConfig.findUnique({ where: { id: "research" } })).toMatchObject({ enabled: true, desiredInstances: 2 });

    const gridProposal = await updateGrid({
      actorSubject: "grid-requester",
      actorRole: Role.FOUNDER,
      gridId: "solar",
      desiredState: "WORKING",
      reason: "Enable approved grid state"
    });
    expect(gridProposal).toMatchObject({ approvalRequired: true });
    expect((await prisma.gridConfig.findUnique({ where: { id: "solar" } }))?.desiredState).toBe("STANDBY");
    await decideApproval({
      actorSubject: "grid-reviewer",
      actorRole: Role.SUPER_ADMIN,
      requestId: gridProposal.approval.id,
      decision: "APPROVE",
      reason: "Reviewed grid scope"
    });
    expect((await prisma.gridConfig.findUnique({ where: { id: "solar" } }))?.desiredState).toBe("WORKING");

    const disabledWorker = await updateWorker({
      actorSubject: "worker-requester",
      actorRole: Role.FOUNDER,
      workerId: "research",
      enabled: false,
      desiredInstances: 2,
      reason: "Stop worker for safety"
    });
    expect(disabledWorker).not.toHaveProperty("approvalRequired");
    expect((await prisma.workerConfig.findUnique({ where: { id: "research" } }))?.enabled).toBe(false);

    const maintenanceGrid = await updateGrid({
      actorSubject: "grid-requester",
      actorRole: Role.FOUNDER,
      gridId: "solar",
      desiredState: "MAINTENANCE",
      reason: "Pause grid for review"
    });
    expect(maintenanceGrid).not.toHaveProperty("approvalRequired");
    expect((await prisma.gridConfig.findUnique({ where: { id: "solar" } }))?.desiredState).toBe("MAINTENANCE");
  });

  it("rejects stale approvals rather than overwriting a changed control", async () => {
    const { prisma } = await import("../src/db.js");
    const { decideApproval } = await import("../src/features/approvals.js");
    const { updateGrid } = await import("../src/features/grids.js");
    const proposal = await updateGrid({
      actorSubject: "stale-requester",
      actorRole: Role.FOUNDER,
      gridId: "solar",
      desiredState: "WORKING",
      reason: "Request grid activation"
    });

    await prisma.gridConfig.upsert({
      where: { id: "solar" },
      create: { id: "solar", desiredState: "MAINTENANCE" },
      update: { desiredState: "MAINTENANCE" }
    });
    await expect(decideApproval({
      actorSubject: "stale-reviewer",
      actorRole: Role.SUPER_ADMIN,
      requestId: proposal.approval.id,
      decision: "APPROVE",
      reason: "Reviewed after state changed"
    })).resolves.toMatchObject({ status: ApprovalStatus.REJECTED, stale: true, applied: false });
    expect((await prisma.gridConfig.findUnique({ where: { id: "solar" } }))?.desiredState).toBe("MAINTENANCE");
  });

  it("records a rejection and leaves the proposed state unapplied", async () => {
    const { prisma } = await import("../src/db.js");
    const { decideApproval } = await import("../src/features/approvals.js");
    const { updateGrid } = await import("../src/features/grids.js");
    const proposal = await updateGrid({
      actorSubject: "reject-requester",
      actorRole: Role.FOUNDER,
      gridId: "solar",
      desiredState: "WORKING",
      reason: "Request grid activation"
    });

    await expect(decideApproval({
      actorSubject: "reject-reviewer",
      actorRole: Role.SUPER_ADMIN,
      requestId: proposal.approval.id,
      decision: "REJECT",
      reason: "The scope is not ready"
    })).resolves.toMatchObject({ status: ApprovalStatus.REJECTED, applied: false });
    expect((await prisma.gridConfig.findUnique({ where: { id: "solar" } }))?.desiredState).toBe("STANDBY");
  });
});