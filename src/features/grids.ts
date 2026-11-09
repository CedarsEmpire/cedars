import { Role } from "@prisma/client";
import { z } from "zod";
import { AuthorizationError } from "../auth/authorization.js";
import { prisma } from "../db.js";
import { gridCatalog, gridIds, type GridDesiredState } from "./grid-catalog.js";
import { getRuntimeMode } from "./runtime-mode.js";
import { requestControlApproval } from "./approvals.js";
import { evaluateGridControl } from "./control-hierarchy.js";

export const gridIdSchema = z.enum(gridIds);
export const gridDesiredStateSchema = z.enum(["STANDBY", "WORKING", "MAINTENANCE"]);
export const updateGridSchema = z.object({
  desiredState: gridDesiredStateSchema,
  reason: z.string().trim().min(8).max(500)
}).strict();

export function requireGridAdmin(role: Role) {
  if (role !== Role.FOUNDER && role !== Role.SUPER_ADMIN) {
    throw new AuthorizationError(403, "Platform administrator role required.");
  }
}

export async function listGrids() {
  const configs = await prisma.gridConfig.findMany({ orderBy: { id: "asc" } });
  const configById = new Map(configs.map((config) => [config.id, config]));
  const runtimeMode = getRuntimeMode();

  return Promise.all(gridCatalog.map(async (grid) => {
    const config = configById.get(grid.id);
    const desiredState = (config?.desiredState ?? "STANDBY") as GridDesiredState;
    const control = await evaluateGridControl(grid.id, desiredState, config?.updatedAt);
    return {
      ...grid,
      dependencies: grid.dependsOn.map((id) => ({
        id,
        name: gridCatalog.find((dependency) => dependency.id === id)?.name ?? id
      })),
      desiredState,
      effectiveState: control.effectiveState,
      blockReason: control.blockReason,
      configured: Boolean(config),
      runtimeMode,
      runtimeStatus: runtimeMode === "SIMULATOR" ? `SIMULATED_${desiredState}` : "NOT_CONNECTED",
      integrationStatus: runtimeMode === "SIMULATOR" ? "SIMULATOR" : "NOT_CONFIGURED"
    };
  }));
}

export async function updateGrid(input: {
  actorSubject: string;
  actorRole: Role;
  gridId: string;
  desiredState: GridDesiredState;
  reason: string;
}) {
  requireGridAdmin(input.actorRole);
  const grid = gridCatalog.find((item) => item.id === input.gridId);
  if (!grid) throw new Error("Grid is not in the supported catalog.");
  const runtimeMode = getRuntimeMode();
  const current = await prisma.gridConfig.findUnique({ where: { id: input.gridId } });
  const currentState = current?.desiredState ?? "STANDBY";
  const currentControl = await evaluateGridControl(input.gridId, currentState, current?.updatedAt);
  if (input.desiredState === "WORKING" &&
      (currentState !== "WORKING" || currentControl.blockReason === "PARENT_AUTHORIZATION_CHANGED")) {
    const approval = await requestControlApproval({
      actorSubject: input.actorSubject,
      actorRole: input.actorRole,
      scope: "GRID_WORKING",
      entityType: "GRID_CONFIG",
      entityId: input.gridId,
      expectedState: { desiredState: currentState },
      proposedState: { desiredState: input.desiredState },
      reason: input.reason
    });
    return { approvalRequired: true as const, approval };
  }

  return prisma.$transaction(async (transaction) => {
    const actor = await transaction.user.upsert({
      where: { externalSubject: input.actorSubject },
      create: { externalSubject: input.actorSubject, role: input.actorRole },
      update: {}
    });

    const config = await transaction.gridConfig.upsert({
      where: { id: input.gridId },
      create: { id: input.gridId, desiredState: input.desiredState, updatedById: actor.id },
      update: { desiredState: input.desiredState, updatedById: actor.id }
    });
    const runtimeStatus = runtimeMode === "SIMULATOR" ? `SIMULATED_${config.desiredState}` : "NOT_CONNECTED";
    const integrationStatus = runtimeMode === "SIMULATOR" ? "SIMULATOR" : "NOT_CONFIGURED";

    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: "GRID_DESIRED_STATE_UPDATED",
        entityType: "GRID_CONFIG",
        entityId: input.gridId,
        payload: {
          desiredState: input.desiredState,
          runtimeMode,
          runtimeStatus,
          integrationStatus,
          reason: input.reason
        }
      }
    });

    const control = await evaluateGridControl(input.gridId, config.desiredState as GridDesiredState, config.updatedAt);
    return {
      ...grid,
      dependencies: grid.dependsOn.map((id) => ({
        id,
        name: gridCatalog.find((dependency) => dependency.id === id)?.name ?? id
      })),
      desiredState: config.desiredState as GridDesiredState,
      effectiveState: control.effectiveState,
      blockReason: control.blockReason,
      configured: true,
      runtimeMode,
      runtimeStatus,
      integrationStatus
    };
  });
}