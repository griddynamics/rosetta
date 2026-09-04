# Multi-tenancy design reference (asset of the `design` skill)

Applies when one system serves many tenants, organizations, or customers from shared infrastructure.

## Aspects to weigh

- Isolation level per resource — shared everything, shared schema with a tenant key, schema per tenant, database per tenant, stack per tenant. Different answers for different resources are normal, not inconsistent
- What forces the level: regulatory and residency demands, tenant size skew, blast-radius tolerance, per-tenant restore requirements, cost per tenant at the expected count
- Tenant identity propagation: where it enters, how it survives async hops, background jobs, scheduled work and admin paths, and what the system does when it is absent rather than defaulting
- Where query scoping is enforced: storage layer (row-level security, per-tenant credentials) or application code. One missing predicate in one code path is a cross-tenant disclosure
- Noisy neighbour: quotas, rate limits, fair scheduling, per-tenant ceilings — and which tenant a shared queue or worker pool starves under load
- Tenant size skew: the tenant a thousand times the median, and whether the design has an escape hatch — dedicated shard, pool, or instance — or only one path for everyone
- Per-tenant configuration and customization: config, feature flags, code, or plugin — and how much variation the model absorbs before it forks into per-tenant branches
- Schema and data migrations across many tenants: rolling or simultaneous, the state when it fails halfway, and version skew between tenant data and running code
- Release model: everyone on one version, or tenants pinned — pinning is a permanent commitment, not a temporary accommodation
- Per-tenant operations: provisioning, export, backup and point-in-time restore of one tenant without touching the others, offboarding with provable deletion
- Support and observability per tenant: per-tenant SLOs, whose incident it is, impersonation for support and its audit trail
- Cost attribution per tenant, and pricing that survives the heaviest tenant
- Caching and shared state keyed with the tenant, including derived data, search indexes and generated artifacts
- Residency and sovereignty shaping topology rather than being layered on later
- Personal or regulated tenant data inherits the regulated-data dimension — per tenant, not per system

## Default priorities

Leak prevention enforced below the application · blast radius contained to one tenant · one code version unless a contract forces otherwise · per-tenant restore and migration paths designed before the tenant count makes them impossible.

## Standards worth naming

Row-level security · tenant-per-schema and tenant-per-shard patterns · cell-based architecture · routing by tenant key · tenant-scoped credentials · token-bucket quotas and rate limits · scoped audit logging.

## Easy to miss

Background jobs, exports and reports losing tenant context · a single admin query without the tenant predicate · restore that only works for all tenants at once · migration assuming every tenant is on the current version · the whale tenant with no escape hatch · caches and search indexes keyed without tenant · deletion that leaves derived data and backups behind · support impersonation with no audit trail · per-tenant limits that exist in pricing but nowhere in the code.
