import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../src/db.js";
import { gridCatalog } from "../src/features/grid-catalog.js";
import { moduleNames } from "../src/features/module-catalog.js";
import { getRuntimeMode } from "../src/features/runtime-mode.js";
import { workerCatalog } from "../src/features/worker-catalog.js";

export default async function readyHandler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  response.setHeader("Cache-Control", "no-store");
  const runtimeMode = getRuntimeMode();
  const simulatorActive = runtimeMode === "SIMULATOR";
  const identityConfigured = Boolean(
    process.env.AUTH_JWKS_URL &&
    process.env.AUTH_ISSUER &&
    process.env.AUTH_AUDIENCE &&
    process.env.AUTH_CLIENT_ID &&
    process.env.AUTH_ROLE_CLAIM
  );

  try {
    await prisma.$queryRaw`SELECT 1`;
    let moduleConfigurationCount = 0;
    let workerConfigurationCount = 0;
    let configuredGridCount = 0;
    let moduleConfigurationStatus = "migration_required";
    let workerConfigurationStatus = "migration_required";
    let gridConfigurationStatus = "migration_required";
    try {
      [moduleConfigurationCount, workerConfigurationCount, configuredGridCount] = await Promise.all([
        prisma.featureFlag.count(),
        prisma.workerConfig.count(),
        prisma.gridConfig.count()
      ]);
      moduleConfigurationStatus = moduleConfigurationCount === moduleNames.length ? "configured" : "incomplete";
      workerConfigurationStatus = workerConfigurationCount === workerCatalog.length ? "configured" : "incomplete";
      gridConfigurationStatus = configuredGridCount === gridCatalog.length ? "configured" : "incomplete";
    } catch {
      moduleConfigurationStatus = "migration_required";
      workerConfigurationStatus = "migration_required";
      gridConfigurationStatus = "migration_required";
    }
    const controlPlanesConfigured = moduleConfigurationStatus === "configured" &&
      workerConfigurationStatus === "configured" &&
      gridConfigurationStatus === "configured";
    const ready = identityConfigured && controlPlanesConfigured;
    return response.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
      liveOperationsReady: false,
      runtimeMode: runtimeMode.toLowerCase(),
      observedAt: new Date().toISOString(),
      components: {
        api: "available",
        database: "connected",
        identity: identityConfigured ? "configured" : "not_configured",
        moduleControlPlane: moduleConfigurationStatus,
        workerControlPlane: workerConfigurationStatus,
        workerRuntime: simulatorActive ? "simulated" : "not_connected",
        gridControlPlane: gridConfigurationStatus,
        gridRuntime: simulatorActive ? "simulated" : "not_connected",
        gridIntegrations: simulatorActive ? "simulator" : "not_configured",
        financialExecution: "disabled"
      },
      modules: { configured: moduleConfigurationCount, expected: moduleNames.length },
      workers: { configured: workerConfigurationCount, expected: workerCatalog.length },
      grids: { configured: configuredGridCount, expected: gridCatalog.length }
    });
  } catch {
    return response.status(503).json({
      status: "not_ready",
      liveOperationsReady: false,
      runtimeMode: runtimeMode.toLowerCase(),
      observedAt: new Date().toISOString(),
      components: {
        api: "available",
        database: "unavailable",
        identity: identityConfigured ? "configured" : "not_configured",
        moduleControlPlane: "unavailable",
        workerControlPlane: "unavailable",
        workerRuntime: simulatorActive ? "simulated" : "not_connected",
        gridControlPlane: "unavailable",
        gridRuntime: simulatorActive ? "simulated" : "not_connected",
        gridIntegrations: simulatorActive ? "simulator" : "not_configured",
        financialExecution: "disabled"
      },
      modules: { configured: 0, expected: moduleNames.length },
      workers: { configured: 0, expected: workerCatalog.length },
      grids: { configured: 0, expected: gridCatalog.length }
    });
  }
}