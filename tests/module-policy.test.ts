import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { AuthorizationError } from "../src/auth/authorization.js";
import { assertModuleUpdateAllowed, moduleNameSchema, updateModuleSchema } from "../src/features/modules.js";

describe("feature module policy", () => {
  it("rejects unknown modules", () => {
    expect(moduleNameSchema.safeParse("arbitrary_module").success).toBe(false);
  });

  it("allows a founder to disable a non-financial module", () => {
    expect(() => assertModuleUpdateAllowed(Role.FOUNDER, "healthcare_ai", false)).not.toThrow();
  });

  it("rejects a partner attempting to toggle a module", () => {
    expect(() => assertModuleUpdateAllowed(Role.PARTNER, "healthcare_ai", true)).toThrow(AuthorizationError);
  });

  it("requires a separate dual-approval workflow before enabling financial modules", () => {
    expect(() => assertModuleUpdateAllowed(Role.FOUNDER, "wallet", true)).toThrow(/dual-approval/);
    expect(() => assertModuleUpdateAllowed(Role.SUPER_ADMIN, "ledger", true)).toThrow(/dual-approval/);
  });

  it("validates bounded reason text and rejects extra fields", () => {
    expect(updateModuleSchema.safeParse({ enabled: false, reason: "Deployment paused" }).success).toBe(true);
    expect(updateModuleSchema.safeParse({ enabled: false, reason: "short" }).success).toBe(false);
    expect(updateModuleSchema.safeParse({ enabled: false, reason: "Valid reason", actorRole: "FOUNDER" }).success).toBe(false);
  });
});