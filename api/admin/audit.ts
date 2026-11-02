import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { Role } from "@prisma/client";
import { AuthorizationError, authenticateRequest } from "../../src/auth/authorization.js";
import { listAuditEvents, requireAuditAccess } from "../../src/features/modules.js";

const auditQuerySchema = z.object({
  entityType: z.string().trim().max(100).optional(),
  entityId: z.string().trim().max(100).optional(),
  actorRole: z.enum([
    "SUPER_ADMIN",
    "FOUNDER",
    "INVESTOR",
    "PARTNER",
    "FINANCE_ADMIN",
    "COMPLIANCE_OFFICER",
    "HEALTHCARE_ADMIN",
    "EDUCATION_ADMIN",
    "USER"
  ]).optional(),
  search: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
}).passthrough();

export default async function auditHandler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    const actor = await authenticateRequest(request);
    requireAuditAccess(actor.role as Parameters<typeof requireAuditAccess>[0]);

    const parsed = auditQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return response.status(400).json({ error: "Invalid audit query parameters." });
    }

    const events = await listAuditEvents({
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      actorRole: parsed.data.actorRole ? Role[parsed.data.actorRole as keyof typeof Role] : undefined,
      search: parsed.data.search,
      take: parsed.data.limit ?? 100
    });

    response.setHeader("Cache-Control", "private, no-store");
    return response.status(200).json({ events });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    console.error("Unable to load audit events", error);
    return response.status(503).json({ error: "Audit data is temporarily unavailable." });
  }
}