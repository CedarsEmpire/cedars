import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { disconnect } = vi.hoisted(() => ({
  disconnect: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    $queryRaw = vi.fn().mockRejectedValue(new Error("database unavailable"));
    $disconnect = disconnect;
  }
}));

const originalEnvironment = {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  CEDARS_USE_IN_MEMORY_DB: process.env.CEDARS_USE_IN_MEMORY_DB
};

function clearCachedClient() {
  delete (globalThis as typeof globalThis & { cedarsPrisma?: unknown }).cedarsPrisma;
}

describe("production database configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    disconnect.mockClear();
    clearCachedClient();
    process.env.NODE_ENV = "production";
    delete process.env.CEDARS_USE_IN_MEMORY_DB;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    clearCachedClient();
  });

  it("fails closed when the production database is not configured", async () => {
    delete process.env.DATABASE_URL;

    await expect(import("../src/db.js")).rejects.toThrow("DATABASE_URL must be configured in production.");
  });

  it("fails closed on database connection failure instead of using memory", async () => {
    process.env.DATABASE_URL = "postgresql://cedars:test@db.example.invalid/cedars";

    await expect(import("../src/db.js")).rejects.toThrow(
      "Production database connection failed; refusing to use in-memory storage."
    );
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("rejects the in-memory override in production", async () => {
    process.env.CEDARS_USE_IN_MEMORY_DB = "1";
    delete process.env.DATABASE_URL;

    await expect(import("../src/db.js")).rejects.toThrow("CEDARS_USE_IN_MEMORY_DB is not permitted in production.");
  });
});
