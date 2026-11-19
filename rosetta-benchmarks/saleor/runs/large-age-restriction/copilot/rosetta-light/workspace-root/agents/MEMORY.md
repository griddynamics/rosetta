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

### Verify local-service control paths before recovery actions [ACTIVE]
- Resolve the documented Compose file, project, service identifier, working directory, and available command tools before health checks or restarts.

### Use verified payload files for local API contract probes [ACTIVE]
- Avoid inline shell-escaped request bodies; use a validated request file or client to prevent quoting errors from invalidating read-only checks.

### Inject verified local API endpoints for client code generation [ACTIVE]
- Set the documented local GraphQL endpoint process-locally before schema refresh or code generation; never read or expose environment-file values for this purpose.
- Inspect each client script for its exact variable name before injection; Dashboard's local schema fetcher reads `API_URL`.

### Resolve repository paths before dependent reads or edits [ACTIVE]
- Use a verified file listing or search before naming implementation or test paths; do not make a code change dependent on a guessed location.

## What Worked

### <Generalized What Worked> [ACTIVE|RETIRED]
[Root cause, Reasons, Problems]

### Learn the running stack without reading secrets [ACTIVE]
- Use container compose labels, listening ports and `logs/*.log`; never `.env*`, `*.env`, `*.pem`, `*.pid`, `seed.dump`.

## What Failed

### <Generalized What Failed> [ACTIVE|RETIRED]
[Hypothesis, Root cause, Reasons, Problems]

## Discoveries

### <Generalized Discovery> [ACTIVE|RETIRED]
[Usage, Reasons, Problems]

### Compare schemas by declaration names, not raw diff [ACTIVE]
- Core and dashboard SDL printers differ in directives (`@doc`); raw diff is noisy, declaration-name diff is meaningful.
