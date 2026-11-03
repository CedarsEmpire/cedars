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
    delete process.env.CEDARS_TRON_CONFIRMATIONS;
    delete process.env.CEDARS_TRON_USDT_CONTRACT;
    delete process.env.CEDARS_BNB_RPC_URL;
    delete process.env.CEDARS_BNB_TREASURY_ADDRESS;
    delete process.env.CEDARS_BNB_START_BLOCK;
    delete process.env.CEDARS_BNB_CONFIRMATIONS;
    delete process.env.CEDARS_BNB_USDT_CONTRACT;
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

  it("defaults both networks to 100 block confirmations", async () => {
    process.env.CEDARS_TRON_RPC_URL = "https://rpc.example.invalid";
    process.env.CEDARS_TRON_TREASURY_ADDRESS = "TE26B7zQjMbahYAWcxEsSPC6aZEr2Hcz1u";
    process.env.CEDARS_TRON_START_BLOCK = "1";
    process.env.CEDARS_BNB_RPC_URL = "https://rpc.example.invalid";
    process.env.CEDARS_BNB_TREASURY_ADDRESS = "0x0000000000000000000000000000000000000001";
    process.env.CEDARS_BNB_START_BLOCK = "1";
    const { getTreasuryMonitorStatus } = await import("../src/features/treasury.js");

    expect(getTreasuryMonitorStatus()).toMatchObject([
      { chain: "TRON", configured: true, confirmations: "100" },
      { chain: "BNB", configured: true, confirmations: "100" }
    ]);
  });

  it("scans up to 120 finalized BNB blocks and records only successful native transfers", async () => {
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
      if (request.method === "eth_blockNumber") return rpcResponse({ result: "0x82" });
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
      scannedTo: "120",
      transfersRecorded: 1
    });
    expect(await listTreasuryTransfers()).toMatchObject([{
      chain: "BNB",
      transactionHash: successfulHash,
      amountBaseUnits: "1000000000000000000",
      asset: "BNB"
    }]);
    expect(await getTreasuryCursors()).toMatchObject([{ chain: "BNB", lastScannedBlock: 120n }]);

    await syncTreasuryObservations();
    expect(await listTreasuryTransfers()).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("records confirmed incoming USDT-BEP20 events for the configured BNB treasury", async () => {
    process.env.CEDARS_BNB_RPC_URL = "https://rpc.example.invalid";
    process.env.CEDARS_BNB_TREASURY_ADDRESS = "0x0000000000000000000000000000000000000001";
    process.env.CEDARS_BNB_START_BLOCK = "1";
    process.env.CEDARS_BNB_CONFIRMATIONS = "1";
    process.env.CEDARS_BNB_USDT_CONTRACT = "0x0000000000000000000000000000000000000003";
    const transactionHash = `0x${"d".repeat(64)}`;
    const blockHash = `0x${"c".repeat(64)}`;
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { method: string; params: unknown[] };
      if (request.method === "eth_chainId") return rpcResponse({ result: "0x38" });
      if (request.method === "eth_blockNumber") return rpcResponse({ result: "0x2" });
      if (request.method === "eth_getBlockByNumber") {
        return rpcResponse({ result: { number: request.params[0], hash: blockHash, transactions: [] } });
      }
      if (request.method === "eth_getLogs") {
        return rpcResponse({ result: [{
          address: process.env.CEDARS_BNB_USDT_CONTRACT,
          blockNumber: "0x1",
          blockHash,
          transactionHash,
          logIndex: "0x0",
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            `0x${"0".repeat(24)}${"2".repeat(40)}`,
            `0x${"0".repeat(63)}1`
          ],
          data: "0xf4240"
        }] });
      }
      throw new Error(`Unexpected RPC method ${request.method}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { syncTreasuryObservations, listTreasuryTransfers } = await import("../src/features/treasury.js");

    const [, sync] = await syncTreasuryObservations();

    expect(sync).toMatchObject({ status: "SYNCED", scannedTo: "1", transfersRecorded: 1 });
    expect(await listTreasuryTransfers()).toMatchObject([{
      chain: "BNB",
      transactionHash,
      asset: "USDT-BEP20",
      amountBaseUnits: "1000000",
      fromAddress: `0x${"2".repeat(40)}`,
      toAddress: "0x0000000000000000000000000000000000000001"
    }]);
  });

  it("records confirmed incoming USDT-TRC20 events for the configured TRON treasury", async () => {
    process.env.CEDARS_TRON_RPC_URL = "https://rpc.example.invalid";
    process.env.CEDARS_TRON_TREASURY_ADDRESS = `41${"1".repeat(40)}`;
    process.env.CEDARS_TRON_START_BLOCK = "1";
    process.env.CEDARS_TRON_CONFIRMATIONS = "1";
    process.env.CEDARS_TRON_USDT_CONTRACT = "41a614f803b6fd780986a42c78ec9c7f77e6ded13c";
    const transactionHash = "a".repeat(64);
    const blockHash = "c".repeat(64);
    const contractAddress = "a614f803b6fd780986a42c78ec9c7f77e6ded13c";
    const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      const request = JSON.parse(String(init?.body)) as { num?: number; value?: string };
      if (url.pathname.endsWith("/wallet/getnowblock")) {
        return rpcResponse({ block_header: { raw_data: { number: 2 } } });
      }
      if (url.pathname.endsWith("/wallet/getblockbynum")) {
        return rpcResponse({
          blockID: blockHash,
          block_header: { raw_data: { number: request.num } },
          transactions: request.num === 1 ? [{
            txID: transactionHash,
            raw_data: { contract: [{
              type: "TriggerSmartContract",
              parameter: { value: { contract_address: `41${contractAddress}` } }
            }] },
            ret: [{ contractRet: "SUCCESS" }]
          }] : []
        });
      }
      if (url.pathname.endsWith("/wallet/gettransactioninfobyid")) {
        expect(request.value).toBe(transactionHash);
        return rpcResponse({
          blockNumber: 1,
          receipt: { result: "SUCCESS" },
          log: [{
            address: contractAddress,
            topics: [
              "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
              `${"0".repeat(24)}${"2".repeat(40)}`,
              `${"0".repeat(24)}${"1".repeat(40)}`
            ],
            data: "f4240"
          }]
        });
      }
      throw new Error(`Unexpected TRON RPC path ${url.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { syncTreasuryObservations, listTreasuryTransfers } = await import("../src/features/treasury.js");

    const [sync] = await syncTreasuryObservations();

    expect(sync).toMatchObject({ status: "SYNCED", scannedTo: "1", transfersRecorded: 1 });
    expect(await listTreasuryTransfers()).toMatchObject([{
      chain: "TRON",
      transactionHash,
      asset: "USDT-TRC20",
      amountBaseUnits: "1000000",
      fromAddress: expect.any(String),
      toAddress: "TBXSw8fM4jpQkGc6zZjsVABFpVN7UvXPdV"
    }]);
  });

  it("restricts sync and ledger access to authorized roles", async () => {
    const { requireTreasuryReadAccess, requireTreasurySyncAccess } = await import("../src/features/treasury.js");
    expect(() => requireTreasuryReadAccess(Role.FINANCE_ADMIN)).not.toThrow();
    expect(() => requireTreasurySyncAccess(Role.FOUNDER)).not.toThrow();
    expect(() => requireTreasuryReadAccess(Role.USER)).toThrow(/authorized finance and governance roles/);
    expect(() => requireTreasurySyncAccess(Role.FINANCE_ADMIN)).toThrow(/Platform administrator role required/);
  });
});
