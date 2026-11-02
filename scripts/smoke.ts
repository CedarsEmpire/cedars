const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
let token = "";

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(init.method && init.method !== "GET" ? { "Content-Type": "application/json" } : {})
    }
  });

  const text = await response.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    // keep text as-is
  }

  return { status: response.status, ok: response.ok, body: json };
}

async function main() {
  const health = await request("/api/health");
  if (!health.ok || health.status !== 200) {
    throw new Error(`Health check failed: ${JSON.stringify(health)}`);
  }

  const authConfig = await request("/api/auth/config");
  if (!authConfig.ok || authConfig.status !== 200 ||
      typeof authConfig.body !== "object" || authConfig.body === null ||
      !("localDevelopment" in authConfig.body) || authConfig.body.localDevelopment !== true) {
    throw new Error(`Local auth configuration check failed: ${JSON.stringify(authConfig)}`);
  }

  const deniedLocalToken = await request("/api/auth/local-token", { method: "POST" });
  if (deniedLocalToken.status !== 403) {
    throw new Error(`Local sign-in origin check failed: ${deniedLocalToken.status}.`);
  }

  const localToken = await request("/api/auth/local-token", {
    method: "POST",
    headers: { Origin: new URL(baseUrl).origin }
  });
  if (!localToken.ok || localToken.status !== 200 ||
      typeof localToken.body !== "object" || localToken.body === null ||
      !("access_token" in localToken.body) || typeof localToken.body.access_token !== "string") {
    throw new Error(`Local sign-in check failed (${localToken.status}).`);
  }
  token = localToken.body.access_token;

  const modules = await request("/api/modules", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!modules.ok || modules.status !== 200) {
    throw new Error(`Modules check failed: ${JSON.stringify(modules)}`);
  }

  const workers = await request("/api/workers", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!workers.ok || workers.status !== 200 ||
      typeof workers.body !== "object" || workers.body === null ||
      !("workers" in workers.body) || !Array.isArray(workers.body.workers)) {
    throw new Error(`Workers check failed: ${JSON.stringify(workers)}`);
  }

  const grids = await request("/api/grids", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!grids.ok || grids.status !== 200 ||
      typeof grids.body !== "object" || grids.body === null ||
      !("grids" in grids.body) || !Array.isArray(grids.body.grids)) {
    throw new Error(`Grids check failed: ${JSON.stringify(grids)}`);
  }

  const readiness = await request("/api/ready");
  if (!readiness.ok || readiness.status !== 200 ||
      typeof readiness.body !== "object" || readiness.body === null ||
      !("status" in readiness.body) || readiness.body.status !== "ready") {
    throw new Error(`Readiness check failed: ${JSON.stringify(readiness)}`);
  }

  const summary = await request("/api/operations/summary", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!summary.ok || summary.status !== 200) {
    throw new Error(`Operations summary check failed: ${JSON.stringify(summary)}`);
  }

  const audit = await request("/api/admin/audit", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!audit.ok || audit.status !== 200) {
    throw new Error(`Audit check failed: ${JSON.stringify(audit)}`);
  }

  const treasury = await request("/api/admin/treasury", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!treasury.ok || treasury.status !== 200 ||
      typeof treasury.body !== "object" || treasury.body === null ||
      !("ledgerMode" in treasury.body) || treasury.body.ledgerMode !== "READ_ONLY_CHAIN_OBSERVATIONS" ||
      !("payableBalances" in treasury.body) || treasury.body.payableBalances !== false) {
    throw new Error(`Treasury observation check failed: ${JSON.stringify(treasury)}`);
  }

  const blocked = await request("/api/admin/modules/wallet", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ enabled: true, reason: "Smoke check block" })
  });
  if (blocked.status !== 403) {
    throw new Error(`Financial guardrail check failed: ${JSON.stringify(blocked)}`);
  }

  console.log("SMOKE_OK");
  console.log(JSON.stringify({
    health,
    authConfig: authConfig.status,
    localSignIn: localToken.status,
    modules: modules.status,
    workers: workers.status,
    grids: grids.status,
    readiness: readiness.status,
    summary: summary.status,
    audit: audit.status,
    treasury: treasury.status,
    blocked
  }, null, 2));
}

main().catch((error) => {
  console.error("SMOKE_FAIL");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
