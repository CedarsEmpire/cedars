import { ApprovalDecisionType, ApprovalStatus, Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { AuthorizationError } from "../auth/authorization.js";
import { prisma } from "../db.js";
import { gridCatalog } from "./grid-catalog.js";

export const approvalDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().min(8).max(500)
}).strict();

const controlRoles = new Set<Role>([Role.FOUNDER, Role.SUPER_ADMIN]);
const reviewerRoles = new Set<Role>([
  Role.FOUNDER,
  Role.SUPER_ADMIN,
  Role.FINANCE_ADMIN,
  Role.COMPLIANCE_OFFICER
]);

export class ApprovalWorkflowError extends Error {
  constructor(public readonly statusCode: 403 | 404 | 409, message: string) {
    super(message);
    this.name = "ApprovalWorkflowError";
  }
}

export function requireApprovalAccess(role: Role) {
  if (!reviewerRoles.has(role)) {
    throw new AuthorizationError(403, "Approval queue access is restricted to authorized governance and financial reviewers.");
  }
}

function requiredControlRoles(requesterRole: Role): Role[] {
  if (!controlRoles.has(requesterRole)) {
    throw new AuthorizationError(403, "Platform administrator role required to request a control change.");
  }
  return [requesterRole === Role.FOUNDER ? Role.SUPER_ADMIN : Role.FOUNDER];
}

export async function listApprovalRequests(role: Role, actorSubject: string) {
  requireApprovalAccess(role);
  const [actor, requests] = await Promise.all([
    prisma.user.findUnique({ where: { externalSubject: actorSubject } }),
    prisma.approvalRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { decisions: true }
    })
  ]);
  return requests.map((request) => ({
    id: request.id,
    scope: request.scope,
    entityType: request.entityType,
    entityId: request.entityId,
    expectedState: request.expectedState,
    proposedState: request.proposedState,
    requiredApproverRoles: request.requiredApproverRoles,
    reason: request.reason,
    status: request.status,
    requestedByRole: request.requestedByRole,
    requesterIsActor: actor?.id === request.requestedById,
    createdAt: request.createdAt,
    resolvedAt: request.resolvedAt,
    decisions: request.decisions.map((decision) => ({
      reviewerRole: decision.reviewerRole,
      decision: decision.decision,
      reason: decision.reason,
      createdAt: decision.createdAt
    }))
  }));
}

export async function requestControlApproval(input: {
  actorSubject: string;
  actorRole: Role;
  scope: string;
  entityType: "FEATURE_FLAG" | "WORKER_CONFIG" | "GRID_CONFIG" | "CONTROL_SCOPE_CONFIG";
  entityId: string;
  expectedState: Record<string, string | number | boolean>;
  proposedState: Record<string, string | number | boolean>;
  reason: string;
}) {
  const requiredApproverRoles = requiredControlRoles(input.actorRole);
  try {
    return await prisma.$transaction(async (transaction) => {
    const pending = await transaction.approvalRequest.findMany({
      where: {
        status: ApprovalStatus.PENDING,
        entityType: input.entityType,
        entityId: input.entityId
      }
    });
    if (pending.length > 0) {
      throw new ApprovalWorkflowError(409, "A control change for this item is already pending review.");
    }

    const actor = await transaction.user.upsert({
      where: { externalSubject: input.actorSubject },
      create: { externalSubject: input.actorSubject, role: input.actorRole },
      update: {}
    });
    const request = await transaction.approvalRequest.create({
      data: {
        scope: input.scope,
        entityType: input.entityType,
        entityId: input.entityId,
        expectedState: input.expectedState,
        proposedState: input.proposedState,
        requiredApproverRoles,
        reason: input.reason,
        requestedById: actor.id,
        requestedByRole: input.actorRole
      }
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: "CONTROL_CHANGE_REQUESTED",
        entityType: "APPROVAL_REQUEST",
        entityId: request.id,
        payload: {
          scope: input.scope,
          targetType: input.entityType,
          targetId: input.entityId,
          expectedState: input.expectedState,
          proposedState: input.proposedState,
          requiredApproverRoles,
          reason: input.reason
        }
      }
    });
    return request;
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new ApprovalWorkflowError(409, "A control change for this item is already pending review.");
    }
    throw error;
  }
}

