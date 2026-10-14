# Distributed systems design reference (asset of the `design` skill)

Applies when work crosses a process, service, or network boundary: integration, events, async processing, cross-boundary consistency.

## Aspects to weigh

- What a boundary buys here — independent deploy, isolation, team autonomy — against what it costs: network failure, partial success, distributed debugging. A boundary drawn along the org chart rather than data ownership pays the cost without the benefit
- Coupling shape: synchronous call couples availability, events couple schema, a shared store couples both. Which coupling is acceptable for this interaction
- Consistency the operation actually needs, per operation: read-your-writes, monotonic reads, eventual with a staleness window someone has quantified. What the user notices when it is stale
- Writes spanning boundaries: saga with compensation, transactional outbox, or a design that keeps the write in one place. What compensation means in business terms — a refund, an apology, or nothing that can undo it
- Delivery semantics: at-least-once is the normal case. End-to-end exactly-once is a property of the consumer being idempotent, not of the broker. Who owns the idempotency key, and how long dedup state is kept
- Ordering: whether per-key ordering suffices or global order is claimed, what the partition key is, what breaks on reorder, whether a sequence or version travels with the message
- Duplicates, out-of-order and late arrivals, and replay: what the consumer does the second time it sees the same thing
- Poison messages: dead-letter destination, who inspects it, how an item is replayed, what happens when nobody drains it
- Retry against downstream capacity: backoff and jitter, retry budget, and the timeout hierarchy — a caller giving up while the work completes is a correctness problem, not a latency one
- Partial failure across a fan-out: what the caller does when three of five succeeded; compensation versus a reconciliation loop that converges later
- Backpressure: bounded or unbounded queues, shedding, priority, and what fails first under load — chosen, not discovered
- Isolation of failure: bulkheads, circuit breaking, and the order in which capability degrades
- Contract evolution with consumers you cannot upgrade in lockstep: compatibility direction, versioning, deprecation path, who owns the schema
- State ownership: one writer per datum, or an explicit story for how divergence is reconciled
- Following one business transaction end to end: correlation and trace propagation across every hop, including async ones
- Time: event time versus processing time, and the absence of a shared clock
- Events and messages carrying personal or regulated data inherit the regulated-data dimension — payloads outlive their transport in logs, DLQs and replays

## Default priorities

Correctness under partial failure before throughput · idempotency before retries · bounded queues before more capacity · observability across a boundary before adding another boundary.

## Standards worth naming

Transactional outbox · saga and compensation · CQRS where read and write shapes genuinely diverge · consumer-driven contract testing · exponential backoff with jitter and retry budgets · bulkhead and circuit breaker · CAP/PACELC as framing, not slogan · OpenTelemetry context propagation · idempotency-key conventions.

## Easy to miss

Exactly-once claimed while the sink is not idempotent · timeout hierarchy inverted, so the caller retries work that is still running · dead-letter queue with no owner · retries with no budget amplifying an outage into an incident · ordering assumed from a single-partition test · schema change deployed ahead of its consumers · compensation designed for an action that cannot be undone · the reconciliation job everyone assumed someone else was building.
