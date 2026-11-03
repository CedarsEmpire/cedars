import { createHash } from "node:crypto";
import { Role, type Prisma } from "@prisma/client";
import { z } from "zod";
import { AuthorizationError } from "../auth/authorization.js";
import { prisma } from "../db.js";

export const chainNames = ["TRON", "BNB"] as const;
export type TreasuryChain = typeof chainNames[number];

const blockNumberSchema = z.string().regex(/^\d{1,20}$/).transform((value) => BigInt(value));
const tronAlphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const maxBlocksPerSync = 120n;
const pageSize = 100;

type ChainConfig = {
  chain: TreasuryChain;
  rpcUrl: URL;
  treasuryAddress: string;
  normalizedAddress: string;
  usdtContract: string | null;
  startBlock: bigint;
  confirmations: bigint;
};

export type ObservedTransfer = {
  chain: TreasuryChain;
  transactionHash: string;
  transferIndex: number;
  blockNumber: bigint;
  blockHash: string;
  fromAddress: string;
  toAddress: string;
  asset: "TRX" | "BNB" | "USDT-TRC20" | "USDT-BEP20";
  amountBaseUnits: string;
};

const transferEventTopic = "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function base58Decode(value: string): Buffer {
  let number = 0n;
  for (const character of value) {
    const digit = tronAlphabet.indexOf(character);
    if (digit < 0) throw new Error("Treasury TRON address is invalid.");
    number = number * 58n + BigInt(digit);
  }
  const body: number[] = [];
  while (number > 0n) {
    body.unshift(Number(number & 255n));
    number >>= 8n;
  }
  const leadingZeroes = value.match(/^1*/)?.[0].length ?? 0;
  return Buffer.concat([Buffer.alloc(leadingZeroes), Buffer.from(body)]);
}

function base58Encode(value: Buffer): string {
  let number = BigInt(`0x${value.toString("hex") || "0"}`);
  let encoded = "";
  while (number > 0n) {
    const remainder = Number(number % 58n);
    encoded = tronAlphabet[remainder] + encoded;
    number /= 58n;
  }
  for (const byte of value) {
    if (byte !== 0) break;
    encoded = `1${encoded}`;
  }
  return encoded;
}

function doubleSha256(value: Buffer): Buffer {
  return createHash("sha256").update(createHash("sha256").update(value).digest()).digest();
}

function tronAddressBytes(value: string): Buffer {
  if (/^(?:0x)?41[0-9a-fA-F]{40}$/.test(value)) {
    return Buffer.from(value.replace(/^0x/i, ""), "hex");
  }
  const decoded = base58Decode(value);
  if (decoded.length !== 25) throw new Error("Treasury TRON address is invalid.");
  const payload = decoded.subarray(0, 21);
  if (!doubleSha256(payload).subarray(0, 4).equals(decoded.subarray(21))) {
    throw new Error("Treasury TRON address checksum is invalid.");
  }
  if (payload[0] !== 0x41) throw new Error("Treasury TRON address has an invalid network prefix.");
  return payload;
}

function normalizeTronAddress(value: string): string {
  return tronAddressBytes(value).toString("hex").toLowerCase();
}

function matchesTronAddress(value: string, expected: string): boolean {
  try {
    return normalizeTronAddress(value) === expected;
  } catch {
    return false;
  }
}

function tronLogAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const address = value.replace(/^0x/i, "");
  if (/^[0-9a-fA-F]{40}$/.test(address)) return `41${address}`.toLowerCase();
  if (/^41[0-9a-fA-F]{40}$/.test(address)) return address.toLowerCase();
  return null;
}

function formatTronAddress(value: string): string {
  const payload = tronAddressBytes(value);
  return base58Encode(Buffer.concat([payload, doubleSha256(payload).subarray(0, 4)]));
}

function normalizeBnbAddress(value: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error("Treasury BNB address is invalid.");
  return value.toLowerCase();
}

