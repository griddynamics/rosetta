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

### Resolve repository-relative search paths once [ACTIVE]
- When a tool takes an absolute repository root, search child paths directly; do not repeat the repository directory.

### Keep multi-file patches under one verified workspace root [ACTIVE]
- Before applying a patch across repositories, verify each absolute path retains the workspace-root prefix.

### Split cross-repository patches by repository [ACTIVE]
- Apply and verify one repository batch at a time; it prevents a single invalid path from partially applying unrelated scopes.

### Verify task aliases before execution [ACTIVE]
- Inspect the task runner's registered task names before invoking a repository automation command.

### Read localized-message context before patching [ACTIVE]
- Locale catalogs can use different values and ordering; patch from the exact nearby keys, not another locale's context.

### Preserve published GraphQL input type names [ACTIVE]
- Add optional fields to an existing public input type instead of replacing its name with a subtype.

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
