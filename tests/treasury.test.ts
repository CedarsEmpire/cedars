import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";

const originalEnvironment = { ...process.env };

function clearCachedClient() {
  delete (globalThis as typeof globalThis & { cedarsPrisma?: unknown }).cedarsPrisma;
}

function rpcResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
}

describe("read-only treasury observations", () => {
  beforeEach(() => {
    vi.resetModules();
    clearCachedClient();
    process.env.CEDARS_USE_IN_MEMORY_DB = "1";
    delete process.env.CEDARS_TRON_RPC_URL;
    delete process.env.CEDARS_TRON_TREASURY_ADDRESS;
    delete process.env.CEDARS_TRON_START_BLOCK;
    delete process.env.CEDARS_BNB_RPC_URL;
    delete process.env.CEDARS_BNB_TREASURY_ADDRESS;
    delete process.env.CEDARS_BNB_START_BLOCK;
    delete process.env.CEDARS_BNB_CONFIRMATIONS;
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnvironment)) delete process.env[key];
    }
    Object.assign(process.env, originalEnvironment);
    clearCachedClient();
  });

  it("reports partial and insecure chain configuration as invalid", async () => {
    const { getTreasuryMonitorStatus } = await import("../src/features/treasury.js");
    process.env.CEDARS_BNB_RPC_URL = "http://rpc.example.invalid";
    expect(getTreasuryMonitorStatus().find((item) => item.chain === "BNB")).toMatchObject({
      configured: false,
      status: "CONFIGURATION_INVALID"
    });

    process.env.CEDARS_BNB_RPC_URL = "https://rpc.example.invalid";
    expect(getTreasuryMonitorStatus().find((item) => item.chain === "BNB")).toMatchObject({
      configured: false,
      status: "CONFIGURATION_INVALID"
    });
  });

  it("scans bounded finalized BNB blocks and records only successful native transfers", async () => {
    process.env.CEDARS_BNB_RPC_URL = "https://rpc.example.invalid";
    process.env.CEDARS_BNB_TREASURY_ADDRESS = "0x0000000000000000000000000000000000000001";
    process.env.CEDARS_BNB_START_BLOCK = "1";
    process.env.CEDARS_BNB_CONFIRMATIONS = "1";
    const successfulHash = `0x${"a".repeat(64)}`;
    const failedHash = `0x${"b".repeat(64)}`;
    const blockHash = `0x${"c".repeat(64)}`;
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { method: string; params: unknown[] };
      if (request.method === "eth_chainId") return rpcResponse({ result: "0x38" });
      if (request.method === "eth_blockNumber") return rpcResponse({ result: "0x8" });
      if (request.method === "eth_getBlockByNumber") {
        const number = request.params[0];
        return rpcResponse({
          result: {
            number,
            hash: blockHash,
            transactions: number === "0x1" ? [
              {
                hash: successfulHash,
                from: "0x0000000000000000000000000000000000000002",
                to: "0x0000000000000000000000000000000000000001",
                value: "0xde0b6b3a7640000"
              },
              {
                hash: failedHash,
                from: "0x0000000000000000000000000000000000000002",
                to: "0x0000000000000000000000000000000000000001",
                value: "0x2"
              }
            ] : []
          }
        });
      }
      if (request.method === "eth_getTransactionReceipt") {
        const txHash = request.params[0];
        return rpcResponse({
          result: {
            status: txHash === successfulHash ? "0x1" : "0x0",
            blockHash
          }
        });
      }
      throw new Error(`Unexpected RPC method ${request.method}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { syncTreasuryObservations, listTreasuryTransfers, getTreasuryCursors } =
      await import("../src/features/treasury.js");

    const [tronSync, bnbSync] = await syncTreasuryObservations();
    expect(tronSync.status).toBe("NOT_CONFIGURED");
    expect(bnbSync).toMatchObject({
      status: "SYNCED",
      scannedFrom: "1",
      scannedTo: "5",
      transfersRecorded: 1
    });
    expect(await listTreasuryTransfers()).toMatchObject([{
      chain: "BNB",
      transactionHash: successfulHash,
      amountBaseUnits: "1000000000000000000",
      asset: "BNB"
    }]);
    expect(await getTreasuryCursors()).toMatchObject([{ chain: "BNB", lastScannedBlock: 5n }]);

    await syncTreasuryObservations();
    expect(await listTreasuryTransfers()).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("restricts sync and ledger access to authorized roles", async () => {
    const { requireTreasuryReadAccess, requireTreasurySyncAccess } = await import("../src/features/treasury.js");
    expect(() => requireTreasuryReadAccess(Role.FINANCE_ADMIN)).not.toThrow();
    expect(() => requireTreasurySyncAccess(Role.FOUNDER)).not.toThrow();
    expect(() => requireTreasuryReadAccess(Role.USER)).toThrow(/authorized finance and governance roles/);
    expect(() => requireTreasurySyncAccess(Role.FINANCE_ADMIN)).toThrow(/Platform administrator role required/);
  });
});
