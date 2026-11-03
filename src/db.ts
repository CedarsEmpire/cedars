import { ApprovalDecisionType, ApprovalStatus, GridTaskStatus, PrismaClient, type Role } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { moduleNames } from "./features/module-catalog.js";
import { gridCatalog } from "./features/grid-catalog.js";
import { workerCatalog } from "./features/worker-catalog.js";

type UserRecord = {
  id: string;
  externalSubject: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};

type FeatureFlagRecord = {
  id: string;
  moduleName: string;
  enabled: boolean;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type AuditLogRecord = {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
};

type WorkerConfigRecord = {
  id: string;
  enabled: boolean;
  desiredInstances: number;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type GridConfigRecord = {
  id: string;
  desiredState: "STANDBY" | "WORKING" | "MAINTENANCE";
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type GridTaskRecord = {
  id: string;
  buyerId: string;
  gridId: string;
  workerId: string | null;
  title: string;
  description: string;
  acceptanceCriteria: string;
  agreedAmount: string;
  currency: string;
  status: GridTaskStatus;
  deliveryEvidence: string | null;
  deliveredAt: Date | null;
  acceptedById: string | null;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type TreasuryTransferRecord = {
  id: string;
  chain: string;
  transactionHash: string;
  transferIndex: number;
  blockNumber: bigint;
  blockHash: string;
  fromAddress: string;
  toAddress: string;
  asset: string;
  amountBaseUnits: string;
  observedAt: Date;
};

type TreasuryCursorRecord = {
  chain: string;
  lastScannedBlock: bigint;
  updatedAt: Date;
};

type ApprovalRequestRecord = {
  id: string;
  scope: string;
  entityType: string;
  entityId: string;
  expectedState: Record<string, unknown>;
  proposedState: Record<string, unknown>;
  requiredApproverRoles: Role[];
  reason: string;
  status: ApprovalStatus;
  version: number;
  requestedById: string;
  requestedByRole: Role;
  createdAt: Date;
  resolvedAt: Date | null;
};

type ApprovalDecisionRecord = {
  id: string;
  requestId: string;
  reviewerId: string;
  reviewerRole: Role;
  decision: ApprovalDecisionType;
  reason: string;
  createdAt: Date;
};

function createInMemoryPrisma() {
  const users = new Map<string, UserRecord>();
  const usersById = new Map<string, UserRecord>();
  const featureFlags = new Map<string, FeatureFlagRecord>();
  const workerConfigs = new Map<string, WorkerConfigRecord>();
  const gridConfigs = new Map<string, GridConfigRecord>();
  const gridTasks = new Map<string, GridTaskRecord>();
  const treasuryTransfers = new Map<string, TreasuryTransferRecord>();
  const treasuryCursors = new Map<string, TreasuryCursorRecord>();
  const approvalRequests = new Map<string, ApprovalRequestRecord>();
  const approvalDecisions = new Map<string, ApprovalDecisionRecord>();
  const auditLogs: AuditLogRecord[] = [];
  for (const moduleName of moduleNames) {
    featureFlags.set(moduleName, {
      id: randomUUID(),
      moduleName,
      enabled: false,
      updatedById: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  for (const worker of workerCatalog) {
    workerConfigs.set(worker.id, {
      id: worker.id,
      enabled: false,
      desiredInstances: 1,
      updatedById: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  for (const grid of gridCatalog) {
    gridConfigs.set(grid.id, {
      id: grid.id,
      desiredState: "STANDBY",
      updatedById: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  const sortByUpdatedAtDesc = <T extends { updatedAt: Date }>(records: T[]) =>
    [...records].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

  const normalizeUser = (record: UserRecord) => ({
    ...record,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  });

  const normalizeFlag = (record: FeatureFlagRecord) => ({
    ...record,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  });

  const normalizeAuditLog = (record: AuditLogRecord) => ({
    ...record,
    createdAt: new Date(record.createdAt),
    payload: { ...record.payload }
  });

  const normalizeWorkerConfig = (record: WorkerConfigRecord) => ({
    ...record,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  });

  const normalizeGridConfig = (record: GridConfigRecord) => ({
    ...record,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  });

  const normalizeGridTask = (record: GridTaskRecord) => ({
    ...record,
    deliveredAt: record.deliveredAt ? new Date(record.deliveredAt) : null,
    acceptedAt: record.acceptedAt ? new Date(record.acceptedAt) : null,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  });

  const treasuryTransferStore = {
    createMany: async ({ data, skipDuplicates }: {
      data: Omit<TreasuryTransferRecord, "id" | "observedAt">[];
      skipDuplicates?: boolean;
    }) => {
      let count = 0;
      for (const item of data) {
        const key = `${item.chain}:${item.transactionHash}:${item.transferIndex}`;
        if (treasuryTransfers.has(key)) {
          if (skipDuplicates) continue;
          throw new Error("Duplicate treasury transfer.");
        }
        treasuryTransfers.set(key, { ...item, id: randomUUID(), observedAt: new Date() });
        count += 1;
      }
      return { count };
    },
    findMany: async ({ take, orderBy }: {
      take?: number;
      orderBy?: Array<{ blockNumber?: "asc" | "desc"; observedAt?: "asc" | "desc" }>;
    } = {}) => {
      const rows = [...treasuryTransfers.values()];
      const direction = orderBy?.[0]?.blockNumber === "asc" ? 1 : -1;
      rows.sort((left, right) => direction * (left.blockNumber === right.blockNumber
        ? left.observedAt.getTime() - right.observedAt.getTime()
        : left.blockNumber < right.blockNumber ? -1 : 1));
      return rows.slice(0, take).map((record) => ({ ...record, observedAt: new Date(record.observedAt) }));
    }
  };

  const treasuryCursorStore = {
    findUnique: async ({ where }: { where: { chain: string } }) => {
      const record = treasuryCursors.get(where.chain);
      return record ? { ...record, updatedAt: new Date(record.updatedAt) } : null;
    },
    findMany: async ({ orderBy }: { orderBy?: { chain?: "asc" | "desc" } } = {}) => {
      const rows = [...treasuryCursors.values()];
      if (orderBy?.chain) rows.sort((left, right) => left.chain.localeCompare(right.chain) * (orderBy.chain === "asc" ? 1 : -1));
      return rows.map((record) => ({ ...record, updatedAt: new Date(record.updatedAt) }));
    },
    upsert: async ({ where, create, update }: {
      where: { chain: string };
      create: { chain: string; lastScannedBlock: bigint };
      update: { lastScannedBlock: bigint };
    }) => {
      const current = treasuryCursors.get(where.chain);
      const record = {
        chain: where.chain,
        lastScannedBlock: update.lastScannedBlock ?? current?.lastScannedBlock ?? create.lastScannedBlock,
        updatedAt: new Date()
      };
      treasuryCursors.set(where.chain, record);
      return { ...record, updatedAt: new Date(record.updatedAt) };
    }
  };

  const userStore = {
    findUnique: async ({ where }: { where: { id?: string; externalSubject?: string } }) => {
      const record = where.externalSubject
        ? users.get(where.externalSubject)
        : where.id ? usersById.get(where.id) : undefined;
      return record ? normalizeUser(record) : null;
    },
    upsert: async ({ where, create, update }: { where: { externalSubject: string }; create: { externalSubject: string; role: Role }; update: Partial<{ role: Role }> }) => {
      const current = users.get(where.externalSubject);
      if (current) {
        const next: UserRecord = {
          ...current,
          role: update.role ?? current.role,
          updatedAt: new Date()
        };
        users.set(where.externalSubject, next);
        usersById.set(next.id, next);
        return normalizeUser(next);
      }

      const created: UserRecord = {
        id: randomUUID(),
        externalSubject: create.externalSubject,
        role: create.role,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      users.set(created.externalSubject, created);
      usersById.set(created.id, created);
      return normalizeUser(created);
    }
  };

  const featureFlagStore = {
    findMany: async ({ orderBy }: { orderBy?: { moduleName?: "asc" | "desc"; updatedAt?: "asc" | "desc" } } = {}) => {
      const rows = Array.from(featureFlags.values());
      const sorted = orderBy?.moduleName
        ? [...rows].sort((left, right) => left.moduleName.localeCompare(right.moduleName) * (orderBy.moduleName === "asc" ? 1 : -1))
        : orderBy?.updatedAt
          ? sortByUpdatedAtDesc(rows)
          : rows;
      return sorted.map((record) => normalizeFlag(record));
    },
    count: async ({ where }: { where?: { enabled?: boolean } } = {}) => {
      const rows = Array.from(featureFlags.values());
      const filtered = where?.enabled === undefined ? rows : rows.filter((record) => record.enabled === where.enabled);
      return filtered.length;
    },
    findFirst: async ({ orderBy, select }: { orderBy?: { updatedAt?: "asc" | "desc" }; select?: Record<string, unknown> } = {}) => {
      const rows = sortByUpdatedAtDesc(Array.from(featureFlags.values()));
      const record = rows[0];
      if (!record) return null;
      if (!select) return normalizeFlag(record);
      return Object.fromEntries(
        Object.keys(select).map((key) => [key, key === "moduleName" ? record.moduleName : key === "updatedAt" ? record.updatedAt : record[key as keyof FeatureFlagRecord]])
      );
    },
    findUnique: async ({ where }: { where: { moduleName: string } }) => {
      const record = featureFlags.get(where.moduleName);
      return record ? normalizeFlag(record) : null;
    },
    upsert: async ({ where, create, update }: { where: { moduleName: string }; create: { moduleName: string; enabled: boolean; updatedById?: string | null }; update: Partial<{ enabled: boolean; updatedById: string | null }> }) => {
      const current = featureFlags.get(where.moduleName);
      if (current) {
        const next: FeatureFlagRecord = {
          ...current,
          enabled: update.enabled ?? current.enabled,
          updatedById: update.updatedById ?? current.updatedById,
          updatedAt: new Date()
        };
        featureFlags.set(where.moduleName, next);
        return normalizeFlag(next);
      }

      const created: FeatureFlagRecord = {
        id: randomUUID(),
        moduleName: create.moduleName,
        enabled: create.enabled,
        updatedById: create.updatedById ?? null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      featureFlags.set(created.moduleName, created);
      return normalizeFlag(created);
    }
  };

  const workerConfigStore = {
    findMany: async ({ orderBy }: { orderBy?: { id?: "asc" | "desc" } } = {}) => {
      const rows = Array.from(workerConfigs.values());
      const sorted = orderBy?.id
        ? [...rows].sort((left, right) => left.id.localeCompare(right.id) * (orderBy.id === "asc" ? 1 : -1))
        : rows;
      return sorted.map((record) => normalizeWorkerConfig(record));
    },
    count: async () => workerConfigs.size,
    findUnique: async ({ where }: { where: { id: string } }) => {
      const record = workerConfigs.get(where.id);
      return record ? normalizeWorkerConfig(record) : null;
    },
    upsert: async ({ where, create, update }: {
      where: { id: string };
      create: { id: string; enabled: boolean; desiredInstances: number; updatedById?: string | null };
      update: Partial<{ enabled: boolean; desiredInstances: number; updatedById: string | null }>;
    }) => {
      const current = workerConfigs.get(where.id);
      if (current) {
        const next: WorkerConfigRecord = {
          ...current,
          enabled: update.enabled ?? current.enabled,
          desiredInstances: update.desiredInstances ?? current.desiredInstances,
          updatedById: update.updatedById ?? current.updatedById,
          updatedAt: new Date()
        };
        workerConfigs.set(where.id, next);
        return normalizeWorkerConfig(next);
      }

      const created: WorkerConfigRecord = {
        id: create.id,
        enabled: create.enabled,
        desiredInstances: create.desiredInstances,
        updatedById: create.updatedById ?? null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      workerConfigs.set(created.id, created);
      return normalizeWorkerConfig(created);
    }
  };

  const gridConfigStore = {
    findMany: async ({ orderBy }: { orderBy?: { id?: "asc" | "desc" } } = {}) => {
      const rows = Array.from(gridConfigs.values());
      const sorted = orderBy?.id
        ? [...rows].sort((left, right) => left.id.localeCompare(right.id) * (orderBy.id === "asc" ? 1 : -1))
        : rows;
      return sorted.map((record) => normalizeGridConfig(record));
    },
    count: async () => gridConfigs.size,
    findUnique: async ({ where }: { where: { id: string } }) => {
      const record = gridConfigs.get(where.id);
      return record ? normalizeGridConfig(record) : null;
    },
    upsert: async ({ where, create, update }: {
      where: { id: string };
      create: { id: string; desiredState: GridConfigRecord["desiredState"]; updatedById?: string | null };
      update: Partial<{ desiredState: GridConfigRecord["desiredState"]; updatedById: string | null }>;
    }) => {
      const current = gridConfigs.get(where.id);
      if (current) {
        const next: GridConfigRecord = {
          ...current,
          desiredState: update.desiredState ?? current.desiredState,
          updatedById: update.updatedById ?? current.updatedById,
          updatedAt: new Date()
        };
        gridConfigs.set(where.id, next);
        return normalizeGridConfig(next);
      }

      const created: GridConfigRecord = {
        id: create.id,
        desiredState: create.desiredState,
        updatedById: create.updatedById ?? null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      gridConfigs.set(created.id, created);
      return normalizeGridConfig(created);
    }
  };

  const gridTaskStore = {
    create: async ({ data }: { data: Omit<GridTaskRecord, "id" | "createdAt" | "updatedAt"> }) => {
      const now = new Date();
      const record: GridTaskRecord = { ...data, id: randomUUID(), createdAt: now, updatedAt: now };
      gridTasks.set(record.id, record);
      return normalizeGridTask(record);
    },
    findMany: async ({ where, orderBy }: {
      where?: Partial<Pick<GridTaskRecord, "buyerId" | "gridId" | "workerId" | "status">>;
      orderBy?: { createdAt?: "asc" | "desc" };
    } = {}) => {
      let rows = [...gridTasks.values()];
      if (where?.buyerId) rows = rows.filter((record) => record.buyerId === where.buyerId);
      if (where?.gridId) rows = rows.filter((record) => record.gridId === where.gridId);
      if (where?.workerId) rows = rows.filter((record) => record.workerId === where.workerId);
      if (where?.status) rows = rows.filter((record) => record.status === where.status);
      const direction = orderBy?.createdAt === "asc" ? 1 : -1;
      rows.sort((left, right) => direction * (left.createdAt.getTime() - right.createdAt.getTime()));
      return rows.map(normalizeGridTask);
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const record = gridTasks.get(where.id);
      return record ? normalizeGridTask(record) : null;
    },
    updateMany: async ({ where, data }: {
      where: { id: string; status?: GridTaskStatus };
      data: Partial<Omit<GridTaskRecord, "id" | "createdAt" | "buyerId">>;
    }) => {
      const current = gridTasks.get(where.id);
      if (!current || (where.status && current.status !== where.status)) return { count: 0 };
      const updated: GridTaskRecord = { ...current, ...data, updatedAt: new Date() };
      gridTasks.set(updated.id, updated);
      return { count: 1 };
    }
  };

  const auditLogStore = {
    create: async ({ data }: { data: { actorId: string; action: string; entityType: string; entityId: string; payload: Record<string, unknown> } }) => {
      const created: AuditLogRecord = {
        id: randomUUID(),
        actorId: data.actorId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        payload: { ...data.payload },
        createdAt: new Date()
      };
      auditLogs.push(created);
      return normalizeAuditLog(created);
    },
    findFirst: async ({ orderBy, select, where }: {
      orderBy?: { createdAt?: "asc" | "desc" };
      select?: Record<string, unknown>;
      where?: Record<string, unknown>;
    } = {}) => {
      let rows = [...auditLogs];
      if (where?.entityType) {
        rows = rows.filter((record) => record.entityType === where.entityType);
      }
      if (where?.entityId) {
        rows = rows.filter((record) => record.entityId === where.entityId);
      }
      const actorFilter = where && typeof where.actor === "object" && where.actor !== null ? where.actor as Record<string, unknown> : undefined;
      const actorRole = actorFilter?.is && typeof actorFilter.is === "object" && actorFilter.is !== null
        ? (actorFilter.is as Record<string, unknown>).role
        : undefined;
      if (actorRole) {
        rows = rows.filter((record) => {
          const actor = usersById.get(record.actorId);
          return actor?.role === actorRole;
        });
      }
      rows.sort((left, right) => {
        const direction = orderBy?.createdAt === "asc" ? 1 : -1;
        return direction * (left.createdAt.getTime() - right.createdAt.getTime());
      });
      const record = rows[rows.length - 1] ?? null;
      if (!record) return null;
      const actor = usersById.get(record.actorId);
      const base = { ...record, payload: { ...record.payload }, createdAt: new Date(record.createdAt) };
      if (!select) return base;
      const selected: Record<string, unknown> = {};
      for (const key of Object.keys(select)) {
        if (key === "actor") {
          selected.actor = actor ? { role: actor.role } : null;
          continue;
        }
        selected[key] = (base as Record<string, unknown>)[key];
      }
      return selected;
    },
    findMany: async ({ take, orderBy, select, where }: {
      take?: number;
      orderBy?: { createdAt?: "asc" | "desc" };
      select?: Record<string, unknown>;
      where?: Record<string, unknown>;
    } = {}) => {
      let rows = [...auditLogs];
      if (where?.entityType) {
        rows = rows.filter((record) => record.entityType === where.entityType);
      }
      if (where?.entityId) {
        rows = rows.filter((record) => record.entityId === where.entityId);
      }
      const actorFilter = where && typeof where.actor === "object" && where.actor !== null ? where.actor as Record<string, unknown> : undefined;
      const actorRole = actorFilter?.is && typeof actorFilter.is === "object" && actorFilter.is !== null
        ? (actorFilter.is as Record<string, unknown>).role
        : undefined;
      if (actorRole) {
        rows = rows.filter((record) => {
          const actor = usersById.get(record.actorId);
          return actor?.role === actorRole;
        });
      }
      rows.sort((left, right) => {
        const direction = orderBy?.createdAt === "asc" ? 1 : -1;
        return direction * (left.createdAt.getTime() - right.createdAt.getTime());
      });
      const limited = typeof take === "number" ? rows.slice(0, take) : rows;
      return limited.map((record) => {
        const actor = usersById.get(record.actorId);
        const base = { ...record, payload: { ...record.payload }, createdAt: new Date(record.createdAt) };
        if (!select) return base;
        const selected: Record<string, unknown> = {};
        for (const key of Object.keys(select)) {
          if (key === "actor") {
            selected.actor = actor ? { role: actor.role } : null;
            continue;
          }
          selected[key] = (base as Record<string, unknown>)[key];
        }
        return selected;
      });
    }
  };

  const approvalDecisionStore = {
    create: async ({ data }: { data: Omit<ApprovalDecisionRecord, "id" | "createdAt"> }) => {
      if ([...approvalDecisions.values()].some((record) => record.requestId === data.requestId && record.reviewerId === data.reviewerId)) {
        throw new Error("Reviewer has already decided this approval request.");
      }
      const record: ApprovalDecisionRecord = { ...data, id: randomUUID(), createdAt: new Date() };
      approvalDecisions.set(record.id, record);
      return { ...record };
    },
    findMany: async ({ where }: { where?: { requestId?: string } } = {}) => {
      const rows = [...approvalDecisions.values()].filter((record) => !where?.requestId || record.requestId === where.requestId);
      return rows.map((record) => ({ ...record }));
    }
  };

  const approvalRequestStore = {
    create: async ({ data }: { data: Omit<ApprovalRequestRecord, "id" | "createdAt" | "resolvedAt" | "version"> }) => {
      const record: ApprovalRequestRecord = {
        ...data,
        id: randomUUID(),
        status: ApprovalStatus.PENDING,
        version: 0,
        createdAt: new Date(),
        resolvedAt: null
      };
      approvalRequests.set(record.id, record);
      return { ...record };
    },
    findMany: async ({ where, orderBy, take, include }: {
      where?: { status?: ApprovalStatus; entityType?: string; entityId?: string };
      orderBy?: { createdAt?: "asc" | "desc" };
      take?: number;
      include?: { decisions?: boolean };
    } = {}) => {
      let rows = [...approvalRequests.values()];
      if (where?.status) rows = rows.filter((record) => record.status === where.status);
      if (where?.entityType) rows = rows.filter((record) => record.entityType === where.entityType);
      if (where?.entityId) rows = rows.filter((record) => record.entityId === where.entityId);
      const direction = orderBy?.createdAt === "asc" ? 1 : -1;
      rows.sort((left, right) => direction * (left.createdAt.getTime() - right.createdAt.getTime()));
      if (typeof take === "number") rows = rows.slice(0, take);
      return rows.map((record) => ({
        ...record,
        expectedState: { ...record.expectedState },
        proposedState: { ...record.proposedState },
        requiredApproverRoles: [...record.requiredApproverRoles],
        ...(include?.decisions ? {
          decisions: [...approvalDecisions.values()]
            .filter((decision) => decision.requestId === record.id)
            .map((decision) => ({ ...decision }))
        } : {})
      }));
    },
    findUnique: async ({ where, include }: { where: { id: string }; include?: { decisions?: boolean } }) => {
      const record = approvalRequests.get(where.id);
      if (!record) return null;
      return {
        ...record,
        expectedState: { ...record.expectedState },
        proposedState: { ...record.proposedState },
        requiredApproverRoles: [...record.requiredApproverRoles],
        ...(include?.decisions ? {
          decisions: [...approvalDecisions.values()]
            .filter((decision) => decision.requestId === record.id)
            .map((decision) => ({ ...decision }))
        } : {})
      };
    },
    updateMany: async ({ where, data }: {
      where: { id: string; status?: ApprovalStatus; version?: number };
      data: Partial<Pick<ApprovalRequestRecord, "status" | "resolvedAt" | "version">>;
    }) => {
      const current = approvalRequests.get(where.id);
      if (!current || (where.status && current.status !== where.status) ||
          (where.version !== undefined && current.version !== where.version)) return { count: 0 };
      approvalRequests.set(where.id, { ...current, ...data });
      return { count: 1 };
    }
  };

  type MemoryTransaction = {
    user: typeof userStore;
    featureFlag: typeof featureFlagStore;
    workerConfig: typeof workerConfigStore;
    gridConfig: typeof gridConfigStore;
    gridTask: typeof gridTaskStore;
    treasuryTransfer: typeof treasuryTransferStore;
    treasuryCursor: typeof treasuryCursorStore;
    auditLog: typeof auditLogStore;
    approvalRequest: typeof approvalRequestStore;
    approvalDecision: typeof approvalDecisionStore;
  };

  const transaction: MemoryTransaction = {
    user: userStore,
    featureFlag: featureFlagStore,
    workerConfig: workerConfigStore,
    gridConfig: gridConfigStore,
    gridTask: gridTaskStore,
    treasuryTransfer: treasuryTransferStore,
    treasuryCursor: treasuryCursorStore,
    auditLog: auditLogStore,
    approvalRequest: approvalRequestStore,
    approvalDecision: approvalDecisionStore
  };

  return {
    user: userStore,
    featureFlag: featureFlagStore,
    workerConfig: workerConfigStore,
    gridConfig: gridConfigStore,
    gridTask: gridTaskStore,
    treasuryTransfer: treasuryTransferStore,
    treasuryCursor: treasuryCursorStore,
    auditLog: auditLogStore,
    approvalRequest: approvalRequestStore,
    approvalDecision: approvalDecisionStore,
    $queryRaw: async () => [{ "?column?": 1 }],
    $transaction: async <T>(callback: (transaction: MemoryTransaction) => Promise<T>) => callback(transaction),
    $disconnect: async () => undefined
  } as unknown as PrismaClient;
}

const prismaGlobal = globalThis as typeof globalThis & { cedarsPrisma?: PrismaClient | ReturnType<typeof createInMemoryPrisma> };

async function createPrismaClient() {
  const forceMemory = process.env.CEDARS_USE_IN_MEMORY_DB === "1";
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && forceMemory) {
    throw new Error("CEDARS_USE_IN_MEMORY_DB is not permitted in production.");
  }
  if (forceMemory) {
    return createInMemoryPrisma();
  }
  if (!process.env.DATABASE_URL) {
    if (!isProduction) return createInMemoryPrisma();
    throw new Error("DATABASE_URL must be configured in production.");
  }

  const client = new PrismaClient();
  try {
    await client.$queryRaw`SELECT 1`;
    return client;
  } catch (error) {
    await client.$disconnect();
    if (!isProduction) return createInMemoryPrisma();
    throw new Error("Production database connection failed; refusing to use in-memory storage.", { cause: error });
  }
}

export const prisma = (prismaGlobal.cedarsPrisma ?? await createPrismaClient()) as PrismaClient;

if (process.env.NODE_ENV !== "production") prismaGlobal.cedarsPrisma = prisma;