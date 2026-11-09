import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { AuthorizationError, authenticateRequest } from "../../../src/auth/authorization.js";
import { ApprovalWorkflowError } from "../../../src/features/approvals.js";
import { updateControlScope, updateControlScopeSchema } from "../../../src/features/control-hierarchy.js";

const scopes = {
  "global-software": { scopeType: "GLOBAL_SOFTWARE", scopeId: "global" },
  "cedars-cloud": { scopeType: "ECONOMIC_LAYER", scopeId: "CEDARS CLOUD" },
  "cedars-underground": { scopeType: "ECONOMIC_LAYER", scopeId: "CEDARS UNDERGROUND" },
  "cedars-earth": { scopeType: "ECONOMIC_LAYER", scopeId: "CEDARS EARTH" },
  "cedars-human-activities": { scopeType: "ECONOMIC_LAYER", scopeId: "CEDARS HUMAN ACTIVITIES" }
} as const;

const scopeSchema = z.enum([
  "global-software",
  "cedars-cloud",
  "cedars-underground",
  "cedars-earth",
  "cedars-human-activities"
]);

export default async function updateControlScopeHandler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Cache-Control", "private, no-store");
  if (request.method !== "PUT") {
    response.setHeader("Allow", "PUT");
    return response.status(405).json({ error: "Method not allowed." });
  }
  try {
    const actor = await authenticateRequest(request);
    const scope = scopeSchema.safeParse(request.query.scope);
    const body = updateControlScopeSchema.safeParse(request.body);
    if (!scope.success || !body.success) {
      return response.status(400).json({ error: "Invalid control scope or request body." });
    }
    const result = await updateControlScope({
      actorSubject: actor.subject,
      actorRole: actor.role,
      ...scopes[scope.data],
      ...body.data
    });
    if ("approvalRequired" in result && result.approvalRequired) {
      return response.status(202).json({ approval: result.approval, approvalRequired: true });
    }
    return response.status(200).json({ controlScope: result });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ApprovalWorkflowError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof z.ZodError) return response.status(400).json({ error: "Invalid request." });
    console.error("Unable to update control scope", error);
    return response.status(503).json({ error: "Control scope update is temporarily unavailable." });
  }
}
