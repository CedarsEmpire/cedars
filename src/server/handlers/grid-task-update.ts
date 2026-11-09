import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { AuthorizationError, authenticateRequest } from "../../auth/authorization.js";
import {
  GridTaskError,
  requireGridTaskAccess,
  updateGridTask,
  updateGridTaskSchema
} from "../../features/grid-tasks.js";

const taskIdSchema = z.string().uuid();

export default async function updateGridTaskHandler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "PUT") {
    response.setHeader("Allow", "PUT");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    const actor = await authenticateRequest(request);
    await requireGridTaskAccess(actor.subject);
    const taskId = taskIdSchema.safeParse(request.query.task);
    const update = updateGridTaskSchema.safeParse(request.body);
    if (!taskId.success || !update.success) {
      return response.status(400).json({ error: "Invalid grid task identifier or update." });
    }

    const task = await updateGridTask({
      actorSubject: actor.subject,
      actorRole: actor.role,
      taskId: taskId.data,
      update: update.data
    });
    response.setHeader("Cache-Control", "private, no-store");
    return response.status(200).json({ task, settlementMode: "NOT_CONNECTED", actorRole: actor.role });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof GridTaskError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof z.ZodError) return response.status(400).json({ error: "Invalid request." });
    console.error("Unable to update grid task", error);
    return response.status(503).json({ error: "Grid task service is temporarily unavailable." });
  }
}