import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GridTaskStatus, Role } from "@prisma/client";

const originalEnvironment = { ...process.env };

function clearCachedClient() {
  delete (globalThis as typeof globalThis & { cedarsPrisma?: unknown }).cedarsPrisma;
}

describe("Grid Task work order lifecycle", () => {
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

  it("fails closed unless both pilot switches are enabled and the subject is allowlisted", async () => {
    const { requireGridTaskAccess } = await import("../src/features/grid-tasks.js");
    const { prisma } = await import("../src/db.js");
    process.env.CEDARS_GRID_TASKS_ENABLED = "false";
    process.env.CEDARS_GRID_TASK_TESTER_SUBJECTS = "pilot-buyer,pilot-admin";
    await expect(requireGridTaskAccess("pilot-buyer")).rejects.toThrow(/allowlisted pilot testers/);

    process.env.CEDARS_GRID_TASKS_ENABLED = "true";
    await expect(requireGridTaskAccess("pilot-buyer")).rejects.toThrow(/allowlisted pilot testers/);

    await prisma.featureFlag.upsert({
      where: { moduleName: "grid_tasks" },
      create: { moduleName: "grid_tasks", enabled: true },
      update: { enabled: true }
    });
    await expect(requireGridTaskAccess("pilot-buyer")).resolves.toBeUndefined();
    await expect(requireGridTaskAccess("public-user")).rejects.toThrow(/allowlisted pilot testers/);

    await prisma.featureFlag.upsert({
      where: { moduleName: "grid_tasks" },
      create: { moduleName: "grid_tasks", enabled: false },
      update: { enabled: false }
    });
    await expect(requireGridTaskAccess("pilot-buyer")).rejects.toThrow(/allowlisted pilot testers/);
  });

  it("validates positive decimal prices and rejects extra fields", async () => {
    const { createGridTaskSchema } = await import("../src/features/grid-tasks.js");
    const valid = {
      gridId: "ai-iq",
      title: "Translate a supplier guide",
      description: "Translate a short product guide for a prospective buyer.",
      acceptanceCriteria: "Deliver an editable translation with all sections preserved.",
      agreedAmount: "1.25000000",
      currency: "USD"
    };

    expect(createGridTaskSchema.safeParse(valid).success).toBe(true);
    expect(createGridTaskSchema.safeParse({ ...valid, agreedAmount: "0" }).success).toBe(false);
    expect(createGridTaskSchema.safeParse({ ...valid, agreedAmount: "1.123456789" }).success).toBe(false);
    expect(createGridTaskSchema.safeParse({ ...valid, unexpected: true }).success).toBe(false);
  });

  it("records a task through buyer acceptance without treating acceptance as payment", async () => {
    const { prisma } = await import("../src/db.js");
    const { createGridTask, listGridTasks, updateGridTask } = await import("../src/features/grid-tasks.js");
    const task = await createGridTask({
      actorSubject: "pilot-buyer",
      actorRole: Role.USER,
      task: {
        gridId: "ai-iq",
        title: "Translate a supplier guide",
        description: "Translate a short product guide for a prospective buyer.",
        acceptanceCriteria: "Deliver an editable translation with all sections preserved.",
        agreedAmount: "1.25",
        currency: "USD"
      }
    });
    const admin = await prisma.user.upsert({
      where: { externalSubject: "pilot-admin" },
      create: { externalSubject: "pilot-admin", role: Role.FOUNDER },
      update: { role: Role.FOUNDER }
    });

    expect(task).toMatchObject({
      status: GridTaskStatus.OPEN,
      agreedAmount: "1.25",
      settlementStatus: "NOT_RECORDED"
    });
    expect(await listGridTasks("pilot-buyer", Role.USER)).toHaveLength(1);
    expect(await listGridTasks("other-buyer", Role.USER)).toEqual([]);
    expect(await listGridTasks("pilot-admin", Role.FOUNDER)).toHaveLength(1);

    await expect(updateGridTask({
      actorSubject: "pilot-buyer",
      actorRole: Role.USER,
      taskId: task.id,
      update: { action: "assign", workerId: "research", reason: "Attempt unauthorized assignment" }
    })).rejects.toThrow(/Platform administrator role required/);

    await expect(updateGridTask({
      actorSubject: "pilot-buyer",
      actorRole: Role.USER,
      taskId: task.id,
      update: { action: "accept", reason: "Attempt early acceptance" }
    })).rejects.toThrow(/Only delivered tasks can be accepted/);

    const assigned = await updateGridTask({
      actorSubject: admin.externalSubject,
      actorRole: Role.FOUNDER,
      taskId: task.id,
      update: { action: "assign", workerId: "research", reason: "Assign the research worker" }
    });
    expect(assigned).toMatchObject({ status: GridTaskStatus.ASSIGNED, workerId: "research" });

    await updateGridTask({
      actorSubject: admin.externalSubject,
      actorRole: Role.FOUNDER,
      taskId: task.id,
      update: { action: "start", reason: "Begin the approved work" }
    });
    const delivered = await updateGridTask({
      actorSubject: admin.externalSubject,
      actorRole: Role.FOUNDER,
      taskId: task.id,
      update: {
        action: "deliver",
        evidence: "https://example.invalid/evidence/task-1",
        reason: "Record reviewed delivery evidence"
      }
    });
    expect(delivered).toMatchObject({ status: GridTaskStatus.DELIVERED, settlementStatus: "NOT_RECORDED" });

    const accepted = await updateGridTask({
      actorSubject: "pilot-buyer",
      actorRole: Role.USER,
      taskId: task.id,
      update: { action: "accept", reason: "Buyer accepted the deliverable" }
    });
    expect(accepted).toMatchObject({
      status: GridTaskStatus.ACCEPTED,
      acceptedById: expect.any(String),
      settlementStatus: "NOT_RECORDED"
    });

    const events = await prisma.auditLog.findMany({
      where: { entityType: "GRID_TASK", entityId: task.id },
      orderBy: { createdAt: "asc" }
    });
    expect(events.map((event) => event.action)).toEqual([
      "GRID_TASK_CREATED",
      "GRID_TASK_ASSIGN",
      "GRID_TASK_START",
      "GRID_TASK_DELIVER",
      "GRID_TASK_ACCEPT"
    ]);
  });
});