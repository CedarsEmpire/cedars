import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import treasurySyncHandler from "../api/cron/treasury-sync.js";
import { getTreasuryMonitorStatus, syncTreasuryObservations } from "../src/features/treasury.js";

vi.mock("../src/features/treasury.js", () => ({
  getTreasuryMonitorStatus: vi.fn(() => []),
  syncTreasuryObservations: vi.fn(async () => [])
}));

function makeResponse() {
  return {
    headers: {} as Record<string, string>,
    body: undefined as unknown,
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
      this.body = payload;
      return this;
    }
  };
}

describe("automated treasury sync endpoint", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("uses a Hobby-compatible once-daily UTC cron schedule", () => {
    const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      crons?: Array<{ path: string; schedule: string }>;
    };

    expect(vercelConfig.crons).toEqual([
      {
        path: "/api/cron/treasury-sync",
        schedule: "0 0 * * *"
      }
    ]);
  });

  it("rejects requests without the cron secret and does not sync", async () => {
    const response = makeResponse();
    await treasurySyncHandler({ method: "GET", headers: {} } as never, response as never);

    expect(response.statusCode).toBe(401);
    expect(syncTreasuryObservations).not.toHaveBeenCalled();
  });

  it("runs a read-only sync for an authorized cron request", async () => {
    vi.mocked(getTreasuryMonitorStatus).mockReturnValue([]);
    vi.mocked(syncTreasuryObservations).mockResolvedValue([]);
    const response = makeResponse();
    await treasurySyncHandler({
      method: "GET",
      headers: { authorization: "Bearer test-cron-secret" }
    } as never, response as never);

    expect(response.statusCode).toBe(200);
    expect(response.headers["Cache-Control"]).toBe("private, no-store");
    expect(syncTreasuryObservations).toHaveBeenCalledOnce();
    expect(response.body).toMatchObject({
      ledgerMode: "READ_ONLY_CHAIN_OBSERVATIONS",
      payableBalances: false
    });
  });
});
