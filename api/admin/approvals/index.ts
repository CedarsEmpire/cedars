import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Role } from "@prisma/client";
import { AuthorizationError, authenticateRequest } from "../../../src/auth/authorization.js";
import { listApprovalRequests, requireApprovalAccess } from "../../../src/features/approvals.js";

export default async function approvalsHandler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Cache-Control", "private, no-store");
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    const actor = await authenticateRequest(request);
    requireApprovalAccess(actor.role as Role);
    const approvals = await listApprovalRequests(actor.role as Role, actor.subject);
    return response.status(200).json({ approvals, actorRole: actor.role });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    console.error("Unable to load approval requests", error);
    return response.status(503).json({ error: "Approval queue is temporarily unavailable." });
  }
}