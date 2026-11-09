import { Role } from "@prisma/client";
import { z } from "zod";
import { AuthorizationError } from "../auth/authorization.js";
import { prisma } from "../db.js";
import { canonicalGridLayerCounts, gridCatalog, type GridDesiredState } from "./grid-catalog.js";
import { requestControlApproval } from "./approvals.js";

export const controlScopeSchema = z.object({
  scopeType: z.enum(["GLOBAL_SOFTWARE", "ECONOMIC_LAYER"]),
  scopeId: z.string().min(1).max(100)
}).strict();

export const updateControlScopeSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().trim().min(8).max(500)
}).strict();

export const globalSoftwareScope = { scopeType: "GLOBAL_SOFTWARE", scopeId: "global" } as const;

export const economicLayers = Object.keys(canonicalGridLayerCounts) as Array<keyof typeof canonicalGridLayerCounts>;

export function assertControlScope(scopeType: string, scopeId: string) {
  const valid = scopeType === "GLOBAL_SOFTWARE"
    ? scopeId === "global"
    : scopeType === "ECONOMIC_LAYER" && economicLayers.includes(scopeId as keyof typeof canonicalGridLayerCounts);
  if (!valid) throw new Error("Control scope is not in the supported hierarchy.");
}

function scopeKey(scopeType: string, scopeId: string) {
  assertControlScope(scopeType, scopeId);
  return `${scopeType}:${scopeId}`;
}

export function parseControlScopeKey(value: string) {
  const separator = value.indexOf(":");
  if (separator < 1) throw new Error("Invalid control scope identifier.");
  const scopeType = value.slice(0, separator);
  const scopeId = value.slice(separator + 1);
  assertControlScope(scopeType, scopeId);
  return { scopeType, scopeId };
}

export async function getGlobalSoftwareEnabled() {
  return getScopeEnabled("GLOBAL_SOFTWARE", "global");
}

async function getScopeEnabled(scopeType: string, scopeId: string) {
  assertControlScope(scopeType, scopeId);
  const record = await prisma.controlScopeConfig.findUnique({
    where: { scopeType_scopeId: { scopeType, scopeId } }
  });
  return record?.enabled ?? false;
}

export async function listControlScopes() {
  const records = await prisma.controlScopeConfig.findMany();
  const byKey = new Map(records.map((record) => [scopeKey(record.scopeType, record.scopeId), record]));
  const scopes = [
    globalSoftwareScope,
    ...economicLayers.map((scopeId) => ({ scopeType: "ECONOMIC_LAYER" as const, scopeId }))
  ];
  return scopes.map((scope) => {
    const record = byKey.get(scopeKey(scope.scopeType, scope.scopeId));
    return {
      ...scope,
      enabled: record?.enabled ?? false,
      configured: Boolean(record),
      effectiveEnabled: scope.scopeType === "GLOBAL_SOFTWARE"
        ? (record?.enabled ?? false)
        : (record?.enabled ?? false) && (byKey.get(scopeKey("GLOBAL_SOFTWARE", "global"))?.enabled ?? false)
    };
  });
}

export async function getGridParentSnapshot(gridId: string) {
  const grid = gridCatalog.find((item) => item.id === gridId);
  if (!grid) throw new Error("Grid is not in the supported catalog.");
  const [globalRecord, layerRecord] = await Promise.all([
    prisma.controlScopeConfig.findUnique({
      where: { scopeType_scopeId: { scopeType: "GLOBAL_SOFTWARE", scopeId: "global" } }
    }),
    prisma.controlScopeConfig.findUnique({
      where: { scopeType_scopeId: { scopeType: "ECONOMIC_LAYER", scopeId: grid.layer } }
    })
  ]);
  return {
    globalEnabled: globalRecord?.enabled ?? false,
    layerEnabled: layerRecord?.enabled ?? false,
    globalControlVersion: globalRecord?.controlVersion ?? -1,
    layerControlVersion: layerRecord?.controlVersion ?? -1
  };
}

