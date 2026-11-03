import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { Role } from "@prisma/client";

import healthHandler from "../api/health.ts";
import readyHandler from "../api/ready.ts";
import authConfigHandler from "../api/auth/config.ts";
import modulesHandler from "../api/modules/index.ts";
import workersHandler from "../api/workers/index.ts";
import gridTasksHandler from "../api/tasks/index.ts";
import updateGridTaskHandler from "../api/tasks/[task].ts";
import updateWorkerHandler from "../api/admin/workers/[worker].ts";
import gridsHandler from "../api/grids/index.ts";
import updateGridHandler from "../api/admin/grids/[grid].ts";
import auditHandler from "../api/admin/audit.ts";
import updateModuleHandler from "../api/admin/modules/[module].ts";
import approvalsHandler from "../api/admin/approvals/index.ts";
import decideApprovalHandler from "../api/admin/approvals/[approval].ts";
import operationsSummaryHandler from "../api/operations/summary.ts";
import treasuryHandler from "../api/admin/treasury.ts";
import { prisma } from "../src/db.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const port = Number(process.env.PORT ?? 3000);
const identityPort = 4010;
const issuer = `http://127.0.0.1:${identityPort}`;
const audience = "cedars-os-api";
const clientId = "cedars-local-dev";
const localRoleClaim = "https://cedars.local/cedars/role";

const { publicKey, privateKey } = await generateKeyPair("RS256");
const publicJwk = await exportJWK(publicKey);
publicJwk.kid = "local-dev-kid";
publicJwk.use = "sig";
publicJwk.alg = "RS256";

const localSubject = "local-dev-founder";
const localApproverSubject = "local-dev-super-admin";
await prisma.user.upsert({
  where: { externalSubject: localSubject },
  create: { externalSubject: localSubject, role: Role.FOUNDER },
  update: { role: Role.FOUNDER }
});
await prisma.user.upsert({
  where: { externalSubject: localApproverSubject },
  create: { externalSubject: localApproverSubject, role: Role.SUPER_ADMIN },
  update: { role: Role.SUPER_ADMIN }
});

const localToken = await new SignJWT({ sub: localSubject, [localRoleClaim]: Role.FOUNDER })
  .setProtectedHeader({ alg: "RS256", kid: "local-dev-kid" })
  .setIssuedAt()
  .setIssuer(issuer)
  .setAudience(audience)
  .setExpirationTime("1h")
  .sign(privateKey);
const localApproverToken = await new SignJWT({ sub: localApproverSubject, [localRoleClaim]: Role.SUPER_ADMIN })
  .setProtectedHeader({ alg: "RS256", kid: "local-dev-kid" })
  .setIssuedAt()
  .setIssuer(issuer)
  .setAudience(audience)
  .setExpirationTime("1h")
  .sign(privateKey);

process.env.AUTH_JWKS_URL = `${issuer}/jwks.json`;
process.env.AUTH_ISSUER = issuer;
process.env.AUTH_AUDIENCE = audience;
process.env.AUTH_CLIENT_ID = clientId;
process.env.AUTH_ROLE_CLAIM = localRoleClaim;

const identityServer = http.createServer((request, response) => {
  if (request.url === "/jwks.json") {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ keys: [publicJwk] }));
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: "Not found." }));
});

identityServer.listen(identityPort, "127.0.0.1", () => {
  console.log(`CEDARS local identity server running at ${issuer}`);
});

function createResponse(serverResponse: http.ServerResponse) {
  return {
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
    } as Record<string, string>,
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
      this.headers["Content-Type"] = "application/json; charset=utf-8";
      const body = JSON.stringify(payload);
      serverResponse.writeHead(this.statusCode, this.headers);
      serverResponse.end(body);
      return this;
    }
  };
}

