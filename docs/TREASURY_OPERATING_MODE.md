# CEDARS Treasury — enabled observation, execution locked

## Confirmed public receiving addresses

| Network | Address | Native asset |
| --- | --- | --- |
| TRON mainnet | `TE26B7zQjMbahYAWcxEsSPC6aZEr2Hcz1u` | TRX |
| BNB Smart Chain mainnet (chain ID 56) | `0x0d4c2B95e8FB7Be3DB9953bAcEf3A4Be643bA77B` | BNB |

These values are public destination addresses only. They do not prove wallet ownership, multisignature configuration, or signing authority. Do not place private keys, seed phrases, keystore files, or signing credentials in this repository or ordinary application environment variables.

## Operating mode

The supported treasury capability in this repository is **read-only chain observation**:

- Query TRON and BNB mainnet RPC endpoints over HTTPS.
- Scan bounded block ranges and record successful native TRX and BNB transfers involving the configured treasury address.
- Require the configured confirmation depth before recording observations.
- Expose monitor status, sync cursors, and recent observations through the authenticated admin treasury API.
- Keep customer balances, deposits-as-liabilities, accounting journals, settlement, payouts, and wallet signing disabled. An observed transfer is not a verified customer deposit and must not be credited to a member.

The scanner currently supports optional USDT contract-event observation only when the corresponding contract address is separately configured. No token contract is assumed by this document.

## Required deployment settings

Set these in the isolated Preview environment first, then repeat through a separately approved Production change:

| Variable | Required value |
| --- | --- |
| `CEDARS_TRON_RPC_URL` | CEDARS-approved HTTPS TRON full-node / API endpoint |
| `CEDARS_TRON_TREASURY_ADDRESS` | Pre-filled public address above |
| `CEDARS_TRON_START_BLOCK` | Explicit first block to scan; choose and record an agreed observation start point |
| `CEDARS_TRON_CONFIRMATIONS` | `100` by default; review against chain risk and operational needs |
| `CEDARS_BNB_RPC_URL` | CEDARS-approved HTTPS BNB Smart Chain RPC endpoint |
| `CEDARS_BNB_TREASURY_ADDRESS` | Pre-filled public address above |
| `CEDARS_BNB_START_BLOCK` | Explicit first block to scan; choose and record an agreed observation start point |
| `CEDARS_BNB_CONFIRMATIONS` | `100` by default; review against chain risk and operational needs |
| `CRON_SECRET` | Strong random secret for the scheduled sync endpoint, stored only in deployment secrets |

Do not guess the starting block. If the intention is to monitor only activity from activation onward, capture the current chain height from the chosen trusted RPC at the time of enablement and use that as the start block. If historical coverage is required, select a historical block and plan for the scanner's bounded 120-block-per-sync backfill.

## Enablement sequence

1. Configure the RPC endpoints and start blocks in Preview secrets. Keep Production untouched.
2. Apply the checked-in Prisma migrations to the isolated Preview database.
3. Deploy Preview and verify the authenticated `GET /api/admin/treasury` response reports each configured chain as `READ_ONLY_MONITOR_CONFIGURED`.
4. Trigger an authorized `POST /api/admin/treasury` sync and verify the returned chain head, scanned range, cursor, and transfer records.
5. Verify repeated syncs are idempotent and the scheduled sync is authenticated with `CRON_SECRET`. Review logs and database records.
6. Verify the dashboard labels these as observations only and never shows them as spendable balance, customer credit, revenue, or settlement.
7. Production observation may be enabled only after Preview evidence and explicit operational approval.

The current scanner processes at most 120 blocks per chain per sync. It defaults to 100 confirmations. A scheduler may run every five minutes when configured by the deployment. RPC delays, backfill, outages, and chain reorganizations can affect freshness; the current scanner is not a final accounting source and does not provide full reorganization reconciliation.

## Explicitly not enabled

- No private-key handling or signing.
- No multisignature deployment or signer verification.
- No outgoing transfers, withdrawal queue, or payouts.
- No customer balance crediting or debit.
- No automatic settlement, escrow release, or revenue recognition.
- No KYC/AML, sanctions screening, transaction-risk decisioning, or regulatory reporting.

Before any live-value execution is designed, independently verify wallet control and multisignature policy on each chain, document signer identities and threshold, protect signing keys with hardware-backed custody, define transaction and aggregate limits, implement dual control and emergency freeze, and obtain jurisdiction-appropriate legal, compliance, and finance approval. CEDARS-controlled custody does not remove licensing, customer-fund safeguarding, or other regulatory obligations.
