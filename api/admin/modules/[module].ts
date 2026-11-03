import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Role } from "@prisma/client";
import { z } from "zod";
import { AuthorizationError, authenticateRequest } from "../../../src/auth/authorization.js";
import { ApprovalWorkflowError } from "../../../src/features/approvals.js";
import { moduleNameSchema, updateModule, updateModuleSchema } from "../../../src/features/modules.js";

export default async function updateModuleHandler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Cache-Control", "private, no-store");
  if (request.method !== "PUT") {
    response.setHeader("Allow", "PUT");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    const actor = await authenticateRequest(request);
    const moduleName = moduleNameSchema.safeParse(request.query.module);
    const body = updateModuleSchema.safeParse(request.body);
    if (!moduleName.success || !body.success) {
      return response.status(400).json({ error: "Invalid module name or request body." });
    }

    const result = await updateModule({
      actorSubject: actor.subject,
      actorRole: actor.role as Role,
      moduleName: moduleName.data,
      ...body.data
    });
    if ("approvalRequired" in result && result.approvalRequired) {
      return response.status(202).json({ approval: result.approval, approvalRequired: true });
    }
    return response.status(200).json({ module: result });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ApprovalWorkflowError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof z.ZodError) {
      return response.status(400).json({ error: "Invalid request." });
    }
    console.error("Unable to update feature flag", error);
    return response.status(500).json({ error: "Unable to update module." });
  }
}