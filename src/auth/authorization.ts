import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { VercelRequest } from "@vercel/node";
import { z } from "zod";

const roleSchema = z.enum([
  "SUPER_ADMIN",
  "FOUNDER",
  "INVESTOR",
  "PARTNER",
  "FINANCE_ADMIN",
  "COMPLIANCE_OFFICER",
  "HEALTHCARE_ADMIN",
  "EDUCATION_ADMIN",
  "USER"
]);

export type AuthContext = {
  subject: string;
  role: z.infer<typeof roleSchema>;
};

export class AuthorizationError extends Error {
  constructor(public readonly statusCode: 401 | 403 | 503, message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

let cachedJwks: { uri: string; keySet: ReturnType<typeof createRemoteJWKSet> } | undefined;

function getJwks(uri: string) {
  if (!cachedJwks || cachedJwks.uri !== uri) {
    cachedJwks = { uri, keySet: createRemoteJWKSet(new URL(uri)) };
  }
  return cachedJwks.keySet;
}

export async function authenticateRequest(request: VercelRequest): Promise<AuthContext> {
  const jwksUri = process.env.AUTH_JWKS_URL;
  const issuer = process.env.AUTH_ISSUER;
  const audience = process.env.AUTH_AUDIENCE;

  if (!jwksUri || !issuer || !audience) {
    throw new AuthorizationError(503, "Authentication is not configured.");
  }

  const authorization = request.headers.authorization;
  const match = typeof authorization === "string" ? /^Bearer ([^\s]+)$/.exec(authorization) : null;
  if (!match) throw new AuthorizationError(401, "Bearer token required.");

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(match[1], getJwks(jwksUri), {
      issuer,
      audience,
      algorithms: ["RS256", "ES256"]
    }));
  } catch {
    throw new AuthorizationError(401, "Invalid access token.");
  }

  const role = roleSchema.safeParse(payload.role);
  if (!payload.sub || !role.success) {
    throw new AuthorizationError(403, "Token is missing a valid subject or role claim.");
  }

  return { subject: payload.sub, role: role.data };
}

export function requirePlatformAdmin(role: AuthContext["role"]) {
  if (role !== "FOUNDER" && role !== "SUPER_ADMIN") {
    throw new AuthorizationError(403, "Platform administrator role required.");
  }
}