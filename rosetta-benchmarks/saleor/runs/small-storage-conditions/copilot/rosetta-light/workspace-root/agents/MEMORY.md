# AGENT MEMORY

Generalized reusable lessons from agent sessions.
Root causes converted into preventive rules, not incident-specific notes.
Entries are h3 headers with [ACTIVE|RETIRED] status.
Content: brief, grep-friendly, MECE across sections. 
Style: one-liner per entry, optional sub-bullets for context.
Keep template entries so that AI knows how to fill them in later on.

Scope: workspace-level and cross-repo lessons only; repo-specific lessons go to `<repo>/agents/MEMORY.md`.

## Preventive Rules

### <Generalized Preventive Rule> [ACTIVE|RETIRED]
[Root cause, Reasons, Problems]

### Verify cross-repo contracts on both sides in code [ACTIVE]
- Each repo's docs describe its own side only; e.g. webhook signing looked compatible until core and storefront code were read together.

## What Worked

### <Generalized What Worked> [ACTIVE|RETIRED]
[Root cause, Reasons, Problems]

### Learn the running stack without reading secrets [ACTIVE]
- Use container compose labels, listening ports and `logs/*.log`; never `.env*`, `*.env`, `*.pem`, `*.pid`, `seed.dump`.

## What Failed

### <Generalized What Failed> [ACTIVE|RETIRED]
[Hypothesis, Root cause, Reasons, Problems]

### Verify delegated-agent model availability before dispatch [ACTIVE]
- Harness defaults can reference unavailable models; select an advertised model after explicit user approval before retrying.

### Locate repository source roots before bounded code discovery [ACTIVE]
- Do not embed inferred package paths in a discovery scope; first locate the source root, then inspect the requested domain path.

### Validate search syntax before treating exploration as blocked [ACTIVE]
- Use repository-compatible single-line searches or narrow file reads; an invalid regex must not prevent bounded implementation discovery.

### Reuse existing session todos in delegated work [ACTIVE]
- Subagents share the session task ledger; task setup must query or update existing IDs rather than inserting duplicate records.

### Permit an explicit local schema-refresh path for generated consumers [ACTIVE]
- Consumer implementation that requires code generation needs an approved local introspection or schema-artifact path; prohibit remote sources without blocking local contract synchronization.

### Prefix delegated repository commands with the absolute repository path [ACTIVE]
- Shell sessions start at the workspace root; package and source commands must explicitly `cd` to their owned repository before execution.

### Use available tooling and exact GraphQL target types in consumer recovery [ACTIVE]
- Prefer the available Node/curl tooling for local API inspection; confirm each GraphQL selection's type before adding a generated-field consumer.

### Trace generated fragment fields into fixtures and component contracts [ACTIVE]
- Adding a required fragment field requires a type-check impact pass over stories, fixtures, and component prop boundaries before validation.

### Complete provider contracts in isolated component tests [ACTIVE]
- Test providers must receive required children and deterministic locale settings before static-render validation.

### Reconcile test typing and lint rules with the narrowest local exception [ACTIVE]
- When a required third-party provider prop conflicts with a lint rule, retain the type-safe contract and scope any suppression to the single construction.

### Treat unavailable recommended skills as non-blocking alternatives [ACTIVE]
- Validation must continue with available direct review and test evidence when an optional or recommended skill is unavailable.

### Scope cross-repository validation commands to each repository root [ACTIVE]
- Validators must use the exact workspace-contained repository paths and never run repository Git commands from the non-repository workspace root.

### Distinguish Saleor repository and package roots in core tasks [ACTIVE]
- Run commands from `saleor/`, but resolve application files under its inner `saleor/` package directory.

### Read exact import context before applying a targeted code patch [ACTIVE]
- Import ordering varies by module; inspect the current block immediately before patching instead of relying on an inferred layout.

### Update complete-field test fixtures when extending export mappings [ACTIVE]
- Tests that enumerate all mapped export fields require the new model key in their expected product rows.

### Resolve Saleor CSV helpers under the utilities package [ACTIVE]
- Product CSV data helpers live under `saleor/csv/utils/`, not a sibling `saleor/csv/export/` package.

### Validate artifact redaction patterns before processing diffs [ACTIVE]
- Use simple independently valid line filters for sensitive-data redaction; a malformed composite regex must not leave artifact generation partial.

## Discoveries

### <Generalized Discovery> [ACTIVE|RETIRED]
[Usage, Reasons, Problems]

### Compare schemas by declaration names, not raw diff [ACTIVE]
- Core and dashboard SDL printers differ in directives (`@doc`); raw diff is noisy, declaration-name diff is meaningful.
