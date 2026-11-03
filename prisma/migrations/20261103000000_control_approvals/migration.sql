CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ApprovalDecisionType" AS ENUM ('APPROVE', 'REJECT');

CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL,
    "scope" VARCHAR(60) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(100) NOT NULL,
    "expected_state" JSONB NOT NULL,
    "proposed_state" JSONB NOT NULL,
    "required_approver_roles" "Role"[] NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 0,
    "requested_by_id" UUID NOT NULL,
    "requested_by_role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "approval_decisions" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "reviewer_role" "Role" NOT NULL,
    "decision" "ApprovalDecisionType" NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approval_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "approval_requests_status_created_at_idx" ON "approval_requests"("status", "created_at");
CREATE INDEX "approval_requests_entity_type_entity_id_status_idx" ON "approval_requests"("entity_type", "entity_id", "status");
CREATE UNIQUE INDEX "approval_decisions_request_id_reviewer_id_key" ON "approval_decisions"("request_id", "reviewer_id");
CREATE INDEX "approval_decisions_reviewer_id_created_at_idx" ON "approval_decisions"("reviewer_id", "created_at");

ALTER TABLE "approval_requests"
    ADD CONSTRAINT "approval_requests_requested_by_id_fkey"
    FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "approval_decisions"
    ADD CONSTRAINT "approval_decisions_request_id_fkey"
    FOREIGN KEY ("request_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_decisions"
    ADD CONSTRAINT "approval_decisions_reviewer_id_fkey"
    FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;