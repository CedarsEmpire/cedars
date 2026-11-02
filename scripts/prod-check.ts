import { execFileSync } from "node:child_process";
import { prisma } from "../src/db.js";

type OidcDiscovery = {
  issuer?: unknown;
  jwks_uri?: unknown;
  authorization_endpoint?: unknown;
  token_endpoint?: unknown;
  code_challenge_methods_supported?: unknown;
};

function requiredSetting(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required setting: ${name}`);
  if (/YOUR_|example\.com|localhost|127\.0\.0\.1|<[^>]+>/i.test(value)) {
    throw new Error(`${name} still appears to contain an example value.`);
  }
  return value;
}

function parseSecureUrl(name: string, value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
  if (url.protocol !== "https:" || !url.hostname) {
    throw new Error(`${name} must use HTTPS and include a hostname.`);
  }
  return url;
}

function normalizedUrl(value: string) {
  return new URL(value).href.replace(/\/$/, "");
}

async function checkIdentityProvider(settings: {
  issuer: string;
  jwksUrl: string;
  roleClaim: string;
}) {
  const issuerUrl = parseSecureUrl("AUTH_ISSUER", settings.issuer);
  const jwksUrl = parseSecureUrl("AUTH_JWKS_URL", settings.jwksUrl);
  const roleClaimUrl = parseSecureUrl("AUTH_ROLE_CLAIM", settings.roleClaim);
  if (roleClaimUrl.hash || roleClaimUrl.search) {
    throw new Error("AUTH_ROLE_CLAIM must be a namespaced claim URL without query or fragment.");
  }

  let discoveryResponse: Response;
  try {
    discoveryResponse = await fetch(new URL(".well-known/openid-configuration", issuerUrl), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000)
    });
  } catch {
    throw new Error("Unable to reach the OIDC discovery endpoint.");
  }
  if (!discoveryResponse.ok) throw new Error("OIDC discovery returned an unsuccessful status.");

  let discovery: OidcDiscovery;
  try {
    discovery = await discoveryResponse.json() as OidcDiscovery;
  } catch {
    throw new Error("OIDC discovery did not return valid JSON.");
  }

  if (typeof discovery.issuer !== "string" ||
      normalizedUrl(discovery.issuer) !== normalizedUrl(settings.issuer)) {
    throw new Error("OIDC discovery issuer does not match AUTH_ISSUER.");
  }

  if (typeof discovery.jwks_uri !== "string" ||
      normalizedUrl(discovery.jwks_uri) !== normalizedUrl(settings.jwksUrl)) {
    throw new Error("AUTH_JWKS_URL does not match the OIDC discovery signing-key URL.");
  }

  for (const [name, endpoint] of [
    ["authorization_endpoint", discovery.authorization_endpoint],
    ["token_endpoint", discovery.token_endpoint],
    ["jwks_uri", discovery.jwks_uri]
  ] as const) {
    if (typeof endpoint !== "string") throw new Error(`OIDC discovery is missing ${name}.`);
    parseSecureUrl(`OIDC ${name}`, endpoint);
  }

  if (!Array.isArray(discovery.code_challenge_methods_supported) ||
      !discovery.code_challenge_methods_supported.includes("S256")) {
    throw new Error("OIDC provider does not advertise PKCE S256 support.");
  }

  let jwksResponse: Response;
  try {
    jwksResponse = await fetch(jwksUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000)
    });
  } catch {
    throw new Error("Unable to reach the configured JWKS endpoint.");
  }
  if (!jwksResponse.ok) throw new Error("JWKS endpoint returned an unsuccessful status.");

  let jwks: { keys?: unknown };
  try {
    jwks = await jwksResponse.json() as { keys?: unknown };
  } catch {
    throw new Error("JWKS endpoint did not return valid JSON.");
  }
  if (!Array.isArray(jwks.keys) || jwks.keys.length === 0) {
    throw new Error("JWKS endpoint did not return any signing keys.");
  }
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new Error("PostgreSQL connection failed; connection details are omitted.");
  }

  try {
    execFileSync("npx", ["prisma", "migrate", "status"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    throw new Error("Prisma migration status is not clean. Apply reviewed migrations before release.");
  }
}

async function main() {
  const databaseUrl = requiredSetting("DATABASE_URL");
  let database: URL;
  try {
    database = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
  if (!["postgres:", "postgresql:"].includes(database.protocol) ||
      !database.hostname ||
      !database.pathname.slice(1) ||
      !database.password) {
    throw new Error("DATABASE_URL must include a PostgreSQL host, database, and password.");
  }
  if (!["require", "verify-ca", "verify-full"].includes(database.searchParams.get("sslmode") ?? "")) {
    throw new Error("DATABASE_URL must require TLS using sslmode=require, verify-ca, or verify-full.");
  }
  console.log("PASS production database URL format and TLS requirement");

  const issuer = requiredSetting("AUTH_ISSUER");
  const jwksUrl = requiredSetting("AUTH_JWKS_URL");
  requiredSetting("AUTH_AUDIENCE");
  requiredSetting("AUTH_CLIENT_ID");
  const roleClaim = requiredSetting("AUTH_ROLE_CLAIM");
  await checkIdentityProvider({ issuer, jwksUrl, roleClaim });
  console.log("PASS OIDC issuer, discovery, PKCE, role claim URL, and signing keys");

  await checkDatabase();
  console.log("PASS PostgreSQL connection and Prisma migration status");
  console.log("Production configuration checks passed. No database changes were made.");
}

main()
  .catch((error: unknown) => {
    console.error(
      "Production configuration check failed:",
      error instanceof Error ? error.message : "Unexpected validation error."
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });