# Web-app design reference (asset of the `design` skill)

Applies to standard UI + backend systems: web frontends, APIs, services over a database — the default shape when no other dimension dominates.

## Aspects to weigh

- Authorization server-side at the object level: ownership checked per resource, deny by default; route guards and hidden buttons are UX, not security — the IDOR is one guessed ID away
- Validation at the boundary, trust inside; parameterized queries, encoding on output — the injection surface is every place user input meets an interpreter
- Migrations run while old code is live: expand → deploy → migrate reads → contract later; a destructive migration with the previous version still serving is an outage by design
- API surface as a contract: versioning policy decided, pagination mandatory on every collection, idempotency on unsafe operations that clients will retry
- Caching with the invalidation designed at the same moment: what invalidates on which write, stampede protection on hot keys, per-user data never in shared caches
- N+1 and unbounded queries as review targets: list endpoints with limits, access patterns matched to indexes — the endpoint that is fine with ten rows and down at ten thousand
- Error contract stable and user-safe: consistent shape, correlation ID, internals only in logs
- Sessions and state: where they live decides how the app scales and deploys; sticky sessions are a constraint someone chose
- Observability on the new path from day one: structured logs, traces, RED metrics, alert on user-facing symptom rather than internal cause
- Failure of dependencies decided per call: timeout, retry with backoff, circuit break, or degrade — the default of waiting forever is also a decision
- Accessibility (WCAG AA) and rendering strategy (SSR/CSR/hybrid) chosen for the actual audience, not the framework fashion
- User PII inherits the regulated-data dimension; secrets in a manager, never in config committed to the repo

## Default priorities

Server-side authorization before feature velocity · boundary validation before internal cleverness · compatible migrations before schema elegance · observable before fast.

## Standards worth naming

OWASP Top 10 and ASVS · WCAG 2.x AA · expand/contract (parallel change) migration pattern · semantic API versioning · GDPR/CCPA where user data flows.

## Easy to miss

The API open to direct calls behind a protected UI · object access checked by authentication but not ownership · the migration that locks a hot table in peak hours · cache serving one user's data to another · retry without idempotency duplicating writes · pagination added after a client already depends on the unbounded response · error responses leaking stack traces and internal hosts · the admin endpoint indexed by a crawler.
