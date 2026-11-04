import type { VercelRequest, VercelResponse } from "@vercel/node";
import healthHandler from "../src/server/handlers/health.js";
import readyHandler from "../src/server/handlers/ready.js";
import authConfigHandler from "../src/server/handlers/auth-config.js";
import gridsHandler from "../src/server/handlers/grids.js";
import modulesHandler from "../src/server/handlers/modules.js";
import operationsSummaryHandler from "../src/server/handlers/operations-summary.js";
import { resolveConsolidatedApiRoute } from "../src/server/consolidated-api-routes.js";

const handlers = {
  "/api/health": healthHandler,
  "/api/ready": readyHandler,
  "/api/auth/config": authConfigHandler,
  "/api/grids": gridsHandler,
  "/api/modules": modulesHandler,
  "/api/operations/summary": operationsSummaryHandler
};

export default async function consolidatedApiHandler(request: VercelRequest, response: VercelResponse) {
  const pathname = new URL(request.url ?? "/", "https://cedars.invalid").pathname;
  const route = resolveConsolidatedApiRoute(pathname);
  if (!route) return response.status(404).json({ error: "API route not found." });
  return handlers[route](request, response);
}