import { createServer } from "node:http";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { Role } from "@prisma/client";

process.env.CEDARS_USE_IN_MEMORY_DB = "1";
delete process.env.CEDARS_RUNTIME_MODE;
process.env.VERCEL_ENV = "development";
const [{ prisma }, { default: modulesHandler }, { default: updateModuleHandler }, { default: auditHandler }, { default: operationsSummaryHandler }, { default: readyHandler }, { default: workersHandler }, { default: updateWorkerHandler }, { default: gridsHandler }, { default: updateGridHandler }, { default: treasuryHandler }] = await Promise.all([
  import("../src/db.ts"),
  import("../api/modules/index.ts"),
  import("../api/admin/modules/[module].ts"),
  import("../api/admin/audit.ts"),
  import("../api/operations/summary.ts"),
  import("../api/ready.ts"),
  import("../api/workers/index.ts"),
  import("../api/admin/workers/[worker].ts"),
  import("../api/grids/index.ts"),
  import("../api/admin/grids/[grid].ts"),
  import("../api/admin/treasury.ts")
]);

const localRoleClaim = "https://cedars.local/cedars/role";
const issuer = "http://127.0.0.1";
const audience = "cedars-os-api";
const { publicKey, privateKey } = await generateKeyPair("RS256");
const publicJwk = await exportJWK(publicKey);
publicJwk.kid = "local-runtime-check";
publicJwk.use = "sig";
publicJwk.alg = "RS256";

const server = createServer((request, response) => {
  if (request.url === "/jwks.json") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ keys: [publicJwk] }));
    return;
  }
  response.writeHead(404);
  response.end("not found");
});
let serverListening = false;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function makeResponse() {
  return {
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    statusCode: 200,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    }
  };
}

function bearerHeaders(token: string) {
  return { authorization: ["Bearer", token].join(" ") };
}

async function createToken(role: string, subject: string) {
  return new SignJWT({ sub: subject, [localRoleClaim]: role })
    .setProtectedHeader({ alg: "RS256", kid: publicJwk.kid })
    .setIssuedAt()
    .setIssuer(process.env.AUTH_ISSUER)
    .setAudience(process.env.AUTH_AUDIENCE)
    .setExpirationTime("5m")
    .sign(privateKey);
}

