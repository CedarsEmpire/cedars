# GULUDEK™ — implementation contract

**Product:** private, one-page personal Windows computer manager. No public registration or public launch.

## Required end state
- A single dashboard page for local computer health, worker operations, verified earnings, Polygon wallet balances and withdrawal status.
- Target scale: 10,000 real AI workers, centrally scheduled and monitored. Do not simulate workers or report a target as running capacity.
- Continuous operation objective with health checks, leases, retries, recovery, alerts and explicit degraded/offline states. No literal uptime guarantee.
- Real revenue only from legitimate customer-authorized workloads, completed deliverables and independently verified receipts. No guaranteed income.
- Polygon network only (chain ID 137): USDC on Polygon and POL. No other networks or silent token substitution.
- User-controlled non-custodial wallet. Never request, store, log or transmit seed phrases/private keys; AI workers cannot sign transactions.
- At most one user-authorized withdrawal per rolling 24 hours, enforced atomically by a durable backend record and reconciled against the Polygon transaction.
- One page only. Clearly label each feature as active, planned, offline, blocked or unverified.

## Security and activation gates
1. Verify official Polygon chain/token contract addresses before balance integration; distinguish native USDC from bridged USDC.
2. Wallet balance reads must confirm chain ID 137 and show USDC and POL separately. POL is needed for network gas.
3. No transaction signing or withdrawal until recipient/chain checks, transaction simulation, user confirmation, replay protection, server-side 24-hour enforcement, durable audit and reconciliation are tested and separately approved.
4. Never expose wallet secrets to the dashboard backend or workers.
5. No paid cloud, hosted RPC subscription, or compute procurement without explicit budget approval.
6. No claim of 10,000 active workers without real worker heartbeats and load-test evidence.

## Existing baseline
The merged GULUDEK baseline contains one HTML dashboard, a read-only Python Windows companion and a PowerShell launcher. The companion binds to loopback and has not yet been installed/runtime-tested on the owner's computer. No worker fleet, revenue engine, Polygon wallet, deposits, transfers or withdrawals are live.

## Release gates
- Verify local installation and telemetry on the owner's Windows PC.
- Verify private remote access between two owner-controlled devices.
- Test distributed worker scheduling and capacity before scaling claims.
- Test Polygon read-only wallet integration before enabling any signing.
- Verify earnings evidence and 24-hour withdrawal enforcement before any withdrawal capability.
- Keep CEDARS OS production, databases and release state untouched.

## Progress update
- Added a read-only injected-wallet panel to the one-page dashboard: connect an owner-controlled browser wallet, check Polygon chain ID 137, read native POL balance and native USDC token balance.
- Wallet panel does not request signing, token approvals, transfers, or withdrawals. It never asks for seed phrases/private keys.
- The native USDC contract address is currently configured in the client; verify it against current official Polygon/Circle documentation before treating the displayed USDC balance as release-verified.
- No CI workflow run was returned for the wallet UI commit. Browser-wallet testing and Windows runtime testing remain outstanding.
