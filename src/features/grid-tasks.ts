import { GridTaskStatus, Role } from "@prisma/client";
import { z } from "zod";
import { AuthorizationError } from "../auth/authorization.js";
import { prisma } from "../db.js";
import { gridIds } from "./grid-catalog.js";
import { workerCatalog } from "./worker-catalog.js";

const adminRoles = new Set<Role>([Role.FOUNDER, Role.SUPER_ADMIN]);
const workerIds = new Set<string>(workerCatalog.map((worker) => worker.id));

export const createGridTaskSchema = z.object({
  gridId: z.enum(gridIds),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(5000),
  acceptanceCriteria: z.string().trim().min(10).max(5000),
  agreedAmount: z.string().regex(/^(?=.*[1-9])\d{1,12}(?:\.\d{1,8})?$/, "Amount must be positive with up to 8 decimal places."),
  currency: z.string().regex(/^[A-Z]{3}$/).default("USD")
}).strict();

export const updateGridTaskSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("assign"), workerId: z.string(), reason: z.string().trim().min(8).max(500) }).strict(),
  z.object({ action: z.literal("start"), reason: z.string().trim().min(8).max(500) }).strict(),
  z.object({ action: z.literal("deliver"), evidence: z.string().trim().min(10).max(10_000), reason: z.string().trim().min(8).max(500) }).strict(),
  z.object({ action: z.literal("accept"), reason: z.string().trim().min(8).max(500) }).strict(),
  z.object({ action: z.literal("cancel"), reason: z.string().trim().min(8).max(500) }).strict()
]);

export type CreateGridTaskInput = z.infer<typeof createGridTaskSchema>;
export type UpdateGridTaskInput = z.infer<typeof updateGridTaskSchema>;

export class GridTaskError extends Error {
  constructor(public readonly statusCode: 404 | 409 | 422, message: string) {
    super(message);
    this.name = "GridTaskError";
  }
}

function isAdmin(role: Role) {
  return adminRoles.has(role);
}

export async function requireGridTaskAccess(actorSubject: string) {
  const enabled = process.env.CEDARS_GRID_TASKS_ENABLED === "true";
  const testers = new Set(
    (process.env.CEDARS_GRID_TASK_TESTER_SUBJECTS ?? "")
      .split(",")
      .map((subject) => subject.trim())
      .filter(Boolean)
  );
  if (!enabled || !testers.has(actorSubject)) {
    throw new AuthorizationError(403, "Grid Tasks are restricted to explicitly allowlisted pilot testers.");
  }
  const flags = await prisma.featureFlag.findMany();
  if (!flags.some((flag) => flag.moduleName === "grid_tasks" && flag.enabled)) {
    throw new AuthorizationError(403, "Grid Tasks are restricted to explicitly allowlisted pilot testers.");
  }
}

export function presentGridTask<T extends { agreedAmount: { toString(): string } }>(task: T) {
  return {
    ...task,
    agreedAmount: task.agreedAmount.toString(),
    settlementStatus: "NOT_RECORDED" as const
  };
}

export async function listGridTasks(actorSubject: string, actorRole: Role) {
  const buyer = await prisma.user.findUnique({ where: { externalSubject: actorSubject } });
  if (!buyer) return [];
  const tasks = await prisma.gridTask.findMany({
    where: isAdmin(actorRole) ? undefined : { buyerId: buyer.id },
    orderBy: { createdAt: "desc" }
  });
  return tasks.map((task) => ({ ...task, canAccept: task.buyerId === buyer.id }));
}

export async function createGridTask(input: {
  actorSubject: string;
  actorRole: Role;
  task: CreateGridTaskInput;
}) {
  const task = await prisma.$transaction(async (transaction) => {
    const buyer = await transaction.user.upsert({
      where: { externalSubject: input.actorSubject },
      create: { externalSubject: input.actorSubject, role: input.actorRole },
      update: {}
    });
    const created = await transaction.gridTask.create({
      data: {
        buyerId: buyer.id,
        gridId: input.task.gridId,
        workerId: null,
        title: input.task.title,
        description: input.task.description,
        acceptanceCriteria: input.task.acceptanceCriteria,
        agreedAmount: input.task.agreedAmount,
        currency: input.task.currency,
        status: GridTaskStatus.OPEN,
        deliveryEvidence: null,
        deliveredAt: null,
        acceptedById: null,
        acceptedAt: null
      }
    });
    await transaction.auditLog.create({
      data: {
        actorId: buyer.id,
        action: "GRID_TASK_CREATED",
        entityType: "GRID_TASK",
        entityId: created.id,
        payload: {
          gridId: created.gridId,
          agreedAmount: created.agreedAmount.toString(),
          currency: created.currency
        }
      }
    });
    return created;
  });
  return presentGridTask(task);
}

