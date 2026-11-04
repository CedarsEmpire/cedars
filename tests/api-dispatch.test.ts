import { describe, expect, it } from "vitest";
import { resolveConsolidatedApiRoute } from "../src/server/consolidated-api-routes.js";

describe("consolidated Hobby API routes", () => {
  it.each([
    ["/api/health", "/api/health"],
    ["/api/ready", "/api/ready"],
    ["/api/auth/config", "/api/auth/config"],
    ["/api/grids", "/api/grids"],
    ["/api/modules", "/api/modules"],
    ["/api/operations/summary", "/api/operations/summary"]
  ])("resolves %s", (path, expected) => {
    expect(resolveConsolidatedApiRoute(path)).toBe(expected);
  });

  it("normalizes a trailing slash", () => {
    expect(resolveConsolidatedApiRoute("/api/health/")).toBe("/api/health");
  });

  it("does not claim routes handled by dedicated functions", () => {
    expect(resolveConsolidatedApiRoute("/api/tasks")).toBeUndefined();
    expect(resolveConsolidatedApiRoute("/api/admin/treasury")).toBeUndefined();
    expect(resolveConsolidatedApiRoute("/api/not-a-route")).toBeUndefined();
  });
});