CREATE TABLE "grid_configs" (
    "id" VARCHAR(60) NOT NULL,
    "desired_state" VARCHAR(20) NOT NULL DEFAULT 'STANDBY',
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "grid_configs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "grid_configs_desired_state_check" CHECK ("desired_state" IN ('STANDBY', 'WORKING', 'MAINTENANCE'))
);

ALTER TABLE "grid_configs" ADD CONSTRAINT "grid_configs_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;