export async function updateGridTask(input: {
  actorSubject: string;
  actorRole: Role;
  taskId: string;
  update: UpdateGridTaskInput;
}) {
  const actor = await prisma.user.findUnique({ where: { externalSubject: input.actorSubject } });
  if (!actor) throw new AuthorizationError(403, "Authorized user record is unavailable.");

  return prisma.$transaction(async (transaction) => {
    const task = await transaction.gridTask.findUnique({ where: { id: input.taskId } });
    if (!task) throw new GridTaskError(404, "Grid task not found.");

    let status: GridTaskStatus;
    let changes: Record<string, unknown> = {};
    switch (input.update.action) {
      case "assign":
        if (!isAdmin(input.actorRole)) throw new AuthorizationError(403, "Platform administrator role required.");
        if (task.status !== GridTaskStatus.OPEN) throw new GridTaskError(409, "Only open tasks can be assigned.");
        if (!workerIds.has(input.update.workerId)) throw new GridTaskError(422, "Worker is not in the supported catalog.");
        status = GridTaskStatus.ASSIGNED;
        changes = { workerId: input.update.workerId };
        break;
      case "start":
        if (!isAdmin(input.actorRole)) throw new AuthorizationError(403, "Platform administrator role required.");
        if (task.status !== GridTaskStatus.ASSIGNED) throw new GridTaskError(409, "Only assigned tasks can be started.");
        status = GridTaskStatus.IN_PROGRESS;
        break;
      case "deliver":
        if (!isAdmin(input.actorRole)) throw new AuthorizationError(403, "Platform administrator role required.");
        if (task.status !== GridTaskStatus.IN_PROGRESS) throw new GridTaskError(409, "Only in-progress tasks can be delivered.");
        if (task.buyerId === actor.id) throw new AuthorizationError(403, "The buyer cannot submit their own delivery evidence.");
        status = GridTaskStatus.DELIVERED;
        changes = { deliveryEvidence: input.update.evidence, deliveredAt: new Date() };
        break;
      case "accept":
        if (task.buyerId !== actor.id) throw new AuthorizationError(403, "Only the task buyer can accept delivery.");
        if (task.status !== GridTaskStatus.DELIVERED) throw new GridTaskError(409, "Only delivered tasks can be accepted.");
        status = GridTaskStatus.ACCEPTED;
        changes = { acceptedById: actor.id, acceptedAt: new Date() };
        break;
      case "cancel":
        if (task.buyerId !== actor.id && !isAdmin(input.actorRole)) {
          throw new AuthorizationError(403, "Only the buyer or a platform administrator can cancel this task.");
        }
        if (task.status !== GridTaskStatus.OPEN && task.status !== GridTaskStatus.ASSIGNED) {
          throw new GridTaskError(409, "Only open or assigned tasks can be cancelled.");
        }
        status = GridTaskStatus.CANCELLED;
        break;
    }

    const result = await transaction.gridTask.updateMany({
      where: { id: task.id, status: task.status },
      data: { ...changes, status }
    });
    if (result.count !== 1) throw new GridTaskError(409, "Grid task changed; reload and try again.");

    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: `GRID_TASK_${input.update.action.toUpperCase()}`,
        entityType: "GRID_TASK",
        entityId: task.id,
        payload: {
          previousStatus: task.status,
          status,
          reason: input.update.reason,
          ...(input.update.action === "assign" ? { workerId: input.update.workerId } : {}),
          ...(input.update.action === "deliver" ? { evidence: input.update.evidence } : {})
        }
      }
    });

    const updated = await transaction.gridTask.findUnique({ where: { id: task.id } });
    if (!updated) throw new GridTaskError(404, "Grid task not found after update.");
    return presentGridTask(updated);
  });
}