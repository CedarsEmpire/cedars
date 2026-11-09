import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Role } from "@prisma/client";
import { z } from "zod";
import { AuthorizationError, authenticateRequest } from "../../auth/authorization.js";
import {
  ApprovalWorkflowError,
  approvalDecisionSchema,
  decideApproval
} from "../../features/approvals.js";

const approvalIdSchema = z.string().uuid();

export default async function decideApprovalHandler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Cache-Control", "private, no-store");
  if (request.method !== "PUT") {
    response.setHeader("Allow", "PUT");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    const actor = await authenticateRequest(request);
    const approvalId = approvalIdSchema.safeParse(request.query.approval);
    const body = approvalDecisionSchema.safeParse(request.body);
    if (!approvalId.success || !body.success) {
      return response.status(400).json({ error: "Invalid approval identifier or decision." });
    }
    const result = await decideApproval({
      actorSubject: actor.subject,
      actorRole: actor.role as Role,
      requestId: approvalId.data,
      ...body.data
    });
    return response.status(200).json({ approval: result, actorRole: actor.role });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ApprovalWorkflowError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof z.ZodError) {
      return response.status(400).json({ error: "Invalid decision." });
    }
    console.error("Unable to record approval decision", error);
    return response.status(503).json({ error: "Approval decision could not be recorded." });
  }
}