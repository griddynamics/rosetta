# Migration and cutover design reference (asset of the `design` skill)

Applies when something already running has to become something else: rewrite, replatform, version upgrade, service extraction, provider swap.

## Aspects to weigh

- What actually moves and what stays; which seams exist to move it through — at the edge (routing, façade) or inside (abstraction over both implementations)
- Whether behavior is being preserved or changed. Doing both at once makes parity unverifiable; separating them costs one more step and buys a provable migration
- Source of truth during coexistence: old, new, or both — and for how long. Who reads which, who writes which
- Data movement: one-time backfill, continuous sync, or both; direction and, if bidirectional, the conflict rule; identity mapping between the two systems; how backfill and live traffic are ordered so they do not race on the same keys
- Tolerable drift between systems while both are live, and how it is measured rather than hoped
- Dual-run: shadow or mirrored traffic, sampled comparison, and what a mismatch does — log, alert, or block
- Parity: which outputs are compared, what differences are legitimate (timestamps, ordering, generated ids, rounding), and how long parity has to hold before anyone believes it
- Undocumented behavior in the old system, including bugs consumers now depend on: each discrepancy a deliberate preserve-or-fix decision, not an accident
- Cutover unit: big-bang, per tenant, per cohort, or percentage of traffic — and the smallest unit that carries real production traffic
- The switch itself: flag, routing rule, DNS, gateway — where it lives, who can flip it, how fast it takes effect
- Entry and abort conditions: what has to be true to proceed, what stops it mid-flight
- Reversibility: up to which point rollback is real, and what makes it irreversible — writes only the new system accepted, a dropped column, notifications already sent, external state already changed. Beyond that point, the compensating path
- Dual maintenance while both live: who is on call for which, whether the old system stays changeable, and what a freeze costs the business
- Decommissioning: what proves the old system is unused, what still references it, retention and archival obligations on its data
- Degraded or read-only windows: acceptable to whom, and for how long
- Personal or regulated data moving between systems inherits the regulated-data dimension: residency during sync, retention on the old system, deletion reaching both

## Default priorities

Reversibility until parity is proven · behavior preservation and behavior change kept in separate steps · smallest cutover unit that carries real traffic · measured parity before speed.

## Standards worth naming

Strangler fig · branch by abstraction · expand/contract (parallel change) for schema and API · dark launch and shadow traffic · blue-green and canary as cutover shapes · CDC for continuous sync · dual-write with reconciliation, and its known hazards.

## Easy to miss

The point of no return never identified, so rollback is discovered to be fiction · backfill racing live traffic on the same records · parity measured on data the old system never produced · dual-write with no reconciliation, drifting quietly for months · rollback plan assuming the new schema is still additive · old-system quirks that downstream consumers depend on · per-cohort cutover with no per-cohort state tracking · decommissioning never done, so both systems are maintained for years.