async function readJsonBody(request: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) return {};

  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function matchRoute(pathname: string, requestMethod: string) {
  const routes = [
    { method: "GET", pattern: /^\/api\/health$/ },
    { method: "GET", pattern: /^\/api\/auth\/config$/ },
    { method: "POST", pattern: /^\/api\/auth\/local-token$/ },
    { method: "POST", pattern: /^\/api\/auth\/local-approver-token$/ },
    { method: "GET", pattern: /^\/api\/modules$/ },
    { method: "GET", pattern: /^\/api\/workers$/ },
    { method: "GET", pattern: /^\/api\/grids$/ },
    { method: "GET", pattern: /^\/api\/tasks$/ },
    { method: "POST", pattern: /^\/api\/tasks$/ },
    { method: "PUT", pattern: /^\/api\/tasks\/([^/]+)$/ },
    { method: "GET", pattern: /^\/api\/operations\/summary$/ },
    { method: "GET", pattern: /^\/api\/ready$/ },
    { method: "GET", pattern: /^\/api\/admin\/audit$/ },
    { method: "GET", pattern: /^\/api\/admin\/approvals$/ },
    { method: "PUT", pattern: /^\/api\/admin\/approvals\/([^/]+)$/ },
    { method: "GET", pattern: /^\/api\/admin\/treasury$/ },
    { method: "POST", pattern: /^\/api\/admin\/treasury$/ },
    { method: "PUT", pattern: /^\/api\/admin\/modules\/([^/]+)$/ },
    { method: "PUT", pattern: /^\/api\/admin\/workers\/([^/]+)$/ },
    { method: "PUT", pattern: /^\/api\/admin\/grids\/([^/]+)$/ }
  ];

  const matches = routes.filter((entry) => entry.pattern.test(pathname));
  if (matches.length === 0) return null;
  const route = matches.find((entry) => entry.method === requestMethod) ?? matches[0];

  const match = pathname.match(route.pattern);
  return {
    route,
    allowedMethods: [...new Set(matches.map((entry) => entry.method))].join(", "),
    params: match ? match.slice(1) : []
  };
}

function isLoopbackAddress(address: string | undefined) {
  if (!address) return false;
  const normalized = address.replace(/^::ffff:/, "");
  return ["127.0.0.1", "::1", "localhost"].includes(normalized);
}

function isLocalHost(origin: string | undefined, host: string | undefined) {
  if (typeof origin !== "string" || typeof host !== "string") return false;
  try {
    const parsedOrigin = new URL(origin);
    const parsedHost = host.split(":")[0].replace(/^\[|\]$/g, "");
    return parsedOrigin.host === host &&
      ["http:", "https:"].includes(parsedOrigin.protocol) &&
      ["localhost", "127.0.0.1", "::1"].includes(parsedHost);
  } catch {
    return false;
  }
}

function isTrustedLocalRequest(request: http.IncomingMessage) {
  const remoteAddress = request.socket.remoteAddress;
  const host = request.headers.host;
  if (!isLoopbackAddress(remoteAddress) && !isLocalHost(request.headers.origin, host)) {
    return false;
  }
  return true;
}

