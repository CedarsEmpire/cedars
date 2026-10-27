import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AuthorizationError, authenticateRequest } from "../../src/auth/authorization.js";
import { listModules } from "../../src/features/modules.js";

export default async function modulesHandler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    const actor = await authenticateRequest(request);
    const modules = await listModules();
    return response.status(200).json({ modules, actorRole: actor.role });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    console.error("Unable to list feature flags", error);
    return response.status(500).json({ error: "Unable to list modules." });
  }
}