function getChainConfig(chain: TreasuryChain): ChainConfig | null {
  const prefix = chain === "TRON" ? "CEDARS_TRON" : "CEDARS_BNB";
  const rpcValue = process.env[`${prefix}_RPC_URL`];
  const address = process.env[`${prefix}_TREASURY_ADDRESS`];
  const startValue = process.env[`${prefix}_START_BLOCK`];
  const usdtContractValue = process.env[`${prefix}_USDT_CONTRACT`];
  if (!rpcValue && !address && !startValue && !usdtContractValue) return null;
  if (!rpcValue || !address || !startValue) {
    throw new Error(`${chain} monitoring requires an RPC URL, treasury address, and start block.`);
  }

  const rpcUrl = new URL(rpcValue);
  const localHttp = process.env.NODE_ENV !== "production" &&
    rpcUrl.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(rpcUrl.hostname);
  if ((!localHttp && rpcUrl.protocol !== "https:") || rpcUrl.username || rpcUrl.password) {
    throw new Error(`${chain} RPC URL must use HTTPS and must not contain embedded credentials.`);
  }
  const startBlock = blockNumberSchema.parse(startValue);
  const normalizedAddress = chain === "TRON" ? normalizeTronAddress(address) : normalizeBnbAddress(address);
  const usdtContract = usdtContractValue
    ? chain === "TRON" ? normalizeTronAddress(usdtContractValue) : normalizeBnbAddress(usdtContractValue)
    : null;
  const confirmationValue = process.env[`${prefix}_CONFIRMATIONS`];
  const confirmations = confirmationValue
    ? blockNumberSchema.parse(confirmationValue)
    : 100n;
  if (confirmations < 1n || confirmations > 10_000n) {
    throw new Error(`${chain} confirmation depth must be between 1 and 10,000 blocks.`);
  }
  return { chain, rpcUrl, treasuryAddress: address, normalizedAddress, usdtContract, startBlock, confirmations };
}

export function getTreasuryMonitorStatus() {
  return chainNames.map((chain) => {
    try {
      const config = getChainConfig(chain);
      return {
        chain,
        configured: Boolean(config),
        treasuryAddress: config?.treasuryAddress ?? null,
        assets: config ? [chain === "TRON" ? "TRX" : "BNB", ...(config.usdtContract ? [chain === "TRON" ? "USDT-TRC20" : "USDT-BEP20"] : [])] : [],
        usdtContract: config?.usdtContract
          ? chain === "TRON" ? formatTronAddress(config.usdtContract) : config.usdtContract
          : null,
        startBlock: config?.startBlock.toString() ?? null,
        confirmations: config?.confirmations.toString() ?? null,
        status: config ? "READ_ONLY_MONITOR_CONFIGURED" : "NOT_CONFIGURED",
        error: null
      };
    } catch (error) {
      return {
        chain,
        configured: false,
        treasuryAddress: null,
        assets: [],
        usdtContract: null,
        startBlock: null,
        confirmations: null,
        status: "CONFIGURATION_INVALID",
        error: error instanceof Error ? error.message : "Invalid chain configuration."
      };
    }
  });
}

