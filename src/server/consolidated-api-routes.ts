export const consolidatedApiRoutes = {
  "/api/health": "health",
  "/api/ready": "ready",
  "/api/auth/config": "authConfig",
  "/api/grids": "grids",
  "/api/modules": "modules",
  "/api/operations/summary": "operationsSummary",
  "/api/customer/overview": "customerOverview"
} as const;

export type ConsolidatedApiRoute = keyof typeof consolidatedApiRoutes;

export function resolveConsolidatedApiRoute(pathname: string): ConsolidatedApiRoute | undefined {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return Object.prototype.hasOwnProperty.call(consolidatedApiRoutes, normalized)
    ? normalized as ConsolidatedApiRoute
    : undefined;
}
