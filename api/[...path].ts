import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveConsolidatedApiRoute } from "../src/server/consolidated-api-routes.js";

type ApiHandler = (request: VercelRequest, response: VercelResponse) => unknown | Promise<unknown>;

const handlerLoaders: Record<NonNullable<ReturnType<typeof resolveConsolidatedApiRoute>>, () => Promise<{ default: ApiHandler }>> = {
  "/api/health": () => import("../src/server/handlers/health.js"),
  "/api/ready": () => import("../src/server/handlers/ready.js"),
  "/api/auth/config": () => import("../src/server/handlers/auth-config.js"),
  "/api/grids": () => import("../src/server/handlers/grids.js"),
  "/api/modules": () => import("../src/server/handlers/modules.js"),
  "/api/operations/summary": () => import("../src/server/handlers/operations-summary.js"),
  "/api/customer/overview": () => import("../src/server/handlers/customer-overview.js"),
  "/api/admin/approvals": () => import("../src/server/handlers/admin-approvals.js"),
  "/api/admin/approvals/:approval": () => import("../src/server/handlers/admin-approval-decision.js"),
  "/api/tasks": () => import("../src/server/handlers/grid-tasks.js"),
  "/api/tasks/:task": () => import("../src/server/handlers/grid-task-update.js")
};

export default async function consolidatedApiHandler(request: VercelRequest, response: VercelResponse) {
  const pathname = new URL(request.url ?? "/", "https://cedars.invalid").pathname;
  const route = resolveConsolidatedApiRoute(pathname);
  if (!route) return response.status(404).json({ error: "API route not found." });

  const segments = pathname.replace(/\\/+$/, "").split("/");
  if (route === "/api/admin/approvals/:approval") {
    request.query = { ...request.query, approval: segments[4] };
  } else if (route === "/api/tasks/:task") {
    request.query = { ...request.query, task: segments[3] };
  }

  try {
    // Load only the requested handler. Database-backed modules initialize Prisma
    // during import, so eager imports would make even /api/health depend on a DB.
    const { default: handler } = await handlerLoaders[route]();
    return await handler(request, response);
  } catch (error) {
    console.error("Unable to initialize API route", { route, error });
    response.setHeader("Cache-Control", "no-store");
    return response.status(503).json({
      error: "API dependency unavailable.",
      route
    });
  }
}
