import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { AuthorizationError, authenticateRequest } from "../../src/auth/authorization.js";
import {
  createGridTask,
  createGridTaskSchema,
  listGridTasks,
  presentGridTask,
  requireGridTaskAccess
} from "../../src/features/grid-tasks.js";

export default async function gridTasksHandler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET" && request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    const actor = await authenticateRequest(request);
    await requireGridTaskAccess(actor.subject);
    if (request.method === "GET") {
      const tasks = await listGridTasks(actor.subject, actor.role);
      response.setHeader("Cache-Control", "private, no-store");
      return response.status(200).json({
        tasks: tasks.map(presentGridTask),
        settlementMode: "NOT_CONNECTED",
        actorRole: actor.role
      });
    }

    const parsed = createGridTaskSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: "Invalid grid task request." });
    const task = await createGridTask({
      actorSubject: actor.subject,
      actorRole: actor.role,
      task: parsed.data
    });
    response.setHeader("Cache-Control", "private, no-store");
    return response.status(201).json({ task, settlementMode: "NOT_CONNECTED", actorRole: actor.role });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof z.ZodError) return response.status(400).json({ error: "Invalid request." });
    console.error("Unable to load or create grid tasks", error);
    return response.status(503).json({ error: "Grid task service is temporarily unavailable." });
  }
}