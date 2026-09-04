# discovery

Establishes what exists: cited findings on the current system, prior attempts with a verdict, what was left alone, what is unknown, and whether that is enough to act on.

## Why it exists
Targets method failures a capable model still makes unprompted: the first matching file taken for the answer, inference reported as fact, areas dropped silently, a wrong prior solution assumed absent instead of hunted for, and no statement of whether findings suffice. It carries no procedure a competent model already knows.

## When to engage
- Trigger: what exists is unknown or unclear — affected areas, current behavior, dependencies, prior attempts — or the request itself has gaps.
- Actor: `discoverer`, `architect`. Standalone; no workflow required.
- Greenfield: same discipline over the ecosystem (libraries, versions, adjacent systems) instead of code.

## How it works
`role` → `when_to_use_skill` → `core_concepts` (facts only; cite or drop; say not-examined vs examined-and-absent; wrong prior solution is the costliest miss; verify externally) → `where_to_look` (register of areas weighed by the request — not a checklist to cover) → `depth` (both directions, context economy, sufficiency bar, confidence with weakest link, blocking unknowns as questions with defaults, ask when scope is missing) → `output` (content shape only) → `validation_checklist` → `pitfalls`.

## Mental hooks
- Relevance is set by the request, not the register; what was deliberately skipped is reported.
- Sufficiency bar: what the request turns on is established or named unknown, and another pass changes nothing.
- Prior-attempt verdict is mandatory — absent, partial, or present-but-incorrect.
- Data area records where sensitive fields live, never values.

## Invariants — do not change
- Facts only; the moment it decides or edits, the boundary against design collapses.
- No file paths, artifact names, or destinations — output shape only; the caller (user or workflow) sets destination. Never add a phrase saying so either: silence is the mechanism.
- No references to other skills; boundaries stated as capabilities. Fully independent, composable unit.
- Aspects register, not imperative steps — that is what lets one skill serve a one-file bug and a subsystem sweep.
- Frontmatter `name` equals folder name.

## Editing guide
Safe: role prose, wording of areas, pitfalls. Care: the sufficiency bar and report-what-you-skipped rule (both answer "how deep?"), the prior-attempt verdict. Not yet wired: registry (`docs/definitions/skills.md` reads `discovery (not yet)`), no agent/workflow invokes it. `plugins/**` is generated — regenerate, never hand-edit.