async function postJson(url: URL, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Chain RPC returned HTTP ${response.status}.`);
  return response.json();
}

function parseHexInteger(value: unknown, label: string): bigint {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]+$/.test(value)) {
    throw new Error(`Chain RPC returned an invalid ${label}.`);
  }
  return BigInt(value);
}

async function collectBnb(config: ChainConfig, cursor: bigint): Promise<{ head: bigint; transfers: ObservedTransfer[]; scannedTo: bigint }> {
  const chainResult = await postJson(config.rpcUrl, { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] });
  if (!isRecord(chainResult) || chainResult.error || chainResult.result !== "0x38") {
    throw new Error("BNB RPC endpoint is not reporting BNB Smart Chain mainnet (chain ID 56).");
  }
  const headResult = await postJson(config.rpcUrl, { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] });
  if (!isRecord(headResult) || headResult.error || !("result" in headResult)) {
    throw new Error("BNB RPC failed to return the chain head.");
  }
  const head = parseHexInteger(headResult.result, "chain head");
  const safeHead = head > config.confirmations ? head - config.confirmations : 0n;
  const from = cursor + 1n > config.startBlock ? cursor + 1n : config.startBlock;
  const scannedTo = safeHead < from ? cursor : (safeHead - from + 1n > maxBlocksPerSync ? from + maxBlocksPerSync - 1n : safeHead);
  const transfers: ObservedTransfer[] = [];
  const scannedBlockHashes = new Map<string, string>();

  for (let number = from; number <= scannedTo; number += 1n) {
    const result = await postJson(config.rpcUrl, {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBlockByNumber",
      params: [`0x${number.toString(16)}`, true]
    });
    if (!isRecord(result) || result.error || !isRecord(result.result)) {
      throw new Error(`BNB RPC failed to return block ${number}.`);
    }
    const block = result.result;
    if (!Array.isArray(block.transactions)) throw new Error(`BNB block ${number} did not include full transactions.`);
    const blockNumber = parseHexInteger(block.number, "block number");
    const blockHash = block.hash;
    if (typeof blockHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(blockHash) || blockNumber !== number) {
      throw new Error(`BNB RPC returned inconsistent block ${number}.`);
    }
    scannedBlockHashes.set(number.toString(), blockHash.toLowerCase());

    block.transactions.forEach((transaction, index) => {
      if (!isRecord(transaction) || typeof transaction.from !== "string" || typeof transaction.to !== "string") return;
      if (!/^0x[0-9a-fA-F]{40}$/.test(transaction.from) || !/^0x[0-9a-fA-F]{40}$/.test(transaction.to)) return;
      const fromAddress = transaction.from.toLowerCase();
      const toAddress = transaction.to.toLowerCase();
      if (fromAddress !== config.normalizedAddress && toAddress !== config.normalizedAddress) return;
      const amount = parseHexInteger(transaction.value, "transaction value");
      if (amount === 0n || typeof transaction.hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(transaction.hash)) return;
      transfers.push({
        chain: "BNB",
        transactionHash: transaction.hash,
        transferIndex: index,
        blockNumber,
        blockHash,
        fromAddress,
        toAddress,
        asset: "BNB",
        amountBaseUnits: amount.toString()
      });
    });
  }
  for (let index = transfers.length - 1; index >= 0; index -= 1) {
    const transfer = transfers[index];
    const receipt = await postJson(config.rpcUrl, {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionReceipt",
      params: [transfer.transactionHash]
    });
    if (!isRecord(receipt) || receipt.error || !isRecord(receipt.result) ||
        receipt.result.status !== "0x1" ||
        typeof receipt.result.blockHash !== "string" ||
        receipt.result.blockHash.toLowerCase() !== transfer.blockHash.toLowerCase()) {
      transfers.splice(index, 1);
    }
  }
  if (config.usdtContract && scannedTo >= from) {
    const recipientTopic = `0x${config.normalizedAddress.slice(2).padStart(64, "0")}`;
    const logsResult = await postJson(config.rpcUrl, {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getLogs",
      params: [{
        fromBlock: `0x${from.toString(16)}`,
        toBlock: `0x${scannedTo.toString(16)}`,
        address: config.usdtContract,
        topics: [`0x${transferEventTopic}`, null, recipientTopic]
      }]
    });
    if (!isRecord(logsResult) || logsResult.error || !Array.isArray(logsResult.result)) {
      throw new Error("BNB RPC failed to return USDT transfer events.");
    }
    for (const log of logsResult.result) {
      if (!isRecord(log) || typeof log.address !== "string" ||
          normalizeBnbAddress(log.address) !== config.usdtContract ||
          !Array.isArray(log.topics) || log.topics.length < 3 ||
          String(log.topics[0]).replace(/^0x/i, "").toLowerCase() !== transferEventTopic) continue;
      const blockNumber = parseHexInteger(log.blockNumber, "USDT event block number");
      const blockHash = log.blockHash;
      const transactionHash = log.transactionHash;
      const logIndex = parseHexInteger(log.logIndex, "USDT event index");
      const fromTopic = log.topics[1];
      const toTopic = log.topics[2];
      if (typeof blockHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(blockHash) ||
          scannedBlockHashes.get(blockNumber.toString()) !== blockHash.toLowerCase() ||
          typeof transactionHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(transactionHash) ||
          typeof fromTopic !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(fromTopic) ||
          typeof toTopic !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(toTopic) ||
          `0x${toTopic.slice(-40).toLowerCase()}` !== config.normalizedAddress ||
          logIndex > 1_147_483_647n) continue;
      const amount = parseHexInteger(log.data, "USDT event amount");
      if (amount === 0n) continue;
      transfers.push({
        chain: "BNB",
        transactionHash,
        transferIndex: 1_000_000_000 + Number(logIndex),
        blockNumber,
        blockHash,
        fromAddress: `0x${fromTopic.slice(-40).toLowerCase()}`,
        toAddress: config.normalizedAddress,
        asset: "USDT-BEP20",
        amountBaseUnits: amount.toString()
      });
    }
  }
  return { head, transfers, scannedTo };
}

function tronBlockUrl(baseUrl: URL, method: string): URL {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/wallet/${method}`;
  url.search = "";
  return url;
}

