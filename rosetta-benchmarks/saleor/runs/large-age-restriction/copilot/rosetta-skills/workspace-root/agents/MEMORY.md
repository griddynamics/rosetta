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

### Verify external documentation paths before making them a dependency [ACTIVE]
- Treat a failed official documentation URL as stale-source risk; stop, confirm a verified local source, and do not retry an unverified replacement.

### Constrain delegated validation to approved local resources [ACTIVE]
- Treat shared local services as high-risk write targets; make database access and non-approved editors a hard dispatch stop, then review the diff before dependent work starts.

### Validate reviewer commands before assigning a read-only gate [ACTIVE]
- A malformed inspection command can invalidate an independent review without changing code; use simple supported read-only tools for recovery rather than retrying the same harness.

### Require static patch hygiene before accepting generated artifacts [ACTIVE]
- Generated files can still fail repository hygiene checks; require a whitespace and diff-integrity gate before dependent implementation starts.

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

### Confirm local contracts after external documentation drift [ACTIVE]
- The active source and schema can safely ground a specification when an official deep link is stale and the user approves the fallback.

### Require evidence for delegation boundary compliance [ACTIVE]
- A delegate can return passing tests while violating environment or editing controls; inspect the execution evidence before accepting the handoff.