async function getCurrentState(
  transaction: Prisma.TransactionClient,
  request: { entityType: string; entityId: string }
): Promise<Record<string, string | number | boolean> | null> {
  if (request.entityType === "FEATURE_FLAG") {
    const flag = await transaction.featureFlag.findUnique({ where: { moduleName: request.entityId } });
    return { enabled: flag?.enabled ?? false };
  }
  if (request.entityType === "WORKER_CONFIG") {
    const worker = await transaction.workerConfig.findUnique({ where: { id: request.entityId } });
    return { enabled: worker?.enabled ?? false, desiredInstances: worker?.desiredInstances ?? 1 };
  }
  if (request.entityType === "GRID_CONFIG") {
    const grid = await transaction.gridConfig.findUnique({ where: { id: request.entityId } });
    const catalogEntry = gridCatalog.find((item) => item.id === request.entityId);
    if (!catalogEntry) return null;
    const [globalControl, layerControl] = await Promise.all([
      transaction.controlScopeConfig.findUnique({
        where: { scopeType_scopeId: { scopeType: "GLOBAL_SOFTWARE", scopeId: "global" } }
      }),
      transaction.controlScopeConfig.findUnique({
        where: { scopeType_scopeId: { scopeType: "ECONOMIC_LAYER", scopeId: catalogEntry.layer } }
      })
    ]);
    return {
      desiredState: grid?.desiredState ?? "STANDBY",
      gridAuthorizationGlobalVersion: grid?.authorizedGlobalControlVersion ?? -1,
      gridAuthorizationLayerVersion: grid?.authorizedLayerControlVersion ?? -1,
      globalEnabled: globalControl?.enabled ?? false,
      layerEnabled: layerControl?.enabled ?? false,
      globalControlVersion: globalControl?.controlVersion ?? -1,
      layerControlVersion: layerControl?.controlVersion ?? -1
    };
  }
  if (request.entityType === "CONTROL_SCOPE_CONFIG") {
    const separator = request.entityId.indexOf(":");
    if (separator < 1) return null;
    const scopeType = request.entityId.slice(0, separator);
    const scopeId = request.entityId.slice(separator + 1);
    if (!((scopeType === "GLOBAL_SOFTWARE" && scopeId === "global") ||
      (scopeType === "ECONOMIC_LAYER" && ["CEDARS CLOUD", "CEDARS UNDERGROUND", "CEDARS EARTH", "CEDARS HUMAN ACTIVITIES"].includes(scopeId)))) return null;
    const config = await transaction.controlScopeConfig.findUnique({
      where: { scopeType_scopeId: { scopeType, scopeId } }
    });
    return { enabled: config?.enabled ?? false, controlVersion: config?.controlVersion ?? -1 };
  }
  return null;
}

function statesMatch(expected: Prisma.JsonValue, current: Record<string, string | number | boolean> | null) {
  if (!current || typeof expected !== "object" || expected === null || Array.isArray(expected)) return false;
  const expectedEntries = Object.entries(expected);
  return expectedEntries.length === Object.keys(current).length &&
    expectedEntries.every(([key, value]) => current[key] === value);
}

async function applyProposedState(
  transaction: Prisma.TransactionClient,
  request: { entityType: string; entityId: string; proposedState: Prisma.JsonValue },
  actorId: string
) {
  if (typeof request.proposedState !== "object" || request.proposedState === null || Array.isArray(request.proposedState)) {
    throw new ApprovalWorkflowError(409, "Approval request contains an invalid proposed state.");
  }
  const proposed = request.proposedState as Record<string, unknown>;
  if (request.entityType === "FEATURE_FLAG" && typeof proposed.enabled === "boolean") {
    await transaction.featureFlag.upsert({
      where: { moduleName: request.entityId },
      create: { moduleName: request.entityId, enabled: proposed.enabled, updatedById: actorId },
      update: { enabled: proposed.enabled, updatedById: actorId }
    });
    return;
  }
  if (request.entityType === "WORKER_CONFIG" && typeof proposed.enabled === "boolean" &&
      typeof proposed.desiredInstances === "number") {
    await transaction.workerConfig.upsert({
      where: { id: request.entityId },
      create: {
        id: request.entityId,
        enabled: proposed.enabled,
        desiredInstances: proposed.desiredInstances,
        updatedById: actorId
      },
      update: {
        enabled: proposed.enabled,
        desiredInstances: proposed.desiredInstances,
        updatedById: actorId
      }
    });
    return;
  }
  if (request.entityType === "GRID_CONFIG" &&
      (proposed.desiredState === "STANDBY" || proposed.desiredState === "WORKING" || proposed.desiredState === "MAINTENANCE")) {
    const catalogEntry = gridCatalog.find((item) => item.id === request.entityId);
    if (!catalogEntry) throw new ApprovalWorkflowError(409, "Grid target is not in the canonical catalogue.");
    const [globalControl, layerControl] = await Promise.all([
      transaction.controlScopeConfig.findUnique({
        where: { scopeType_scopeId: { scopeType: "GLOBAL_SOFTWARE", scopeId: "global" } }
      }),
      transaction.controlScopeConfig.findUnique({
        where: { scopeType_scopeId: { scopeType: "ECONOMIC_LAYER", scopeId: catalogEntry.layer } }
      })
    ]);
    await transaction.gridConfig.upsert({
      where: { id: request.entityId },
      create: {
        id: request.entityId,
        desiredState: proposed.desiredState,
        authorizedGlobalControlVersion: globalControl?.controlVersion ?? -1,
        authorizedLayerControlVersion: layerControl?.controlVersion ?? -1,
        updatedById: actorId
      },
      update: {
        desiredState: proposed.desiredState,
        authorizedGlobalControlVersion: globalControl?.controlVersion ?? -1,
        authorizedLayerControlVersion: layerControl?.controlVersion ?? -1,
        updatedById: actorId
      }
    });
    return;
  }
  if (request.entityType === "CONTROL_SCOPE_CONFIG" && typeof proposed.enabled === "boolean") {
    const separator = request.entityId.indexOf(":");
    if (separator < 1) throw new ApprovalWorkflowError(409, "Invalid control scope target.");
    const scopeType = request.entityId.slice(0, separator);
    const scopeId = request.entityId.slice(separator + 1);
    const validScope = (scopeType === "GLOBAL_SOFTWARE" && scopeId === "global") ||
      (scopeType === "ECONOMIC_LAYER" && ["CEDARS CLOUD", "CEDARS UNDERGROUND", "CEDARS EARTH", "CEDARS HUMAN ACTIVITIES"].includes(scopeId));
    if (!validScope) throw new ApprovalWorkflowError(409, "Control scope target is not in the canonical hierarchy.");
    await transaction.controlScopeConfig.upsert({
      where: { scopeType_scopeId: { scopeType, scopeId } },
      create: { scopeType, scopeId, enabled: proposed.enabled, updatedById: actorId },
      update: { enabled: proposed.enabled, controlVersion: { increment: 1 }, updatedById: actorId }
    });
    return;
  }
  throw new ApprovalWorkflowError(409, "Approval request target or proposed state is not supported.");
}

