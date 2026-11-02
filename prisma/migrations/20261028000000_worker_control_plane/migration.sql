CREATE TABLE "worker_configs" (
    "id" VARCHAR(60) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "desired_instances" INTEGER NOT NULL DEFAULT 1,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "worker_configs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "worker_configs_desired_instances_check" CHECK ("desired_instances" BETWEEN 1 AND 10)
);

ALTER TABLE "worker_configs" ADD CONSTRAINT "worker_configs_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
