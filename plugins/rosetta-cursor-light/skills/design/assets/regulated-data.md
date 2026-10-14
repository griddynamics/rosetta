# Regulated-data design reference (asset of the `design` skill)

Applies to personal, health, financial-personal, or otherwise regulated data: PII, PHI, special categories, anything with legal handling obligations.

## Aspects to weigh

- Classification before design: which fields are regulated, where they live, who reads them — established, not assumed; identifiers hide in free text, URLs, and logs
- Minimum necessary per component: each part receives the least it needs; pseudonymous IDs internally, resolution at the edge
- Consent and purpose as enforced constraints at the data-access layer, versioned — never a UI checkbox the API ignores
- Audit reads, not just writes: append-only, actor and purpose recorded; break-glass access exists but forces after-the-fact review
- Deletion and retention reach everything: replicas, caches, backups, derived datasets, analytics, ML training sets, logs — provable, not promised
- De-identification with the re-identification risk stated: removal of identifiers vs pseudonymization vs aggregation are different guarantees with different legal weight
- Residency decides regions, vendors, and replication topology before any of those are chosen for other reasons
- Every subprocessor touching the data needs paper (BAA, DPA) before the first byte flows — integration order follows contracts
- Encryption at rest and in transit as table stakes; field-level for categories with extra protection (mental health, HIV, genetics — often stricter under state law)
- Automated decisions on people may trigger explanation and objection rights — the appeal path is part of the design
- Environments: real data never in dev/test; synthetic or de-identified fixtures with the derivation documented
- Breach posture: detection, notification clocks (72h GDPR), and what forensics will need already recorded

## Default priorities

Privacy before convenience · auditability before performance · provable deletion before storage elegance · legal review before integration, not after.

## Standards worth naming

GDPR incl. art. 9 and 22 · HIPAA Privacy/Security/Breach rules and BAAs · CCPA/CPRA and state health laws · HL7/FHIR where clinical · 21 CFR Part 11 where FDA-regulated · SOC 2 · ISO 27701.

## Easy to miss

Sensitive values in error messages, traces, analytics events, or LLM prompts · deletion that stops at the primary store · third-party SDKs exfiltrating by default · consent version drift between capture and enforcement · prod dumps as test fixtures · retention policy in the wiki but not in code · access reviews that never revoke.