async function collectTron(config: ChainConfig, cursor: bigint): Promise<{ head: bigint; transfers: ObservedTransfer[]; scannedTo: bigint }> {
  const headResult = await postJson(tronBlockUrl(config.rpcUrl, "getnowblock"), {});
  if (!isRecord(headResult) || !isRecord(headResult.block_header) || !isRecord(headResult.block_header.raw_data)) {
    throw new Error("TRON RPC failed to return the chain head.");
  }
  const head = BigInt(String(headResult.block_header.raw_data.number));
  if (head < 0n) throw new Error("TRON RPC returned an invalid chain head.");
  const safeHead = head > config.confirmations ? head - config.confirmations : 0n;
  const from = cursor + 1n > config.startBlock ? cursor + 1n : config.startBlock;
  const scannedTo = safeHead < from ? cursor : (safeHead - from + 1n > maxBlocksPerSync ? from + maxBlocksPerSync - 1n : safeHead);
  const transfers: ObservedTransfer[] = [];

  for (let number = from; number <= scannedTo; number += 1n) {
    if (number > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("TRON block number exceeds the safe RPC integer range.");
    }
    const result = await postJson(tronBlockUrl(config.rpcUrl, "getblockbynum"), { num: Number(number) });
    if (!isRecord(result) || !isRecord(result.block_header) || !isRecord(result.block_header.raw_data)) {
      throw new Error(`TRON RPC failed to return block ${number}.`);
    }
    const blockNumber = BigInt(String(result.block_header.raw_data.number));
    const blockHash = result.blockID;
    if (blockNumber !== number || typeof blockHash !== "string" || !/^[0-9a-fA-F]{64}$/.test(blockHash)) {
      throw new Error(`TRON RPC returned inconsistent block ${number}.`);
    }
    const verifiedBlockHash = String(blockHash);
    const transactions = Array.isArray(result.transactions) ? result.transactions : [];
    for (const [transactionIndex, transaction] of transactions.entries()) {
      if (!isRecord(transaction) || typeof transaction.txID !== "string" || !isRecord(transaction.raw_data) ||
          !Array.isArray(transaction.ret) ||
          transaction.ret.length === 0 ||
          !transaction.ret.every((outcome) => isRecord(outcome) && outcome.contractRet === "SUCCESS")) continue;
      const transactionHash = transaction.txID;
      const contracts = transaction.raw_data.contract;
      if (!Array.isArray(contracts)) continue;
      contracts.forEach((contract, contractIndex) => {
        if (!isRecord(contract) || contract.type !== "TransferContract" ||
            !isRecord(contract.parameter) || !isRecord(contract.parameter.value)) return;
        const value = contract.parameter.value;
        if (typeof value.owner_address !== "string" || typeof value.to_address !== "string") return;
        const fromAddress = normalizeTronAddress(value.owner_address);
        const toAddress = normalizeTronAddress(value.to_address);
        if (fromAddress !== config.normalizedAddress && toAddress !== config.normalizedAddress) return;
        const amount = BigInt(String(value.amount));
        if (amount <= 0n) return;
        transfers.push({
          chain: "TRON",
          transactionHash,
          transferIndex: transactionIndex * 1_000 + contractIndex,
          blockNumber,
          blockHash: verifiedBlockHash,
          fromAddress: formatTronAddress(value.owner_address),
          toAddress: formatTronAddress(value.to_address),
          asset: "TRX",
          amountBaseUnits: amount.toString()
        });
      });
      if (!config.usdtContract || !contracts.some((contract) => {
        if (!isRecord(contract) || contract.type !== "TriggerSmartContract" ||
            !isRecord(contract.parameter) || !isRecord(contract.parameter.value) ||
            typeof contract.parameter.value.contract_address !== "string") return false;
        return matchesTronAddress(contract.parameter.value.contract_address, config.usdtContract as string);
      })) continue;

      const info = await postJson(tronBlockUrl(config.rpcUrl, "gettransactioninfobyid"), { value: transactionHash });
      if (!isRecord(info) || info.blockNumber !== Number(number) || !isRecord(info.receipt) ||
          info.receipt.result !== "SUCCESS" || !Array.isArray(info.log)) continue;
      info.log.forEach((log, eventIndex) => {
        if (!isRecord(log) || tronLogAddress(log.address) !== config.usdtContract ||
            !Array.isArray(log.topics) || log.topics.length < 3 ||
            String(log.topics[0]).replace(/^0x/i, "").toLowerCase() !== transferEventTopic) return;
        const fromTopic = typeof log.topics[1] === "string" ? log.topics[1].replace(/^0x/i, "") : "";
        const toTopic = typeof log.topics[2] === "string" ? log.topics[2].replace(/^0x/i, "") : "";
        const data = typeof log.data === "string" ? log.data.replace(/^0x/i, "") : "";
        if (!/^[0-9a-fA-F]{64}$/.test(fromTopic) || !/^[0-9a-fA-F]{64}$/.test(toTopic) ||
            !/^[0-9a-fA-F]{1,64}$/.test(data)) return;
        const fromAddress = normalizeTronAddress(`41${fromTopic.slice(-40)}`);
        const toAddress = normalizeTronAddress(`41${toTopic.slice(-40)}`);
        if (toAddress !== config.normalizedAddress) return;
        const amount = BigInt(`0x${data}`);
        if (amount === 0n) return;
        transfers.push({
          chain: "TRON",
          transactionHash,
          transferIndex: 1_000_000_000 + eventIndex,
          blockNumber,
          blockHash: verifiedBlockHash,
          fromAddress: formatTronAddress(fromAddress),
          toAddress: formatTronAddress(toAddress),
          asset: "USDT-TRC20",
          amountBaseUnits: amount.toString()
        });
      });
    }
  }
  return { head, transfers, scannedTo };
}

