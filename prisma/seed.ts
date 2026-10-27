import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const moduleNames = [
  "money_grid",
  "wallet",
  "ledger",
  "ai_iq",
  "sales_ai",
  "opportunity_ai",
  "support_ai",
  "healthcare_ai",
  "education_ai",
  "contribution_grid",
  "collective_memory",
  "civilization_ledger",
  "innovation_dome",
  "simulation_grid",
  "ai_twins",
  "synthetic_reality",
  "blockchain_trust",
  "collective_intelligence",
  "admin_control_center"
];

async function main() {
  await prisma.featureFlag.createMany({
    data: moduleNames.map((moduleName) => ({ moduleName, enabled: false })),
    skipDuplicates: true
  });
}

main()
  .catch((error: unknown) => {
    console.error("Feature flag seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });