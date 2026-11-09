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
CREATE INDEX "control_scope_configs_scope_type_enabled_idx"
    ON "control_scope_configs"("scope_type", "enabled");

ALTER TABLE "control_scope_configs"
    ADD CONSTRAINT "control_scope_configs_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
