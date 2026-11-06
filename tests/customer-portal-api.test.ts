import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  userFindUnique: vi.fn(),
  taskGroupBy: vi.fn()
}));

vi.mock("../src/auth/authorization.js", () => ({
  authenticateRequest: mocks.authenticateRequest,
  AuthorizationError: class AuthorizationError extends Error {
    constructor(public readonly statusCode: 401 | 403 | 503, message: string) {
      super(message);
    }
  }
}));

vi.mock("../src/db.js", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    gridTask: { groupBy: mocks.taskGroupBy }
  }
}));

import customerOverviewHandler from "../src/server/handlers/customer-overview.js";

function responseDouble() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    }
  };
}

describe("GET /api/customer/overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue({ subject: "customer-123", role: "USER" });
    mocks.userFindUnique.mockResolvedValue({
      id: "user-row-1",
      role: "USER",
      createdAt: new Date("2026-01-01T00:00:00.000Z")
    });
    mocks.taskGroupBy.mockResolvedValue([
      { status: "OPEN", _count: { _all: 2 } },
      { status: "ACCEPTED", _count: { _all: 1 } }
    ]);
  });

  it("returns only the authenticated customer's aggregate work-order counts", async () => {
    const response = responseDouble();
    await customerOverviewHandler({ method: "GET" } as any, response as any);

    expect(response.statusCode).toBe(200);
    expect(response.headers["Cache-Control"]).toBe("private, no-store");
    expect(mocks.userFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { externalSubject: "customer-123" }
    }));
    expect(mocks.taskGroupBy).toHaveBeenCalledWith(expect.objectContaining({
      by: ["status"],
      where: { buyerId: "user-row-1" }
    }));
    expect(response.body).toMatchObject({
      account: { role: "USER" },
      workOrders: {
        total: 3,
        byStatus: { OPEN: 2, ACCEPTED: 1, CANCELLED: 0 }
      },
      settlementStatus: "NOT_RECORDED"
    });
  });

  it("rejects methods other than GET", async () => {
    const response = responseDouble();
    await customerOverviewHandler({ method: "POST" } as any, response as any);
    expect(response.statusCode).toBe(405);
    expect(response.headers.Allow).toBe("GET");
    expect(mocks.authenticateRequest).not.toHaveBeenCalled();
  });

  it("does not return data when the authenticated account record is unavailable", async () => {
    mocks.userFindUnique.mockResolvedValue(null);
    const response = responseDouble();
    await customerOverviewHandler({ method: "GET" } as any, response as any);
    expect(response.statusCode).toBe(403);
    expect(mocks.taskGroupBy).not.toHaveBeenCalled();
  });
});