export function requireTreasuryReadAccess(role: Role) {
  const allowedRoles: Role[] = [Role.FOUNDER, Role.SUPER_ADMIN, Role.FINANCE_ADMIN, Role.COMPLIANCE_OFFICER];
  if (!allowedRoles.includes(role)) {
    throw new AuthorizationError(403, "Treasury observation access is restricted to authorized finance and governance roles.");
  }
}

export function requireTreasurySyncAccess(role: Role) {
  if (role !== Role.FOUNDER && role !== Role.SUPER_ADMIN) {
    throw new AuthorizationError(403, "Platform administrator role required to sync treasury observations.");
  }
}

export async function listTreasuryTransfers() {
  return prisma.treasuryTransfer.findMany({
    orderBy: [{ blockNumber: "desc" }, { observedAt: "desc" }],
    take: pageSize
  });
}

export async function getTreasuryCursors() {
  return prisma.treasuryCursor.findMany({ orderBy: { chain: "asc" } });
}

export async function syncTreasuryObservations() {
  const results: Array<{ chain: TreasuryChain; status: string; scannedFrom: string | null; scannedTo: string | null; head: string | null; transfersRecorded: number }> = [];
  for (const chain of chainNames) {
    const config = getChainConfig(chain);
    if (!config) {
      results.push({ chain, status: "NOT_CONFIGURED", scannedFrom: null, scannedTo: null, head: null, transfersRecorded: 0 });
      continue;
    }

    const cursorRecord = await prisma.treasuryCursor.findUnique({ where: { chain } });
    const cursor = cursorRecord ? BigInt(cursorRecord.lastScannedBlock) : config.startBlock - 1n;
    const collected = chain === "TRON"
      ? await collectTron(config, cursor)
      : await collectBnb(config, cursor);
    const scannedFrom = cursor + 1n > config.startBlock ? cursor + 1n : config.startBlock;
    if (collected.scannedTo >= scannedFrom) {
      await prisma.$transaction(async (transaction) => {
        await transaction.treasuryTransfer.createMany({
          data: collected.transfers as Prisma.TreasuryTransferCreateManyInput[],
          skipDuplicates: true
        });
        await transaction.treasuryCursor.upsert({
          where: { chain },
          create: { chain, lastScannedBlock: collected.scannedTo },
          update: { lastScannedBlock: collected.scannedTo }
        });
      });
    }
    results.push({
      chain,
      status: collected.scannedTo >= scannedFrom ? "SYNCED" : "UP_TO_DATE",
      scannedFrom: collected.scannedTo >= scannedFrom ? scannedFrom.toString() : null,
      scannedTo: collected.scannedTo >= scannedFrom ? collected.scannedTo.toString() : null,
      head: collected.head.toString(),
      transfersRecorded: collected.transfers.length
    });
  }
  return results;
}
