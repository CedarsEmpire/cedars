import { Role } from "@prisma/client";
import { z } from "zod";
import { AuthorizationError } from "../auth/authorization.js";
import { prisma } from "../db.js";
import { workerCatalog } from "./worker-catalog.js";
import { getRuntimeMode } from "./runtime-mode.js";
import { requestControlApproval } from "./approvals.js";

export const workerIdSchema = z.string().refine(
  (value) => workerCatalog.some((worker) => worker.id === value),
  "Unknown worker identifier."
);
export const updateWorkerSchema = z.object({
  enabled: z.boolean(),
  desiredInstances: z.number().int().min(1).max(10),
  reason: z.string().trim().min(8).max(500)
}).strict();

export function requireWorkerAdmin(role: Role) {
  if (role !== Role.FOUNDER && role !== Role.SUPER_ADMIN) {
    throw new AuthorizationError(403, "Platform administrator role required.");
  }
}

export async function listWorkers() {
  const configs = await prisma.workerConfig.findMany({ orderBy: { id: "asc" } });
  const configById = new Map(configs.map((config) => [config.id, config]));
  const runtimeMode = getRuntimeMode();

  return workerCatalog.map((worker) => {
    const config = configById.get(worker.id);
    const enabled = config?.enabled ?? false;
    return {
      ...worker,
      enabled,
      desiredInstances: config?.desiredInstances ?? 1,
      configured: Boolean(config),
      runtimeMode,
      runtimeStatus: runtimeMode === "SIMULATOR"
        ? enabled ? "SIMULATED_RUNNING" : "SIMULATED_STOPPED"
        : "NOT_CONNECTED"
    };
  });
}

export async function updateWorker(input: {
  actorSubject: string;
  actorRole: Role;
  workerId: string;
  enabled: boolean;
  desiredInstances: number;
  reason: string;
}) {
  requireWorkerAdmin(input.actorRole);
  const worker = workerCatalog.find((item) => item.id === input.workerId);
  if (!worker) throw new Error("Worker is not in the supported catalog.");
  const runtimeMode = getRuntimeMode();
  const current = await prisma.workerConfig.findUnique({ where: { id: input.workerId } });
  const currentEnabled = current?.enabled ?? false;
  const currentInstances = current?.desiredInstances ?? 1;

  if (input.enabled && (!currentEnabled || input.desiredInstances > currentInstances)) {
    const approval = await requestControlApproval({
      actorSubject: input.actorSubject,
      actorRole: input.actorRole,
      scope: !currentEnabled ? "WORKER_ENABLE" : "WORKER_SCALE_UP",
      entityType: "WORKER_CONFIG",
      entityId: input.workerId,
      expectedState: { enabled: currentEnabled, desiredInstances: currentInstances },
      proposedState: { enabled: input.enabled, desiredInstances: input.desiredInstances },
      reason: input.reason
    });
    return { approvalRequired: true as const, approval };
  }

  const desiredInstances = !input.enabled && input.desiredInstances > currentInstances
    ? currentInstances
    : input.desiredInstances;

  return prisma.$transaction(async (transaction) => {
    const actor = await transaction.user.upsert({
      where: { externalSubject: input.actorSubject },
      create: { externalSubject: input.actorSubject, role: input.actorRole },
      update: {}
    });

    const config = await transaction.workerConfig.upsert({
      where: { id: input.workerId },
      create: {
        id: input.workerId,
        enabled: input.enabled,
        desiredInstances,
        updatedById: actor.id
      },
      update: {
        enabled: input.enabled,
        desiredInstances,
        updatedById: actor.id
      }
    });
    const runtimeStatus = runtimeMode === "SIMULATOR"
      ? config.enabled ? "SIMULATED_RUNNING" : "SIMULATED_STOPPED"
      : "NOT_CONNECTED";

    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: "WORKER_CONFIGURATION_UPDATED",
        entityType: "WORKER_CONFIG",
        entityId: input.workerId,
        payload: {
          enabled: input.enabled,
          desiredInstances,
          runtimeMode,
          runtimeStatus,
          reason: input.reason
        }
      }
    });

    return {
      ...worker,
      enabled: config.enabled,
      desiredInstances: config.desiredInstances,
      configured: true,
      runtimeMode,
      runtimeStatus
    };
  });
}
