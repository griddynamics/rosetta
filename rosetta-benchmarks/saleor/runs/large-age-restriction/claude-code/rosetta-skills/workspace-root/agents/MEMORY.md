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

### Check PII-bearing features against every read path, not only the field [ACTIVE]
- Age feature: birthday had to be kept out of webhooks, bulk mutations, logs, events and client caches; review found leaks via bulk update, log variables and timing of register. Grep all channels per sensitive field.

### Never run lint scripts that hardcode --fix; use `npx eslint <files>` [ACTIVE]
- `pnpm run lint:eslint` rewrites files; repo-wide `ruff --fix` also did once (an engineer ran it); verify with diff stat.

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
