import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AuthorizationError, authenticateRequest } from "../../auth/authorization.js";
import { getOperationsSummary } from "../../features/modules.js";

export default async function operationsSummaryHandler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }
  try {
    const actor = await authenticateRequest(request);
    const summary = await getOperationsSummary();
    response.setHeader("Cache-Control", "private, no-store");
    return response.status(200).json({ ...summary, actorRole: actor.role });
  } catch (error) {
    if (error instanceof AuthorizationError) return response.status(error.statusCode).json({ error: error.message });
    console.error("Unable to load operations summary", error);
    return response.status(503).json({ error: "Operational data is temporarily unavailable." });
  }
}