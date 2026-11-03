import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { AuthorizationError, authenticateRequest } from "../../../src/auth/authorization.js";
import { ApprovalWorkflowError } from "../../../src/features/approvals.js";
import { gridIdSchema, updateGrid, updateGridSchema } from "../../../src/features/grids.js";

export default async function updateGridHandler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "PUT") {
    response.setHeader("Allow", "PUT");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    const actor = await authenticateRequest(request);
    const gridId = gridIdSchema.safeParse(request.query.grid);
    const body = updateGridSchema.safeParse(request.body);
    if (!gridId.success || !body.success) {
      return response.status(400).json({ error: "Invalid grid identifier or request body." });
    }

    const result = await updateGrid({
      actorSubject: actor.subject,
      actorRole: actor.role,
      gridId: gridId.data,
      ...body.data
    });
    response.setHeader("Cache-Control", "private, no-store");
    if ("approvalRequired" in result && result.approvalRequired) {
      return response.status(202).json({ approval: result.approval, approvalRequired: true });
    }
    return response.status(200).json({ grid: result });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ApprovalWorkflowError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof z.ZodError) {
      return response.status(400).json({ error: "Invalid request." });
    }
    console.error("Unable to update grid configuration", error);
    return response.status(500).json({ error: "Unable to update grid." });
  }
}