# Payments design reference (asset of the `design` skill)

Applies to money movement, billing, ledgers — any flow where an amount changes hands.

## Aspects to weigh

- Money is a sequence of auditable events, not a mutable field; every balance derivable, every state change reconstructable
- On a running system: what the current setup already commits to — provider contract, capture model, ledger shape, reconciliation, PCI scope — established from the system, never assumed from how such things usually work
- Where card data flows sets PCI scope and audit cost for years: hosted fields, redirect, or touching the number yourself
- Tokenization portability: provider vs network tokens, who owns the vault, what switching provider would cost
- Amounts: minor-unit integers, currency carried with every amount, the point where an FX rate is fixed, the rounding rule
- Idempotency on every money-moving call, keyed by the caller, with a retention window; a timeout is an ambiguous outcome, not a failure
- Truth arrives asynchronously: webhooks signed, at-least-once, out-of-order — plus the reconciliation that catches what never arrived
- Reconciliation against settlement files: cadence, tolerances, who investigates a break
- Reverse flows are first-class: void, refund, partial refund, chargeback, dispute evidence — each with states and externally imposed deadlines
- Payment lifecycle as an explicit state machine (authorize/capture/settle/refund), never boolean flags
- Recurring: mandates, proration, dunning and retry schedule, mid-cycle plan change
- Marketplace/split flows: merchant of record, KYC/AML onboarding, payout holds and scheduling
- Controls: separation of duties on payouts, limits, approval thresholds, fraud screening and the cost of its false positives
- Certification and licensing timelines are months and gate the release: SCA and its exemptions, local mandates, terminal certification
- Observability without exposure: correlation between provider and internal IDs; PAN and CVV never persisted or logged

## Default priorities

Auditability and correctness before latency and elegance · idempotency before retries · reconciliation before scale · reverse flows designed with the forward flow.

## Standards worth naming

PCI DSS and how SAQ scope follows the card-data path · 3-D Secure 2, PSD2 SCA and exemptions · network tokenization · double-entry accounting · ISO 20022 and local rails · card-scheme dispute lifecycles and deadlines.

## Easy to miss

Webhook as the only signal, nothing reconciling what never arrived · balances summed at read time under load · refunds and chargebacks with no data model behind them · single-currency assumptions baked into the schema · float arithmetic anywhere near money · provider-specific fields leaking into the domain model, making the second provider a rewrite · retry storms on ambiguous timeouts · test credentials reachable from production paths.
