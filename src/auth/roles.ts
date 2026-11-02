import { z } from "zod";
import type { JWTPayload } from "jose";

export const allowedRoles = [
  "SUPER_ADMIN",
  "FOUNDER",
  "INVESTOR",
  "PARTNER",
  "FINANCE_ADMIN",
  "COMPLIANCE_OFFICER",
  "HEALTHCARE_ADMIN",
  "EDUCATION_ADMIN",
  "USER"
] as const;

const roleSchema = z.enum(allowedRoles);

export function parseRoleClaim(payload: JWTPayload, claimName: string) {
  if (typeof claimName !== "string" || claimName.trim() === "") {
    return { success: false as const, error: "Claim name is missing." };
  }

  const value = payload[claimName];
  if (typeof value !== "string") {
    return { success: false as const, error: "Claim value is not a string." };
  }

  return roleSchema.safeParse(value);
}
