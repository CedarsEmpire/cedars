import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AuthorizationError, authenticateRequest } from "../../src/auth/authorization.js";
import { listWorkers } from "../../src/features/workers.js";

export default async function workersHandler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    await authenticateRequest(request);
    response.setHeader("Cache-Control", "private, no-store");
    return response.status(200).json({ workers: await listWorkers() });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    console.error("Unable to list worker configurations", error);
    return response.status(500).json({ error: "Unable to list workers." });
  }
}