async function main() {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address !== "string", "Local JWKS test server did not bind to a TCP port.");
  serverListening = true;
  const localIssuer = `${issuer}:${address.port}`;

  process.env.AUTH_JWKS_URL = `${localIssuer}/jwks.json`;
  process.env.AUTH_ISSUER = localIssuer;
  process.env.AUTH_AUDIENCE = audience;
  process.env.AUTH_CLIENT_ID = "local-runtime-check";
  process.env.AUTH_ROLE_CLAIM = localRoleClaim;

  const founderToken = await createToken(Role.FOUNDER, "runtime-check-founder");
  const modulesResponse = makeResponse();
  await modulesHandler({
    method: "GET",
    headers: { authorization: `Bearer ${founderToken}` }
  } as never, modulesResponse as never);

  assert(modulesResponse.statusCode === 200, `Authenticated module listing returned ${modulesResponse.statusCode}.`);
  assert(
    typeof modulesResponse.body === "object" &&
    modulesResponse.body !== null &&
    "actorRole" in modulesResponse.body &&
    modulesResponse.body.actorRole === Role.FOUNDER &&
    "modules" in modulesResponse.body &&
    Array.isArray(modulesResponse.body.modules) &&
    modulesResponse.body.modules.length > 0,
    "Authenticated module listing did not include a Founder role and module records."
  );
  console.log("PASS authenticated module listing");

  const unauthenticatedResponse = makeResponse();
  await modulesHandler({
    method: "GET",
    headers: {}
  } as never, unauthenticatedResponse as never);
  assert(unauthenticatedResponse.statusCode === 401, `Unauthenticated module listing returned ${unauthenticatedResponse.statusCode}, expected 401.`);
  console.log("PASS unauthenticated module listing denied");

  const invalidRoleToken = await createToken("OWNER", "runtime-check-invalid-role");
  const invalidRoleResponse = makeResponse();
  await modulesHandler({
    method: "GET",
    headers: { authorization: `Bearer ${invalidRoleToken}` }
  } as never, invalidRoleResponse as never);
  assert(invalidRoleResponse.statusCode === 403, `Invalid role claim returned ${invalidRoleResponse.statusCode}, expected 403.`);
  console.log("PASS invalid role claim denied");

  const updateResponse = makeResponse();
  await updateModuleHandler({
    method: "PUT",
    headers: { authorization: `Bearer ${founderToken}` },
    query: { module: "healthcare_ai" },
    body: { enabled: true, reason: "Runtime check policy validation" }
  } as never, updateResponse as never);
  assert(updateResponse.statusCode === 200, `Non-financial module update returned ${updateResponse.statusCode}.`);
  assert(
    typeof updateResponse.body === "object" &&
    updateResponse.body !== null &&
    "module" in updateResponse.body &&
    typeof updateResponse.body.module === "object" &&
    updateResponse.body.module !== null &&
    "enabled" in updateResponse.body.module &&
    updateResponse.body.module.enabled === true,
    "Non-financial module update did not return an enabled module record."
  );
  console.log("PASS authorized non-financial module update");

  const partnerToken = await createToken(Role.PARTNER, "runtime-check-partner");
  const deniedUpdateResponse = makeResponse();
  await updateModuleHandler({
    method: "PUT",
    headers: { authorization: `Bearer ${partnerToken}` },
    query: { module: "healthcare_ai" },
    body: { enabled: false, reason: "Partner role denial check" }
  } as never, deniedUpdateResponse as never);
  assert(deniedUpdateResponse.statusCode === 403, `Partner module update returned ${deniedUpdateResponse.statusCode}, expected 403.`);
  console.log("PASS partner module update denied");

  const invalidRequestResponse = makeResponse();
  await updateModuleHandler({
    method: "PUT",
    headers: { authorization: `Bearer ${founderToken}` },
    query: { module: "unlisted_module" },
    body: { enabled: false, reason: "Unknown module request" }
  } as never, invalidRequestResponse as never);
  assert(invalidRequestResponse.statusCode === 400, `Unknown module update returned ${invalidRequestResponse.statusCode}, expected 400.`);
  console.log("PASS unknown module request rejected");

  const invalidBodyResponse = makeResponse();
  await updateModuleHandler({
    method: "PUT",
    headers: { authorization: `Bearer ${founderToken}` },
    query: { module: "healthcare_ai" },
    body: { enabled: false, reason: "short", actorRole: "FOUNDER" }
  } as never, invalidBodyResponse as never);
  assert(invalidBodyResponse.statusCode === 400, `Invalid update body returned ${invalidBodyResponse.statusCode}, expected 400.`);
  console.log("PASS malformed update body rejected");

  const blockedResponse = makeResponse();
  await updateModuleHandler({
    method: "PUT",
    headers: { authorization: `Bearer ${founderToken}` },
    query: { module: "wallet" },
    body: { enabled: true, reason: "Dual approval is not configured" }
  } as never, blockedResponse as never);
  assert(blockedResponse.statusCode === 403, `Financial module guardrail returned ${blockedResponse.statusCode}, expected 403.`);
  assert(
    typeof blockedResponse.body === "object" &&
    blockedResponse.body !== null &&
    "error" in blockedResponse.body &&
    typeof blockedResponse.body.error === "string" &&
    blockedResponse.body.error.includes("dual-approval"),
    "Financial module guardrail did not explain the missing dual-approval workflow."
  );
  console.log("PASS financial activation blocked without dual approval");

  const workersResponse = makeResponse();
  await workersHandler({
    method: "GET",
    headers: bearerHeaders(founderToken)
  } as never, workersResponse as never);
  assert(workersResponse.statusCode === 200, `Authenticated worker listing returned ${workersResponse.statusCode}.`);
  assert(
    typeof workersResponse.body === "object" &&
    workersResponse.body !== null &&
    "workers" in workersResponse.body &&
    Array.isArray(workersResponse.body.workers) &&
    workersResponse.body.workers.some((worker) =>
      typeof worker === "object" &&
      worker !== null &&
      "id" in worker &&
      worker.id === "opportunity" &&
      "runtimeStatus" in worker &&
      worker.runtimeStatus === "NOT_CONNECTED"
    ),
    "Worker listing did not expose persisted configuration separately from runtime connection."
  );
  console.log("PASS authenticated worker configuration listing");

  const workerUpdateResponse = makeResponse();
  await updateWorkerHandler({
    method: "PUT",
    headers: bearerHeaders(founderToken),
    query: { worker: "opportunity" },
    body: { enabled: true, desiredInstances: 2, reason: "Configure opportunity pilot" }
  } as never, workerUpdateResponse as never);
  assert(workerUpdateResponse.statusCode === 200, `Worker configuration update returned ${workerUpdateResponse.statusCode}.`);
  assert(
    typeof workerUpdateResponse.body === "object" &&
    workerUpdateResponse.body !== null &&
    "worker" in workerUpdateResponse.body &&
    typeof workerUpdateResponse.body.worker === "object" &&
    workerUpdateResponse.body.worker !== null &&
    "enabled" in workerUpdateResponse.body.worker &&
    workerUpdateResponse.body.worker.enabled === true &&
    "desiredInstances" in workerUpdateResponse.body.worker &&
    workerUpdateResponse.body.worker.desiredInstances === 2 &&
    "runtimeStatus" in workerUpdateResponse.body.worker &&
    workerUpdateResponse.body.worker.runtimeStatus === "NOT_CONNECTED",
    "Worker configuration update did not persist desired settings without implying runtime execution."
  );
  console.log("PASS audited worker configuration update without runtime execution");

  const partnerWorkerUpdateResponse = makeResponse();
  await updateWorkerHandler({
    method: "PUT",
    headers: bearerHeaders(partnerToken),
    query: { worker: "opportunity" },
    body: { enabled: false, desiredInstances: 1, reason: "Partner denial validation" }
  } as never, partnerWorkerUpdateResponse as never);
  assert(partnerWorkerUpdateResponse.statusCode === 403, `Partner worker configuration returned ${partnerWorkerUpdateResponse.statusCode}, expected 403.`);
  console.log("PASS partner worker configuration denied");

  const invalidWorkerUpdateResponse = makeResponse();
  await updateWorkerHandler({
    method: "PUT",
    headers: bearerHeaders(founderToken),
    query: { worker: "unknown" },
    body: { enabled: true, desiredInstances: 99, reason: "Invalid worker request" }
  } as never, invalidWorkerUpdateResponse as never);
  assert(invalidWorkerUpdateResponse.statusCode === 400, `Invalid worker configuration returned ${invalidWorkerUpdateResponse.statusCode}, expected 400.`);
  console.log("PASS invalid worker configuration rejected");

  const gridsResponse = makeResponse();
  await gridsHandler({ method: "GET", headers: bearerHeaders(founderToken) } as never, gridsResponse as never);
  assert(gridsResponse.statusCode === 200, `Authenticated grid listing returned ${gridsResponse.statusCode}.`);
  assert(
    typeof gridsResponse.body === "object" &&
    gridsResponse.body !== null &&
    "grids" in gridsResponse.body &&
    Array.isArray(gridsResponse.body.grids) &&
    gridsResponse.body.grids.length === 34 &&
    gridsResponse.body.grids.every((grid) =>
      typeof grid === "object" && grid !== null &&
      "runtimeStatus" in grid && grid.runtimeStatus === "NOT_CONNECTED" &&
      "integrationStatus" in grid && grid.integrationStatus === "NOT_CONFIGURED" &&
      "dependsOn" in grid && Array.isArray(grid.dependsOn) &&
      grid.dependsOn.every((dependency) => gridsResponse.body !== null && "grids" in gridsResponse.body &&
        Array.isArray(gridsResponse.body.grids) && gridsResponse.body.grids.some((candidate) =>
          typeof candidate === "object" && candidate !== null && "id" in candidate && candidate.id === dependency
        ))
    ),
    "Grid listing did not include all grids with explicit disconnected runtime and integration states."
  );
  console.log("PASS authenticated grid listing reports all integrations disconnected");

  const unauthenticatedGridsResponse = makeResponse();
  await gridsHandler({ method: "GET", headers: {} } as never, unauthenticatedGridsResponse as never);
  assert(unauthenticatedGridsResponse.statusCode === 401, `Unauthenticated grid listing returned ${unauthenticatedGridsResponse.statusCode}, expected 401.`);
  console.log("PASS unauthenticated grid listing denied");

  const gridUpdateResponse = makeResponse();
  await updateGridHandler({
    method: "PUT",
    headers: bearerHeaders(founderToken),
    query: { grid: "internet" },
    body: { desiredState: "MAINTENANCE", reason: "Test a persisted desired state" }
  } as never, gridUpdateResponse as never);
  assert(gridUpdateResponse.statusCode === 200, `Grid desired-state update returned ${gridUpdateResponse.statusCode}.`);
  assert(
    typeof gridUpdateResponse.body === "object" && gridUpdateResponse.body !== null &&
    "grid" in gridUpdateResponse.body && typeof gridUpdateResponse.body.grid === "object" &&
    gridUpdateResponse.body.grid !== null && "desiredState" in gridUpdateResponse.body.grid &&
    gridUpdateResponse.body.grid.desiredState === "MAINTENANCE" &&
    "runtimeStatus" in gridUpdateResponse.body.grid && gridUpdateResponse.body.grid.runtimeStatus === "NOT_CONNECTED",
    "Grid update did not persist desired state separately from runtime status."
  );
  console.log("PASS audited grid desired-state update without runtime execution");

  const deniedGridUpdateResponse = makeResponse();
  await updateGridHandler({
    method: "PUT",
    headers: bearerHeaders(partnerToken),
    query: { grid: "internet" },
    body: { desiredState: "WORKING", reason: "Partner role denial check" }
  } as never, deniedGridUpdateResponse as never);
  assert(deniedGridUpdateResponse.statusCode === 403, `Partner grid update returned ${deniedGridUpdateResponse.statusCode}, expected 403.`);
  console.log("PASS partner grid configuration denied");

  const invalidGridUpdateResponse = makeResponse();
  await updateGridHandler({
    method: "PUT",
    headers: bearerHeaders(founderToken),
    query: { grid: "unknown" },
    body: { desiredState: "WORKING", reason: "Unknown grid denial check" }
  } as never, invalidGridUpdateResponse as never);
  assert(invalidGridUpdateResponse.statusCode === 400, `Unknown grid update returned ${invalidGridUpdateResponse.statusCode}, expected 400.`);
  console.log("PASS unknown grid configuration rejected");

  process.env.CEDARS_RUNTIME_MODE = "simulator";
  process.env.VERCEL_ENV = "preview";
  const simulatedWorkersResponse = makeResponse();
  await workersHandler({ method: "GET", headers: bearerHeaders(founderToken) } as never, simulatedWorkersResponse as never);
  assert(
    typeof simulatedWorkersResponse.body === "object" && simulatedWorkersResponse.body !== null &&
    "workers" in simulatedWorkersResponse.body && Array.isArray(simulatedWorkersResponse.body.workers) &&
    simulatedWorkersResponse.body.workers.some((worker) => typeof worker === "object" && worker !== null &&
      "id" in worker && worker.id === "opportunity" && "runtimeMode" in worker && worker.runtimeMode === "SIMULATOR" &&
      "runtimeStatus" in worker && worker.runtimeStatus === "SIMULATED_RUNNING"),
    "Preview simulator did not report the configured worker as simulated."
  );
  const simulatedWorkerUpdateResponse = makeResponse();
  await updateWorkerHandler({
    method: "PUT",
    headers: bearerHeaders(founderToken),
    query: { worker: "opportunity" },
    body: { enabled: false, desiredInstances: 2, reason: "Stop simulated opportunity worker" }
  } as never, simulatedWorkerUpdateResponse as never);
  assert(
    typeof simulatedWorkerUpdateResponse.body === "object" && simulatedWorkerUpdateResponse.body !== null &&
    "worker" in simulatedWorkerUpdateResponse.body && typeof simulatedWorkerUpdateResponse.body.worker === "object" &&
    simulatedWorkerUpdateResponse.body.worker !== null && "runtimeMode" in simulatedWorkerUpdateResponse.body.worker &&
    simulatedWorkerUpdateResponse.body.worker.runtimeMode === "SIMULATOR" &&
    "runtimeStatus" in simulatedWorkerUpdateResponse.body.worker &&
    simulatedWorkerUpdateResponse.body.worker.runtimeStatus === "SIMULATED_STOPPED",
    "Preview simulator did not report a stopped worker after the desired state changed."
  );

  const simulatedGridsResponse = makeResponse();
  await gridsHandler({ method: "GET", headers: bearerHeaders(founderToken) } as never, simulatedGridsResponse as never);
  assert(
    typeof simulatedGridsResponse.body === "object" && simulatedGridsResponse.body !== null &&
    "grids" in simulatedGridsResponse.body && Array.isArray(simulatedGridsResponse.body.grids) &&
    simulatedGridsResponse.body.grids.some((grid) => typeof grid === "object" && grid !== null &&
      "id" in grid && grid.id === "internet" && "runtimeMode" in grid && grid.runtimeMode === "SIMULATOR" &&
      "runtimeStatus" in grid && grid.runtimeStatus === "SIMULATED_MAINTENANCE" &&
      "integrationStatus" in grid && grid.integrationStatus === "SIMULATOR"),
    "Preview simulator did not report the configured grid state as simulated."
  );
  const simulatedGridUpdateResponse = makeResponse();
  await updateGridHandler({
    method: "PUT",
    headers: bearerHeaders(founderToken),
    query: { grid: "internet" },
    body: { desiredState: "WORKING", reason: "Start simulated internet grid" }
  } as never, simulatedGridUpdateResponse as never);
  assert(
    typeof simulatedGridUpdateResponse.body === "object" && simulatedGridUpdateResponse.body !== null &&
    "grid" in simulatedGridUpdateResponse.body && typeof simulatedGridUpdateResponse.body.grid === "object" &&
    simulatedGridUpdateResponse.body.grid !== null && "runtimeMode" in simulatedGridUpdateResponse.body.grid &&
    simulatedGridUpdateResponse.body.grid.runtimeMode === "SIMULATOR" &&
    "runtimeStatus" in simulatedGridUpdateResponse.body.grid &&
    simulatedGridUpdateResponse.body.grid.runtimeStatus === "SIMULATED_WORKING",
    "Preview simulator did not report the grid's simulated desired-state transition."
  );

  process.env.VERCEL_ENV = "production";
  const productionWorkersResponse = makeResponse();
  await workersHandler({ method: "GET", headers: bearerHeaders(founderToken) } as never, productionWorkersResponse as never);
  assert(
    typeof productionWorkersResponse.body === "object" && productionWorkersResponse.body !== null &&
    "workers" in productionWorkersResponse.body && Array.isArray(productionWorkersResponse.body.workers) &&
    productionWorkersResponse.body.workers.every((worker) => typeof worker === "object" && worker !== null &&
      "runtimeMode" in worker && worker.runtimeMode === "DISCONNECTED" &&
      "runtimeStatus" in worker && worker.runtimeStatus === "NOT_CONNECTED"),
    "Production environment incorrectly enabled the simulator."
  );
  const productionGridsResponse = makeResponse();
  await gridsHandler({ method: "GET", headers: bearerHeaders(founderToken) } as never, productionGridsResponse as never);
  assert(
    typeof productionGridsResponse.body === "object" && productionGridsResponse.body !== null &&
    "grids" in productionGridsResponse.body && Array.isArray(productionGridsResponse.body.grids) &&
    productionGridsResponse.body.grids.every((grid) => typeof grid === "object" && grid !== null &&
      "runtimeMode" in grid && grid.runtimeMode === "DISCONNECTED" &&
      "runtimeStatus" in grid && grid.runtimeStatus === "NOT_CONNECTED" &&
      "integrationStatus" in grid && grid.integrationStatus === "NOT_CONFIGURED"),
    "Production environment incorrectly enabled grid simulation."
  );
  process.env.VERCEL_ENV = "preview";
  console.log("PASS Preview simulator runs without enabling in Production");

  const auditResponse = makeResponse();
  await auditHandler({
    method: "GET",
    headers: { authorization: `Bearer ${founderToken}` }
  } as never, auditResponse as never);
  assert(auditResponse.statusCode === 200, `Governance audit request returned ${auditResponse.statusCode}.`);
  assert(
    typeof auditResponse.body === "object" &&
    auditResponse.body !== null &&
    "events" in auditResponse.body &&
    Array.isArray(auditResponse.body.events) &&
    auditResponse.body.events.some((event) =>
      typeof event === "object" &&
      event !== null &&
      "entityId" in event &&
      (event.entityId === "healthcare_ai" || event.entityId === "opportunity" || event.entityId === "internet")
    ),
    "Successful module or worker configuration update was not present in the governance audit response."
  );
  console.log("PASS module and worker changes appear in governance audit");

  const summaryResponse = makeResponse();
  await operationsSummaryHandler({
    method: "GET",
    headers: { authorization: `Bearer ${founderToken}` }
  } as never, summaryResponse as never);
  assert(summaryResponse.statusCode === 200, `Operations summary returned ${summaryResponse.statusCode}.`);
  assert(
    typeof summaryResponse.body === "object" &&
    summaryResponse.body !== null &&
    "modules" in summaryResponse.body &&
    typeof summaryResponse.body.modules === "object" &&
    summaryResponse.body.modules !== null &&
    "total" in summaryResponse.body.modules &&
    typeof summaryResponse.body.modules.total === "number" &&
    summaryResponse.body.modules.total > 0,
    "Operations summary did not return module counts."
  );
  console.log("PASS authenticated operations summary");

  const deniedSummaryResponse = makeResponse();
  await operationsSummaryHandler({ method: "GET", headers: {} } as never, deniedSummaryResponse as never);
  assert(deniedSummaryResponse.statusCode === 401, `Unauthenticated operations summary returned ${deniedSummaryResponse.statusCode}, expected 401.`);
  console.log("PASS unauthenticated operations summary denied");

  const treasuryResponse = makeResponse();
  await treasuryHandler({ method: "GET", headers: bearerHeaders(founderToken) } as never, treasuryResponse as never);
  assert(treasuryResponse.statusCode === 200, `Authorized treasury observation listing returned ${treasuryResponse.statusCode}.`);
  assert(
    typeof treasuryResponse.body === "object" &&
    treasuryResponse.body !== null &&
    "ledgerMode" in treasuryResponse.body &&
    treasuryResponse.body.ledgerMode === "READ_ONLY_CHAIN_OBSERVATIONS" &&
    "payableBalances" in treasuryResponse.body &&
    treasuryResponse.body.payableBalances === false &&
    "monitoring" in treasuryResponse.body &&
    Array.isArray(treasuryResponse.body.monitoring),
    "Treasury listing did not report read-only observations separately from payable balances."
  );
  const deniedTreasuryResponse = makeResponse();
  await treasuryHandler({ method: "GET", headers: bearerHeaders(partnerToken) } as never, deniedTreasuryResponse as never);
  assert(deniedTreasuryResponse.statusCode === 403, `Partner treasury listing returned ${deniedTreasuryResponse.statusCode}, expected 403.`);
  console.log("PASS restricted read-only treasury observation access");

  const readyResponse = makeResponse();
  await readyHandler({ method: "GET" } as never, readyResponse as never);
  assert(readyResponse.statusCode === 200, `Configured readiness check returned ${readyResponse.statusCode}.`);
  assert(
    typeof readyResponse.body === "object" && readyResponse.body !== null &&
    "liveOperationsReady" in readyResponse.body && readyResponse.body.liveOperationsReady === false &&
    "runtimeMode" in readyResponse.body && readyResponse.body.runtimeMode === "simulator" &&
    "components" in readyResponse.body && typeof readyResponse.body.components === "object" && readyResponse.body.components !== null &&
    "gridControlPlane" in readyResponse.body.components && readyResponse.body.components.gridControlPlane === "configured" &&
    "workerRuntime" in readyResponse.body.components && readyResponse.body.components.workerRuntime === "simulated" &&
    "gridRuntime" in readyResponse.body.components && readyResponse.body.components.gridRuntime === "simulated" &&
    "gridIntegrations" in readyResponse.body.components && readyResponse.body.components.gridIntegrations === "simulator" &&
    "financialExecution" in readyResponse.body.components && readyResponse.body.components.financialExecution === "disabled" &&
    "grids" in readyResponse.body && typeof readyResponse.body.grids === "object" && readyResponse.body.grids !== null &&
    "configured" in readyResponse.body.grids && readyResponse.body.grids.configured === 34 &&
    "expected" in readyResponse.body.grids && readyResponse.body.grids.expected === 34,
    "Readiness did not report seeded grid control-plane state separately from disconnected integrations."
  );
  console.log("PASS control-plane readiness is distinct from live operations readiness");

  console.log("Runtime checks passed using an in-memory database; no configured database was modified.");
}

try {
  await main();
} finally {
  if (serverListening) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  await prisma.$disconnect();
}
