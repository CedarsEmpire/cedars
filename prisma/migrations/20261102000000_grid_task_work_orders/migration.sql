CREATE TYPE "GridTaskStatus" AS ENUM (
    'OPEN',
    'ASSIGNED',
    'IN_PROGRESS',
    'DELIVERED',
    'ACCEPTED',
    'CANCELLED'
);

CREATE TABLE "grid_tasks" (
    "id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "grid_id" VARCHAR(60) NOT NULL,
    "worker_id" VARCHAR(60),
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "acceptance_criteria" TEXT NOT NULL,
    "agreed_amount" DECIMAL(20,8) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "GridTaskStatus" NOT NULL DEFAULT 'OPEN',
    "delivery_evidence" TEXT,
    "delivered_at" TIMESTAMP(3),
    "accepted_by_id" UUID,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "grid_tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "grid_tasks_agreed_amount_positive" CHECK ("agreed_amount" > 0),
    CONSTRAINT "grid_tasks_currency_uppercase" CHECK ("currency" ~ '^[A-Z]{3}$')
);

CREATE INDEX "grid_tasks_buyer_id_created_at_idx" ON "grid_tasks"("buyer_id", "created_at");
CREATE INDEX "grid_tasks_grid_id_status_created_at_idx" ON "grid_tasks"("grid_id", "status", "created_at");
CREATE INDEX "grid_tasks_worker_id_status_created_at_idx" ON "grid_tasks"("worker_id", "status", "created_at");

ALTER TABLE "grid_tasks"
    ADD CONSTRAINT "grid_tasks_buyer_id_fkey"
    FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "grid_tasks"
    ADD CONSTRAINT "grid_tasks_accepted_by_id_fkey"
    FOREIGN KEY ("accepted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;