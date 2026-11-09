-- Lock, validate and create the partial unique index in one atomic statement.
DO $$
BEGIN
  LOCK TABLE "approval_requests" IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (
    SELECT 1
    FROM "approval_requests"
    WHERE "status" = 'PENDING'
    GROUP BY "entity_type", "entity_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate pending control approvals exist; reconcile them before applying this migration.';
  END IF;
  EXECUTE 'CREATE UNIQUE INDEX "approval_requests_one_pending_per_target_key" ON "approval_requests"("entity_type", "entity_id") WHERE "status" = ''PENDING''';
END $$;

CREATE TABLE "control_scope_configs" (
    "id" UUID NOT NULL,
    "scope_type" VARCHAR(40) NOT NULL,
    "scope_id" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "control_scope_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "control_scope_configs_scope_type_scope_id_key"
    ON "control_scope_configs"("scope_type", "scope_id");

ALTER TABLE "control_scope_configs" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE "control_scope_configs" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE "control_scope_configs" FROM authenticated';
  END IF;
END $$;
CREATE INDEX "control_scope_configs_scope_type_enabled_idx"
    ON "control_scope_configs"("scope_type", "enabled");

ALTER TABLE "control_scope_configs"
    ADD CONSTRAINT "control_scope_configs_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "control_scope_configs"
    ADD COLUMN "control_version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "grid_configs"
    ADD COLUMN "authorized_global_control_version" INTEGER,
    ADD COLUMN "authorized_layer_control_version" INTEGER;
