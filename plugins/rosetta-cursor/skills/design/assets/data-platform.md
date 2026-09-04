# Data-platform design reference (asset of the `design` skill)

Applies to pipelines, warehouses, lakes, streaming, analytics — systems whose product is data.

## Aspects to weigh

- Replayability as a design property: a rerun yields the same output — overwrite or merge semantics, never blind append; a pipeline that cannot be rerun safely is an incident waiting for its trigger
- Schema evolution as policy: additive by default; breaking changes through a versioned dataset and a migration window; every dataset's consumers known before its shape changes
- Backfill designed, not improvised: cost and feasibility of reprocessing history is a property of the architecture, decided now
- Late and out-of-order data: watermarks, correction reprocessing, and what downstream actually assumes about completeness
- Delivery semantics per hop, written down: exactly-once effect is at-least-once plus deduplication keys, not a config flag
- Batch vs streaming set by required freshness and cost, not fashion; a hybrid earns its complexity with a stated reason
- Partitioning and layout against the actual query patterns; scan cost estimated for the main consumers before the layout is fixed
- Quality gates fail fast at ingestion; quarantine, never silent drop; ownership of unmatched and rejected records assigned
- Lineage and freshness SLOs observable per dataset — consumers can see staleness, not discover it
- Regulated fields inherit the regulated-data dimension: masking, zoned access, deletion propagating to every derived set
- Storage economics: file sizing, compaction, tiering; small-files growth is a design failure, not an ops chore
- Contracts at team boundaries: producers commit to shape and semantics, consumers to declared usage

## Default priorities

Correctness and replayability before freshness · contracts before convenience · cost visible from day one · quarantine before drop.

## Standards worth naming

Data contracts · ACID table formats (Iceberg, Delta, Hudi) and their compaction/retention semantics · CDC semantics and ordering guarantees · GDPR/CCPA delete-through to derived data · column-level lineage (OpenLineage).

## Easy to miss

Rerun that duplicates or corrupts · schema drift discovered by consumers in production · deletion requests stopping at the raw layer · timezone and DST in partition keys and window boundaries · backfill costing more than the feature it serves · dedup keys that collide across sources · watermark assumptions silently violated by a lagging producer.
