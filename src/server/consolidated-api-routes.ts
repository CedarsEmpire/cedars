export const consolidatedApiRoutes = {
  "/api/health": "health",
  "/api/ready": "ready",
  "/api/auth/config": "authConfig",
  "/api/grids": "grids",
  "/api/modules": "modules",
  "/api/operations/summary": "operationsSummary",
  "/api/customer/overview": "customerOverview",
  "/api/admin/approvals": "adminApprovals",
  "/api/admin/approvals/:approval": "adminApprovalDecision",
  "/api/tasks": "gridTasks",
  "/api/tasks/:task": "gridTaskUpdate"
} as const;

export type ConsolidatedApiRoute = keyof typeof consolidatedApiRoutes;

export function resolveConsolidatedApiRoute(pathname: string): ConsolidatedApiRoute | undefined {
  const normalized = pathname.length > 1 ? pathname.replace(/\\/+$/, "") : pathname;
  if (Object.prototype.hasOwnProperty.call(consolidatedApiRoutes, normalized)) {
    return normalized as ConsolidatedApiRoute;
  }
  const segments = normalized.split("/");
  if (segments.length === 5 && segments[1] === "api" && segments[2] === "admin" &&
      segments[3] === "approvals" && segments[4].length > 0) return "/api/admin/approvals/:approval";
  if (segments.length === 4 && segments[1] === "api" && segments[2] === "tasks" &&
      segments[3].length > 0) return "/api/tasks/:task";
  return undefined;
}