export async function decideApproval(input: {
  actorSubject: string;
  actorRole: Role;
  requestId: string;
  decision: z.infer<typeof approvalDecisionSchema>["decision"];
  reason: string;
}) {
  requireApprovalAccess(input.actorRole);
  return prisma.$transaction(async (transaction) => {
    const request = await transaction.approvalRequest.findUnique({
      where: { id: input.requestId },
      include: { decisions: true }
    });
    if (!request) throw new ApprovalWorkflowError(404, "Approval request not found.");
    if (request.status !== ApprovalStatus.PENDING) {
      throw new ApprovalWorkflowError(409, "Approval request is no longer pending.");
    }

    const actor = await transaction.user.upsert({
      where: { externalSubject: input.actorSubject },
      create: { externalSubject: input.actorSubject, role: input.actorRole },
      update: {}
    });
    if (actor.id === request.requestedById) {
      throw new ApprovalWorkflowError(403, "The requester cannot approve or reject their own change.");
    }
    if (!request.requiredApproverRoles.includes(input.actorRole)) {
      throw new ApprovalWorkflowError(403, "Your role is not required for this approval request.");
    }
    if (request.decisions.some((decision) => decision.reviewerId === actor.id)) {
      throw new ApprovalWorkflowError(409, "You have already decided this approval request.");
    }

    await transaction.approvalDecision.create({
      data: {
        requestId: request.id,
        reviewerId: actor.id,
        reviewerRole: input.actorRole,
        decision: ApprovalDecisionType[input.decision],
        reason: input.reason
      }
    });

    let status: ApprovalStatus = ApprovalStatus.PENDING;
    let applied = false;
    let stale = false;
    if (input.decision === "REJECT") {
      status = ApprovalStatus.REJECTED;
    } else {
      const approvedRoles = new Set([
        ...request.decisions
          .filter((decision) => decision.decision === ApprovalDecisionType.APPROVE)
          .map((decision) => decision.reviewerRole),
        input.actorRole
      ]);
      if (request.requiredApproverRoles.every((role) => approvedRoles.has(role))) {
        const currentState = await getCurrentState(transaction, request);
        if (!statesMatch(request.expectedState, currentState)) {
          status = ApprovalStatus.REJECTED;
          stale = true;
        } else {
          await applyProposedState(transaction, request, actor.id);
          status = ApprovalStatus.APPROVED;
          applied = true;
        }
      }
    }

    const update = await transaction.approvalRequest.updateMany({
      where: { id: request.id, status: ApprovalStatus.PENDING, version: request.version },
      data: {
        status,
        version: request.version + 1,
        resolvedAt: status === ApprovalStatus.PENDING ? null : new Date()
      }
    });
    if (update.count !== 1) throw new ApprovalWorkflowError(409, "Approval request changed concurrently; reload and review it again.");

    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: stale ? "APPROVAL_STALE_REJECTED" : `APPROVAL_${input.decision}`,
        entityType: "APPROVAL_REQUEST",
        entityId: request.id,
        payload: { targetType: request.entityType, targetId: request.entityId, role: input.actorRole, reason: input.reason }
      }
    });
    if (applied) {
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "CONTROL_CHANGE_APPLIED",
          entityType: request.entityType,
          entityId: request.entityId,
          payload: { scope: request.scope, proposedState: request.proposedState, approvalRequestId: request.id }
        }
      });
    }
    return { requestId: request.id, status, applied, stale };
  });
}