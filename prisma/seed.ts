import { PrismaClient } from "@prisma/client";
import { moduleNames } from "../src/features/module-catalog.js";
import { gridCatalog } from "../src/features/grid-catalog.js";
import { workerCatalog } from "../src/features/worker-catalog.js";

const prisma = new PrismaClient();

async function main() {
  await prisma.featureFlag.createMany({
    data: moduleNames.map((moduleName) => ({ moduleName, enabled: false })),
    skipDuplicates: true
  });
  await prisma.workerConfig.createMany({
    data: workerCatalog.map((worker) => ({ id: worker.id, enabled: false, desiredInstances: 1 })),
    skipDuplicates: true
  });
  await prisma.gridConfig.createMany({
    data: gridCatalog.map((grid) => ({ id: grid.id, desiredState: "STANDBY" })),
    skipDuplicates: true
  });
}

main()
  .catch((error: unknown) => {
    console.error("CEDARS configuration seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });