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

### Verify a tool exists before delegating it [ACTIVE]
- Treat a named executable as unavailable until a read-only availability check confirms it; specify a compatible fallback in the delegated scope.

### Normalize document links before validation [ACTIVE]
- Resolve fragment-only links against the containing document and validate fragment targets separately from file paths.

### Align delegated scope with mandatory prerequisites [ACTIVE]
- Before dispatch, include each mandatory prerequisite's exact read set in the subagent's authorized scope or explicitly authorize the prerequisite files.

### Synchronize approval artifacts before dispatch [ACTIVE]
- Update durable plan and handoff approval state before delegating the next gated phase; a session-only approval is insufficient when artifacts declare execution blocked.

### Make delegated repository roots explicit in commands [ACTIVE]
- In a multi-repository workspace, every delegated repository command must use an absolute working directory or `git -C <repo>`; never rely on the session root.

### Avoid escaped snippets in delegated shell commands [ACTIVE]
- Use simple direct commands or a quoted heredoc with `python3`; do not pass literal newline escapes to `python3 -c`.

### Discover paths before targeting files [ACTIVE]
- Treat an absent guessed source path as a discovery result; locate the real module with repository search before taking any action.

### Pass concrete paths to repository tools [ACTIVE]
- Do not rely on shell brace expansion in tool path arguments; provide each resolved path as an explicit tool input.

### Use an explicit working directory for every delegated shell call [ACTIVE]
- Include the absolute repository `cd` in each shell command rather than relying on a prompt constraint that a worker may omit.

### Apply multi-file patches against exact current anchors [ACTIVE]
- Split a multi-file patch after the first unmatched context; inspect the affected file and apply only verified remaining hunks.

### Run focused static checks before extending a patch [ACTIVE]
- Run the formatter/linter after each coherent backend slice; resolve undefined names before adding dependent behavior.

## What Worked

### <Generalized What Worked> [ACTIVE|RETIRED]
[Root cause, Reasons, Problems]

### Learn the running stack without reading secrets [ACTIVE]
- Use container compose labels, listening ports and `logs/*.log`; never `.env*`, `*.env`, `*.pem`, `*.pid`, `seed.dump`.

## What Failed

### <Generalized What Failed> [ACTIVE|RETIRED]
[Hypothesis, Root cause, Reasons, Problems]

### Unverified executable assumption [ACTIVE]
- A delegated architecture task assumed `python`; the system exposes `python3` instead, so discovery stopped before producing its artifact.

### Fragment link validation mismatch [ACTIVE]
- A plan verifier resolved a fragment-only link as a directory path, preventing completion of the final document-integrity check.

### Reviewer scope prerequisite conflict [ACTIVE]
- An independent reviewer correctly stopped because its narrowly authorized file scope excluded mandatory project-context reads.

### Stale approval gate in handoff [ACTIVE]
- Implementation dispatch conflicted with plan artifacts that still marked H0/H1 as pending after the user had approved both in-session.

### Wrong repository command root [ACTIVE]
- A backend validation command ran from the workspace root rather than the Saleor repository and stopped before implementation.

### Escaped Python command construction failure [ACTIVE]
- A delegated preflight used literal newline escapes in `python3 -c`, causing a syntax failure before backend work began.

### Guessed source path treated as fatal [ACTIVE]
- A replacement backend worker stopped after an assumed mutation file path did not exist, before searching for the repository's actual module layout.

### Unsupported brace-expanded search path [ACTIVE]
- A read-only source search passed a brace-expanded path to a tool that requires concrete paths, so the error-code lookup did not run.

### Repeated delegated working-directory omission [ACTIVE]
- Three backend workers stopped before edits because a shell command ran from the workspace root rather than the Saleor repository.

### Partial GraphQL patch application [ACTIVE]
- A multi-file GraphQL patch added the Product input field, then stopped because the Product output context differed from the inspected anchor.

### Static check found incomplete import [ACTIVE]
- Focused lint detected a missing `ValidationError` import in the new birthday-write guard before runtime validation.

## Discoveries

### <Generalized Discovery> [ACTIVE|RETIRED]
[Usage, Reasons, Problems]

### Compare schemas by declaration names, not raw diff [ACTIVE]
- Core and dashboard SDL printers differ in directives (`@doc`); raw diff is noisy, declaration-name diff is meaningful.
