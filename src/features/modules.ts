import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db.js";
import { AuthorizationError } from "../auth/authorization.js";
import { gridCatalog } from "./grid-catalog.js";
import { moduleNames } from "./module-catalog.js";
import { workerCatalog } from "./worker-catalog.js";
import { requestControlApproval } from "./approvals.js";
import { getGlobalSoftwareEnabled, listControlScopes } from "./control-hierarchy.js";
import { listGrids } from "./grids.js";
import { listWorkers } from "./workers.js";

export { moduleNames } from "./module-catalog.js";

export const moduleNameSchema = z.enum(moduleNames);
export const updateModuleSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().trim().min(8).max(500)
}).strict();

const financialModules = new Set<string>(["money_grid", "wallet", "ledger"]);
const validModuleNames = new Set<string>(moduleNames);

export function assertModuleExists(moduleName: string) {
  if (!validModuleNames.has(moduleName)) {
    throw new Error("Module is not in the supported catalog.");
  }
}

export function assertModuleUpdateAllowed(role: Role, moduleName: string, enabled: boolean) {
  if (role !== Role.FOUNDER && role !== Role.SUPER_ADMIN) {
    throw new AuthorizationError(403, "Platform administrator role required.");
  }
  assertModuleExists(moduleName);
  if (enabled && financialModules.has(moduleName)) {
    throw new AuthorizationError(403, "Financial module activation requires a dual-approval workflow, which is not configured.");
  }
}

export async function listModules() {
  const [flags, globalEnabled] = await Promise.all([
    prisma.featureFlag.findMany({ orderBy: { moduleName: "asc" } }),
    getGlobalSoftwareEnabled()
  ]);
  return flags.map((flag) => ({
    ...flag,
    effectiveEnabled: false,
    effectiveState: "BLOCKED",
    blockReason: !globalEnabled ? "GLOBAL_SOFTWARE_OFF" : flag.enabled ? "MODULE_GRID_ASSIGNMENT_UNVERIFIED" : "MODULE_DISABLED",
    observedState: "NOT_CONNECTED",
    verificationState: "UNVERIFIED"
  }));
}

export async function getOperationsSummary() {
  const [
    totalModules,
    enabledModules,
    enabledWorkers,
    workingGrids,
    mostRecentChange,
    mostRecentAudit,
    effectiveGridStates,
    effectiveWorkerStates,
    controlScopes
  ] = await Promise.all([
    prisma.featureFlag.count(),
    prisma.featureFlag.count({ where: { enabled: true } }),
    prisma.workerConfig.count({ where: { enabled: true } }),
    prisma.gridConfig.count({ where: { desiredState: "WORKING" } }),
    prisma.featureFlag.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { moduleName: true, updatedAt: true }
    }),
    prisma.auditLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: {
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        payload: true,
        actor: { select: { role: true } }
      }
    }),
    listGrids(),
    listWorkers(),
    listControlScopes()
  ]);

  return {
    observedAt: new Date().toISOString(),
    modules: { total: totalModules, enabled: enabledModules, desiredEnabled: enabledModules, effectiveEnabled: 0 },
    workers: { total: workerCatalog.length, enabled: enabledWorkers, desiredEnabled: enabledWorkers, effectiveEligible: effectiveWorkerStates.filter((worker) => worker.effectiveState === "ELIGIBLE").length },
    grids: { total: gridCatalog.length, working: workingGrids, desiredWorking: workingGrids, effectiveEligible: effectiveGridStates.filter((grid) => grid.effectiveState === "ELIGIBLE").length },
    controlScopes,
    lastModuleChange: mostRecentChange,
    lastAuditEvent: mostRecentAudit ?? null
  };
}

export function requireAuditAccess(role: Role) {
  if (role !== Role.FOUNDER && role !== Role.SUPER_ADMIN && role !== Role.COMPLIANCE_OFFICER) {
    throw new AuthorizationError(403, "Audit access is restricted to authorized governance roles.");
  }
}

export async function listAuditEvents(options: {
  entityType?: string;
  entityId?: string;
  actorRole?: Role;
  search?: string;
  take?: number;
} = {}) {
  const take = Math.min(Math.max(options.take ?? 100, 1), 100);
  const filters: Record<string, unknown> = {};

  if (options.entityType) {
    filters.entityType = options.entityType;
  }
  if (options.entityId) {
    filters.entityId = options.entityId;
  }
  if (options.actorRole) {
    filters.actor = { is: { role: options.actorRole } };
  }

  const results = await prisma.auditLog.findMany({
    where: Object.keys(filters).length > 0 ? filters : undefined,
    take,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      payload: true,
      createdAt: true,
      actor: { select: { role: true } }
    }
  });

  const search = options.search?.trim().toLowerCase();
  if (!search) {
    return results;
  }

  return results.filter((event) => {
    const haystack = [
      event.action,
      event.entityType,
      event.entityId,
      event.actor?.role ?? "",
      JSON.stringify(event.payload ?? {})
    ].join(" ").toLowerCase();
    return haystack.includes(search);
  });
}

export async function updateModule(input: {
  actorSubject: string;
  actorRole: Role;
  moduleName: string;
  enabled: boolean;
  reason: string;
}) {
  assertModuleUpdateAllowed(input.actorRole, input.moduleName, input.enabled);

  const current = await prisma.featureFlag.findUnique({ where: { moduleName: input.moduleName } });
  if (input.enabled && !current?.enabled) {
    const approval = await requestControlApproval({
      actorSubject: input.actorSubject,
      actorRole: input.actorRole,
      scope: "MODULE_ENABLE",
      entityType: "FEATURE_FLAG",
      entityId: input.moduleName,
      expectedState: { enabled: current?.enabled ?? false },
      proposedState: { enabled: true },
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

    const flag = await transaction.featureFlag.upsert({
      where: { moduleName: input.moduleName },
      create: { moduleName: input.moduleName, enabled: input.enabled, updatedById: actor.id },
      update: { enabled: input.enabled, updatedById: actor.id }
    });

    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: input.enabled ? "MODULE_ENABLED" : "MODULE_DISABLED",
        entityType: "FEATURE_FLAG",
        entityId: input.moduleName,
        payload: { reason: input.reason }
      }
    });

    return flag;
  });
}