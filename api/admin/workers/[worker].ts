import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { AuthorizationError, authenticateRequest } from "../../../src/auth/authorization.js";
import { updateWorker, updateWorkerSchema, workerIdSchema } from "../../../src/features/workers.js";

export default async function updateWorkerHandler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "PUT") {
    response.setHeader("Allow", "PUT");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    const actor = await authenticateRequest(request);
    const workerId = workerIdSchema.safeParse(request.query.worker);
    const body = updateWorkerSchema.safeParse(request.body);
    if (!workerId.success || !body.success) {
      return response.status(400).json({ error: "Invalid worker identifier or request body." });
    }

    const worker = await updateWorker({
      actorSubject: actor.subject,
      actorRole: actor.role,
      workerId: workerId.data,
      ...body.data
    });
    response.setHeader("Cache-Control", "private, no-store");
    return response.status(200).json({ worker });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof z.ZodError) {
      return response.status(400).json({ error: "Invalid request." });
    }
    console.error("Unable to update worker configuration", error);
    return response.status(500).json({ error: "Unable to update worker." });
  }
}
