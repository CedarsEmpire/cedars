import { timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getTreasuryMonitorStatus, syncTreasuryObservations } from "../../src/features/treasury.js";

function hasValidCronAuthorization(authorization: string | string[] | undefined, secret: string) {
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return false;
  const provided = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export default async function treasurySyncHandler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return response.status(503).json({ error: "Automated treasury sync is not configured." });
  }
  if (!hasValidCronAuthorization(request.headers.authorization, secret)) {
    return response.status(401).json({ error: "Unauthorized." });
  }

  try {
    const sync = await syncTreasuryObservations();
    response.setHeader("Cache-Control", "private, no-store");
    return response.status(200).json({
      monitoring: getTreasuryMonitorStatus(),
      sync,
      ledgerMode: "READ_ONLY_CHAIN_OBSERVATIONS",
      payableBalances: false
    });
  } catch (error) {
    console.error("Automated treasury observation sync failed", error);
    return response.status(503).json({ error: "Treasury observation service is temporarily unavailable." });
  }
}