async function serveStaticFile(requestPath: string, serverResponse: http.ServerResponse) {
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
  const cleanPath = normalizedPath.replace(/^\/+/, "");
  const isIndexRequest = cleanPath === "index.html";
  const publicRoot = path.resolve(projectRoot, "public");

  const resolved = isIndexRequest
    ? path.resolve(projectRoot, "index.html")
    : path.resolve(publicRoot, cleanPath);

  if (!isIndexRequest) {
    const relativePath = path.relative(publicRoot, resolved);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) return false;
  }

  try {
    const file = await readFile(resolved);
    const contentType = resolved.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream";
    serverResponse.writeHead(200, {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
    });
    serverResponse.end(file);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer(async (request, response) => {
  if (!isTrustedLocalRequest(request)) {
    response.writeHead(403, {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
    });
    response.end(JSON.stringify({ error: "Local development access is restricted to loopback clients only." }));
    return;
  }

  const url = new URL(request.url ?? "/", "http://localhost");
  const route = matchRoute(url.pathname, request.method ?? "GET");

  if (route) {
    if (request.method !== route.route.method) {
      response.writeHead(405, {
        Allow: route.allowedMethods,
        "Content-Type": "application/json; charset=utf-8"
      });
      response.end(JSON.stringify({ error: "Method not allowed." }));
      return;
    }

    const responseProxy = createResponse(response);
    if (url.pathname === "/api/auth/config") {
      return responseProxy.json({
        localDevelopment: true,
        issuer,
        clientId,
        audience
      });
    }

    if (url.pathname === "/api/auth/local-token") {
      const origin = request.headers.origin;
      const host = request.headers.host;
      if (!isLocalHost(origin, host)) {
        return responseProxy.status(403).json({ error: "Local sign-in requires a same-origin request from localhost." });
      }
      return responseProxy.json({ access_token: localToken, expires_in: 3600 });
    }

    if (url.pathname === "/api/auth/local-approver-token") {
      const origin = request.headers.origin;
      const host = request.headers.host;
      if (!isLocalHost(origin, host)) {
        return responseProxy.status(403).json({ error: "Local reviewer sign-in requires a same-origin request from localhost." });
      }
      return responseProxy.json({ access_token: localApproverToken, expires_in: 3600 });
    }

    if (url.pathname === "/api/admin/treasury") {
      const body = request.method === "POST" ? await readJsonBody(request) : {};
      await treasuryHandler({
        method: request.method,
        headers: request.headers,
        query: Object.fromEntries(url.searchParams.entries()),
        body
      } as any, responseProxy as any);
      return;
    }

    if (route.route.method === "PUT") {
      const body = await readJsonBody(request);
      const queryKey = url.pathname.startsWith("/api/admin/workers/")
        ? "worker"
        : url.pathname.startsWith("/api/admin/grids/") ? "grid"
          : url.pathname.startsWith("/api/tasks/") ? "task" : "module";
      const resolvedQueryKey = url.pathname.startsWith("/api/admin/approvals/") ? "approval" : queryKey;
      const requestProxy = {
        method: request.method,
        headers: request.headers,
        query: { [resolvedQueryKey]: route.params[0] },
        body
      } as any;
      if (resolvedQueryKey === "approval") await decideApprovalHandler(requestProxy, responseProxy as any);
      else if (resolvedQueryKey === "worker") await updateWorkerHandler(requestProxy, responseProxy as any);
      else if (resolvedQueryKey === "grid") await updateGridHandler(requestProxy, responseProxy as any);
      else if (resolvedQueryKey === "task") await updateGridTaskHandler(requestProxy, responseProxy as any);
      else await updateModuleHandler(requestProxy, responseProxy as any);
      return;
    }

    if (url.pathname === "/api/tasks") {
      const body = request.method === "POST" ? await readJsonBody(request) : {};
      await gridTasksHandler({
        method: request.method,
        headers: request.headers,
        query: Object.fromEntries(url.searchParams.entries()),
        body
      } as any, responseProxy as any);
      return;
    }

    const requestProxy = {
      method: request.method,
      headers: request.headers,
      query: Object.fromEntries(url.searchParams.entries()),
      body: {}
    } as any;

    if (url.pathname === "/api/health") {
      await healthHandler(requestProxy, responseProxy as any);
      return;
    }

    if (url.pathname === "/api/auth/config") {
      await authConfigHandler(requestProxy, responseProxy as any);
      return;
    }

    if (url.pathname === "/api/modules") {
      await modulesHandler(requestProxy, responseProxy as any);
      return;
    }

    if (url.pathname === "/api/workers") {
      await workersHandler(requestProxy, responseProxy as any);
      return;
    }

    if (url.pathname === "/api/grids") {
      await gridsHandler(requestProxy, responseProxy as any);
      return;
    }

    if (url.pathname === "/api/operations/summary") {
      await operationsSummaryHandler(requestProxy, responseProxy as any);
      return;
    }

    if (url.pathname === "/api/ready") {
      await readyHandler(requestProxy, responseProxy as any);
      return;
    }

    if (url.pathname === "/api/admin/audit") {
      await auditHandler(requestProxy, responseProxy as any);
      return;
    }

    if (url.pathname === "/api/admin/approvals") {
      await approvalsHandler(requestProxy, responseProxy as any);
      return;
    }
  }

  if (url.pathname.startsWith("/api/")) {
    response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "Not found." }));
    return;
  }

  const served = await serveStaticFile(url.pathname, response);
  if (!served) {
    response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "Not found." }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`CEDARS local API running at http://localhost:${port}`);
  console.log("Local founder bearer token is kept in memory and exposed only through the same-origin proxy endpoint.");
});
