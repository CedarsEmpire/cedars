import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AuthorizationError, authenticateRequest, requirePlatformAdmin } from "../../../src/auth/authorization.js";
import { listControlScopes } from "../../../src/features/control-hierarchy.js";

export default async function controlScopesHandler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Cache-Control", "private, no-store");
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }
  try {
    const actor = await authenticateRequest(request);
    requirePlatformAdmin(actor.role);
    const scopes = await listControlScopes();
    return response.status(200).json({ scopes });
  } catch (error) {
    if (error instanceof AuthorizationError) return response.status(error.statusCode).json({ error: error.message });
    console.error("Unable to read control hierarchy", error);
    return response.status(503).json({ error: "Control hierarchy is temporarily unavailable." });
  }
}
