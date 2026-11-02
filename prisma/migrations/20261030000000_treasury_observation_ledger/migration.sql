CREATE TABLE "treasury_transfers" (
    "id" UUID NOT NULL,
    "chain" VARCHAR(10) NOT NULL,
    "transaction_hash" VARCHAR(128) NOT NULL,
    "transfer_index" INTEGER NOT NULL,
    "block_number" BIGINT NOT NULL,
    "block_hash" VARCHAR(128) NOT NULL,
    "from_address" VARCHAR(128) NOT NULL,
    "to_address" VARCHAR(128) NOT NULL,
    "asset" VARCHAR(16) NOT NULL,
    "amount_base_units" VARCHAR(100) NOT NULL,
    "observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "treasury_transfers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "treasury_transfers_chain_transaction_hash_transfer_index_key"
    ON "treasury_transfers"("chain", "transaction_hash", "transfer_index");
CREATE INDEX "treasury_transfers_chain_block_number_idx"
    ON "treasury_transfers"("chain", "block_number");
CREATE INDEX "treasury_transfers_observed_at_idx"
    ON "treasury_transfers"("observed_at");

CREATE TABLE "treasury_cursors" (
    "chain" VARCHAR(10) NOT NULL,
    "last_scanned_block" BIGINT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "treasury_cursors_pkey" PRIMARY KEY ("chain")
);
