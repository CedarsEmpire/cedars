import { describe, expect, it } from "vitest";
import { resolveConsolidatedApiRoute } from "../src/server/consolidated-api-routes.js";

describe("consolidated Hobby API routes", () => {
  it.each([
    ["/api/health", "/api/health"],
    ["/api/ready", "/api/ready"],
    ["/api/auth/config", "/api/auth/config"],
    ["/api/grids", "/api/grids"],
    ["/api/modules", "/api/modules"],
    ["/api/operations/summary", "/api/operations/summary"],
    ["/api/customer/overview", "/api/customer/overview"],
    ["/api/admin/approvals", "/api/admin/approvals"],
    ["/api/tasks", "/api/tasks"]
  ])("resolves %s", (path, expected) => {
    expect(resolveConsolidatedApiRoute(path)).toBe(expected);
  });

  it.each([
    ["/api/admin/approvals/approval-123", "/api/admin/approvals/:approval"],
    ["/api/tasks/task-123", "/api/tasks/:task"]
  ])("resolves parameterized route %s", (path, expected) => {
    expect(resolveConsolidatedApiRoute(path)).toBe(expected);
  });

  it("normalizes a trailing slash", () => {
    expect(resolveConsolidatedApiRoute("/api/health/")).toBe("/api/health");
    expect(resolveConsolidatedApiRoute("/api/tasks/")).toBe("/api/tasks");
    expect(resolveConsolidatedApiRoute("/api/tasks/task-123/")).toBe("/api/tasks/:task");
  });

  it("does not claim routes outside the consolidated API surface", () => {
    expect(resolveConsolidatedApiRoute("/api/admin/treasury")).toBeUndefined();
    expect(resolveConsolidatedApiRoute("/api/not-a-route")).toBeUndefined();
    expect(resolveConsolidatedApiRoute("/api/tasks/task-123/extra")).toBeUndefined();
    expect(resolveConsolidatedApiRoute("/api/admin/approvals/")).toBe("/api/admin/approvals");
  });
});
