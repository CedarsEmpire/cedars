import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { VercelRequest } from "@vercel/node";
import { Role } from "@prisma/client";
import { prisma } from "../db.js";
import { parseRoleClaim } from "./roles.js";

export type AuthContext = {
  subject: string;
  role: Role;
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
  const roleClaim = process.env.AUTH_ROLE_CLAIM;

  if (!jwksUri || !issuer || !audience || !roleClaim) {
    throw new AuthorizationError(503, "Authentication is not configured.");
  }

  const authorization = request.headers.authorization;
  const match = typeof authorization === "string" ? /^Bearer\s+(.+)$/i.exec(authorization) : null;
  if (!match) throw new AuthorizationError(401, "Authorization header required.");

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

  if (!payload.sub) throw new AuthorizationError(403, "Token is missing a subject claim.");

  const role = parseRoleClaim(payload, roleClaim);
  if (!role.success) {
    throw new AuthorizationError(403, "Token is missing a valid role claim.");
  }

  try {
    const user = await prisma.user.upsert({
      where: { externalSubject: payload.sub },
      create: { externalSubject: payload.sub, role: role.data },
      update: { role: role.data }
    });
    return { subject: payload.sub, role: user.role };
  } catch {
    throw new AuthorizationError(503, "User authorization data is unavailable.");
  }
}

export function requirePlatformAdmin(role: AuthContext["role"]) {
  if (role !== Role.FOUNDER && role !== Role.SUPER_ADMIN) {
    throw new AuthorizationError(403, "Platform administrator role required.");
  }
}