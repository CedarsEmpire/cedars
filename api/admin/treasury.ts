import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AuthorizationError, authenticateRequest } from "../../src/auth/authorization.js";
import {
  getTreasuryCursors,
  getTreasuryMonitorStatus,
  listTreasuryTransfers,
  requireTreasuryReadAccess,
  requireTreasurySyncAccess,
  syncTreasuryObservations
} from "../../src/features/treasury.js";

function serializeTransfers(transfers: Awaited<ReturnType<typeof listTreasuryTransfers>>) {
  return transfers.map((transfer) => ({
    ...transfer,
    blockNumber: transfer.blockNumber.toString()
  }));
}

export default async function treasuryHandler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET" && request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    const actor = await authenticateRequest(request);
    if (request.method === "GET") {
      requireTreasuryReadAccess(actor.role);
      const [cursors, transfers] = await Promise.all([getTreasuryCursors(), listTreasuryTransfers()]);
      response.setHeader("Cache-Control", "private, no-store");
      return response.status(200).json({
        monitoring: getTreasuryMonitorStatus(),
        cursors: cursors.map((cursor) => ({ ...cursor, lastScannedBlock: cursor.lastScannedBlock.toString() })),
        transfers: serializeTransfers(transfers),
        ledgerMode: "READ_ONLY_CHAIN_OBSERVATIONS",
        payableBalances: false,
        actorRole: actor.role
      });
    }

    requireTreasurySyncAccess(actor.role);
    const sync = await syncTreasuryObservations();
    const transfers = await listTreasuryTransfers();
    response.setHeader("Cache-Control", "private, no-store");
    return response.status(200).json({
      monitoring: getTreasuryMonitorStatus(),
      sync,
      transfers: serializeTransfers(transfers),
      ledgerMode: "READ_ONLY_CHAIN_OBSERVATIONS",
      payableBalances: false,
      actorRole: actor.role
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    console.error("Unable to load or sync treasury observations", error);
    return response.status(503).json({ error: "Treasury observation service is temporarily unavailable." });
  }
}
