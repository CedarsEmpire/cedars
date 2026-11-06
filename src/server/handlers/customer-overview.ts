import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AuthorizationError, authenticateRequest } from "../../auth/authorization.js";
import { prisma } from "../../db.js";

const taskStatuses = ["OPEN", "ASSIGNED", "IN_PROGRESS", "DELIVERED", "ACCEPTED", "CANCELLED"] as const;

export default async function customerOverviewHandler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    const actor = await authenticateRequest(request);
    const account = await prisma.user.findUnique({
      where: { externalSubject: actor.subject },
      select: { role: true, createdAt: true, id: true }
    });

    if (!account) {
      return response.status(403).json({ error: "Authorized customer account is unavailable." });
    }

    const groupedTasks = await prisma.gridTask.groupBy({
      by: ["status"],
      where: { buyerId: account.id },
      _count: { _all: true }
    });

    const byStatus: Record<(typeof taskStatuses)[number], number> = {
      OPEN: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      DELIVERED: 0,
      ACCEPTED: 0,
      CANCELLED: 0
    };

    for (const group of groupedTasks) {
      byStatus[group.status] = group._count._all;
    }

    response.setHeader("Cache-Control", "private, no-store");
    return response.status(200).json({
      account: {
        role: account.role,
        createdAt: account.createdAt
      },
      workOrders: {
        total: Object.values(byStatus).reduce((total, count) => total + count, 0),
        byStatus
      },
      settlementStatus: "NOT_RECORDED"
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    console.error("Unable to load customer portal overview", error);
    return response.status(503).json({ error: "Customer portal is temporarily unavailable." });
  }
}
