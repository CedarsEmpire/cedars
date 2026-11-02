const requiredSettings = [
  "DATABASE_URL",
  "AUTH_JWKS_URL",
  "AUTH_ISSUER",
  "AUTH_AUDIENCE",
  "AUTH_CLIENT_ID",
  "AUTH_ROLE_CLAIM"
] as const;

function requiredSetting(name: typeof requiredSettings[number]) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required Preview setting: ${name}`);
  if (/YOUR_|example\.com|localhost|127\.0\.0\.1|<[^>]+>/i.test(value)) {
    throw new Error(`${name} still appears to contain an example or local value.`);
  }
  return value;
}

function requireHttpsUrl(name: string, value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL.`);
  }
  if (url.protocol !== "https:" || !url.hostname) {
    throw new Error(`${name} must use HTTPS and include a hostname.`);
  }
  return url;
}

function validatePreviewEnvironment() {
  if (process.env.VERCEL_ENV !== "preview") {
    throw new Error("This check only runs when VERCEL_ENV is set to preview.");
  }

  const settings = Object.fromEntries(
    requiredSettings.map((name) => [name, requiredSetting(name)])
  ) as Record<typeof requiredSettings[number], string>;

  let database: URL;
  try {
    database = new URL(settings.DATABASE_URL);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }
  if (!["postgres:", "postgresql:"].includes(database.protocol) ||
      !database.hostname ||
      !database.pathname.slice(1) ||
      !database.password) {
    throw new Error("DATABASE_URL must contain a PostgreSQL host, database, and password.");
  }
  if (!["require", "verify-ca", "verify-full"].includes(database.searchParams.get("sslmode") ?? "")) {
    throw new Error("DATABASE_URL must require TLS using sslmode=require, verify-ca, or verify-full.");
  }

  requireHttpsUrl("AUTH_JWKS_URL", settings.AUTH_JWKS_URL);
  requireHttpsUrl("AUTH_ISSUER", settings.AUTH_ISSUER);
  const roleClaim = requireHttpsUrl("AUTH_ROLE_CLAIM", settings.AUTH_ROLE_CLAIM);
  if (roleClaim.pathname === "/" || roleClaim.hash || roleClaim.search) {
    throw new Error("AUTH_ROLE_CLAIM must be a namespaced URL without query or fragment.");
  }
  if (!settings.AUTH_AUDIENCE || !settings.AUTH_CLIENT_ID) {
    throw new Error("AUTH_AUDIENCE and AUTH_CLIENT_ID must not be empty.");
  }
}

try {
  validatePreviewEnvironment();
  console.log("Preview environment shape and isolation prerequisites passed.");
  console.log("No network connections or database changes were made.");
} catch (error) {
  console.error(
    "Preview configuration check failed:",
    error instanceof Error ? error.message : "Unexpected validation error."
  );
  process.exitCode = 1;
}