export async function evaluateGridControl(
  gridId: string,
  desiredState: GridDesiredState,
  authorization?: { globalVersion: number | null; layerVersion: number | null }
) {
  const grid = gridCatalog.find((item) => item.id === gridId);
  if (!grid) return { effectiveState: "BLOCKED" as const, blockReason: "UNKNOWN_GRID" };
  const [globalRecord, layerRecord] = await Promise.all([
    prisma.controlScopeConfig.findUnique({
      where: { scopeType_scopeId: { scopeType: "GLOBAL_SOFTWARE", scopeId: "global" } }
    }),
    prisma.controlScopeConfig.findUnique({
      where: { scopeType_scopeId: { scopeType: "ECONOMIC_LAYER", scopeId: grid.layer } }
    })
  ]);
  if (!globalRecord?.enabled) return { effectiveState: "BLOCKED" as const, blockReason: "GLOBAL_SOFTWARE_OFF" };
  if (!layerRecord?.enabled) return { effectiveState: "BLOCKED" as const, blockReason: "ECONOMIC_LAYER_OFF" };
  if (desiredState !== "WORKING") return { effectiveState: "BLOCKED" as const, blockReason: desiredState };
  if (!authorization || authorization.globalVersion === null || authorization.layerVersion === null) {
    return { effectiveState: "BLOCKED" as const, blockReason: "PARENT_AUTHORIZATION_REQUIRED" };
  }
  if (authorization.globalVersion !== globalRecord.controlVersion ||
      authorization.layerVersion !== layerRecord.controlVersion) {
    return { effectiveState: "BLOCKED" as const, blockReason: "PARENT_AUTHORIZATION_CHANGED" };
  }
  return { effectiveState: "ELIGIBLE" as const, blockReason: null };
}

export async function updateControlScope(input: {
  actorSubject: string;
  actorRole: Role;
  scopeType: "GLOBAL_SOFTWARE" | "ECONOMIC_LAYER";
  scopeId: string;
  enabled: boolean;
  reason: string;
}) {
  if (input.actorRole !== Role.FOUNDER && input.actorRole !== Role.SUPER_ADMIN) {
    throw new AuthorizationError(403, "Platform administrator role required.");
  }
  const id = scopeKey(input.scopeType, input.scopeId);
  const current = await prisma.controlScopeConfig.findUnique({
    where: { scopeType_scopeId: { scopeType: input.scopeType, scopeId: input.scopeId } }
  });
  const currentEnabled = current?.enabled ?? false;
  if (current && input.enabled === currentEnabled) return { ...current, unchanged: true };

  if (input.enabled && !currentEnabled) {
    const approval = await requestControlApproval({
      actorSubject: input.actorSubject,
      actorRole: input.actorRole,
      scope: input.scopeType === "GLOBAL_SOFTWARE" ? "GLOBAL_SOFTWARE_ENABLE" : "ECONOMIC_LAYER_ENABLE",
      entityType: "CONTROL_SCOPE_CONFIG",
      entityId: id,
      expectedState: { enabled: currentEnabled, controlVersion: current?.controlVersion ?? -1 },
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
    const config = await transaction.controlScopeConfig.upsert({
      where: { scopeType_scopeId: { scopeType: input.scopeType, scopeId: input.scopeId } },
      create: { scopeType: input.scopeType, scopeId: input.scopeId, enabled: input.enabled, updatedById: actor.id },
      update: { enabled: input.enabled, controlVersion: { increment: 1 }, updatedById: actor.id }
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: "CONTROL_SCOPE_DISABLED",
        entityType: "CONTROL_SCOPE_CONFIG",
        entityId: id,
        payload: { scopeType: input.scopeType, scopeId: input.scopeId, enabled: false, reason: input.reason }
      }
    });
    return { ...config, effectiveEnabled: false };
  });
}
