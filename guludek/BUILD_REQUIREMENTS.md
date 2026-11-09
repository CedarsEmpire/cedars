# GULUDEK™ — build requirements

## Product boundary
- Private personal computer-management system for the owner's devices.
- One-page dashboard only; no public registration, public launch, or public control endpoint.
- Keep this project separate from CEDARS OS production. Do not change CEDARS production, databases, or release state.

## Required capabilities
1. Windows companion with authenticated, read-only telemetry as the initial verified baseline.
2. Target capacity: 10,000 AI workers, managed centrally through a real distributed scheduler, durable queue, worker registry, heartbeats, leases, retries, quotas, and audit events.
3. 24/7 operating objective with health checks, bounded retries, restart/recovery, alerting, maintenance controls, and honest degraded/offline states. Never promise literal uninterrupted uptime.
4. Revenue only from legitimate customer-authorized work that is completed and independently evidenced. Do not display simulated earnings or treat idle hardware as revenue.
5. Polygon network only for crypto wallet functionality. Supported assets: USDC on Polygon and POL on Polygon. Do not support other networks or silently substitute bridged assets.
6. User-controlled, non-custodial wallet. Never request, transmit, log, or store seed phrases/private keys. Workers must never sign or initiate withdrawals.
7. Withdrawal policy: at most one user-authorized withdrawal in each rolling 24-hour period. Enforce server-side with a durable, atomic withdrawal record and transaction reconciliation; UI-only timers are insufficient.
8. One-page dashboard must distinguish verified/active capabilities from planned, offline, blocked, or unverified capabilities.

## Financial and security gates
- Wallet connection and balance reads must verify Polygon chain ID 137 and the exact token contract addresses from authoritative Polygon/issuer documentation before release.
- Show USDC and POL balances separately. POL is also required for Polygon transaction gas.
- Never fabricate balances, earnings, transaction hashes, customer receipts, or worker counts.
- Do not enable signing, token transfers, or withdrawals until transaction simulation, address/chain validation, user confirmation, replay protection, rate limiting, durable 24-hour enforcement, and reconciliation are independently tested.
- No private keys or seed phrases in the dashboard, companion, server environment, logs, or worker processes.
- No paid cloud infrastructure, hosted RPC subscriptions, or 10,000-worker compute provisioning without explicit cost/budget approval.
- Do not deploy 10,000 workers as 10,000 local processes or imply they are running unless actual worker heartbeats and capacity evidence prove it.

## Release gates
- Local Windows installation and runtime test pass.
- Authentication and private-network remote access verified on two owner-controlled devices.
- Worker orchestration load-tested with measured capacity before any production scale claim.
- Polygon wallet read-only integration tested on Polygon; signing/withdrawal functionality remains disabled until separately security-reviewed and explicitly approved.
- Earnings evidence and withdrawal policy pass automated tests and manual reconciliation.
- No public launch and no CEDARS production changes.

## Current verified baseline (2026-11-09)
- Dashboard page, local Python companion, and PowerShell launcher exist in this branch.
- Companion is designed for read-only telemetry and binds to 127.0.0.1.
- These files have not yet been installed or runtime-tested on the owner's Windows PC.
- No AI worker fleet, cloud infrastructure, revenue engine, Polygon wallet integration, or withdrawal system is deployed.
