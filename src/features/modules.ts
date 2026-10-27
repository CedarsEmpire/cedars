import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db.js";
import { AuthorizationError } from "../auth/authorization.js";

export const moduleNames = [
  "money_grid",
  "wallet",
  "ledger",
  "ai_iq",
  "sales_ai",
  "opportunity_ai",
  "support_ai",
  "healthcare_ai",
  "education_ai",
  "contribution_grid",
  "collective_memory",
  "civilization_ledger",
  "innovation_dome",
  "simulation_grid",
  "ai_twins",
  "synthetic_reality",
  "blockchain_trust",
  "collective_intelligence",
  "admin_control_center"
] as const;

export const moduleNameSchema = z.enum(moduleNames);
export const updateModuleSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().trim().min(8).max(500)
}).strict();

const financialModules = new Set(["money_grid", "wallet", "ledger"]);

export function assertModuleUpdateAllowed(role: Role, moduleName: string, enabled: boolean) {
  if (role !== Role.FOUNDER && role !== Role.SUPER_ADMIN) {
    throw new AuthorizationError(403, "Platform administrator role required.");
  }
  if (enabled && financialModules.has(moduleName)) {
    throw new AuthorizationError(403, "Financial module activation requires a dual-approval workflow, which is not configured.");
  }
}

export async function listModules() {
  const flags = await prisma.featureFlag.findMany({ orderBy: { moduleName: "asc" } });
  return flags;
}

export async function updateModule(input: {
  actorSubject: string;
  actorRole: Role;
  moduleName: string;
  enabled: boolean;
  reason: string;
}) {
  assertModuleUpdateAllowed(input.actorRole, input.moduleName, input.enabled);

  return prisma.$transaction(async (transaction) => {
    const actor = await transaction.user.upsert({
      where: { externalSubject: input.actorSubject },
      create: { externalSubject: input.actorSubject, role: input.actorRole },
      update: { role: input.actorRole }
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