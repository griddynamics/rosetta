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

### Run core commands in the dev container, not on the host [ACTIVE]
- Host Python lacks `libmagic` (Django setup fails); `saleor-benchmark-saleor-1` mounts `saleor/` at `/app` and has pytest, ruff, mypy, DB access. `docker exec -w /app saleor-benchmark-saleor-1 ...`. The API container runs uvicorn `--reload` on the same mount: code changes apply without restart, only migrations need a manual `migrate`.

### Apply schema patches by checking types, not by `patch` fuzz [ACTIVE]
- Applying core `schema.graphql` hunks to dashboard `schema-main.graphql` with `patch` put one hunk in the wrong input (identical context). Verify with a graphql-js per-type field comparison after patching.

## What Worked

### <Generalized What Worked> [ACTIVE|RETIRED]
[Root cause, Reasons, Problems]

### Learn the running stack without reading secrets [ACTIVE]
- Use container compose labels, listening ports and `logs/*.log`; never `.env*`, `*.env`, `*.pem`, `*.pid`, `seed.dump`.

## What Failed

### <Generalized What Failed> [ACTIVE|RETIRED]
[Hypothesis, Root cause, Reasons, Problems]

## Discoveries

### Dashboard Jest is load-sensitive [ACTIVE]
- A full `jest` run beside browsers/dev servers fails 2-4 random suites that pass alone; `jest -w 2` on a quiet machine passes all.

### Storefront fork changes go through extensions [ACTIVE]
- `src/graphql/extensions/ProductDetailsExtension.graphql` + `mapProductExtensions` avoid Paper-owned files and the `core:lock` override list.

### <Generalized Discovery> [ACTIVE|RETIRED]
[Usage, Reasons, Problems]

### Compare schemas by declaration names, not raw diff [ACTIVE]
- Core and dashboard SDL printers differ in directives (`@doc`); raw diff is noisy, declaration-name diff is meaningful.
