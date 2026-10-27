import { PrismaClient } from "@prisma/client";

const prismaGlobal = globalThis as typeof globalThis & { cedarsPrisma?: PrismaClient };

export const prisma = prismaGlobal.cedarsPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") prismaGlobal.cedarsPrisma = prisma;