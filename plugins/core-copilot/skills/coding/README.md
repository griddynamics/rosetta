# coding

The default implementation skill: writes/fixes/refactors code (including IaC) under KISS/SOLID/DRY with a fixed validation methodology.

## Why it exists

Without this skill a model implementing a task would: skip impact analysis on "small" changes, treat passing tests as done, add unrequested refactors/features while it's in the file, leave pre-existing warnings/errors unfixed under a "pre-existing" excuse, validate ad hoc instead of in dependency order (DB → API → Web → Mobile), and run IaC without security scanning, blast-radius analysis, or HITL on deletions. The skill forces zero-tolerance validation, scope discipline, and a mandatory IaC sub-procedure instead.

## When to engage

`Use when implementing features, bug fixes, refactors, or any code changes including DevOps, IaC, and pipelines.` No actor restriction in frontmatter or in `rules/bootstrap-alwayson.md`'s engagement lists — any agent (orchestrator or subagent) auto-engages via description match (`disable-model-invocation: false`) or explicit invocation (`user-invocable: true`). Prerequisite stated in the body: "All Rosetta prep steps MUST be FULLY completed, load-project-context skill loaded and fully executed."

## How it works

`SKILL.md` is a single flat pass: `role` → `when_to_use_skill` → `core_concepts` (principles, project docs to keep current, validation methodology) → `sensitive-data` → `validation_checklist` → `best_practices` → `pitfalls` → `resources` (routes to `codemap`, `debugging`, `planning`, `tech-specs`).

`assets/iac.md` is not a short reference — it is a near-complete second skill body for IaC work, mandatorily pulled in via `MUST APPLY SKILL FILE \`assets/iac.md\`` whenever the change touches Terraform/Pulumi/CloudFormation/ARM/Bicep/Helm/Kustomize. It duplicates the parent's `<role>` and `<when_to_use_skill>` verbatim, then adds its own `<planning>` (intent decomposition, conflict/CIDR/naming checks before any plan), `<coding>` (module/template catalog first, LLM only as fallback, CLI restricted to read-only), `<review>` (static analysis, ≥2 security scanners, secrets scan, cost estimate, policy enforcement), `<documentation>`, `<error-handling>` (per-stage: Planner/Coder/Syntax/Security/Validator/Cloud/Check-step-failure), and `<self-healing-logic>` (retry loop, max 3 attempts, stop on fundamental errors).

## Mental hooks & unexpected rules

- `no pre-existing excuses (pre-existing = documented in advance; otherwise fix it)` — "pre-existing" is not a blanket excuse; it only exempts an issue if it was documented *before* this task started, otherwise the executor must fix it now.
- `all code MUST compile (including pre-existing)` — compilation is judged on the whole codebase, not just the diff.
- `Files stay under 300 LOC` — a hard line-count ceiling in the validation checklist, not a suggestion.
- `databases (queries/statements) → APIs (curl/similar) → Web (Chrome DevTools/Playwright) → Mobile (Appium/similar), solid foundation first` — validation order is fixed; do not test the UI before the API/DB layer beneath it is confirmed.
- `MUST APPLY SKILL FILE \`assets/iac.md\`` — any IaC touch forces a second, much heavier procedure; the top-level SKILL.md alone is insufficient for that class of change.
- From `assets/iac.md`: `MUST HAVE ADDITIONAL DIRECT HITL if work involves DELETION of resources in all environments` — deletion is a hard stop for human sign-off regardless of environment (dev included).
- From `assets/iac.md`: `CLIs must only be used for READ-ONLY purposes` — cloud/IaC CLIs may plan/verify but must never mutate state directly; that is what MUST NOT happen "in prod" done manually.
- From `assets/iac.md`: `COST OF SKIPPING: SECURITY INCIDENT WITH CIO, CISO, AND MULTIMILLION FINES!` — the seven `CRITICAL` coding-stage items (module/template-first, fetch from repo, check existing infra, security best practices, risk/blast-radius assessment, read-only CLI) are framed as non-negotiable, not best-effort.
- From `assets/iac.md`: `Subagents — ... Be explicit to require use of this SKILL in subagent. Don't explain this content.` — when delegating IaC work to a subagent, the delegator must name this skill file explicitly rather than paraphrase its rules.

## Invariants — do not change

- Frontmatter `name: coding` must equal the folder name and the `docs/definitions/skills.md` entry `- coding` (confirmed present).
- `description: "To implement features, fix bugs, and refactor with KISS/SOLID/DRY and systematic validation."` — kept short and keyword-dense on purpose; it is always visible and drives auto-activation matching (`disable-model-invocation: false`).
- `disable-model-invocation: false` / `user-invocable: true` — both must stay true/false as-is; flipping either removes auto-engagement or manual invocation.
- `MUST APPLY SKILL FILE \`assets/iac.md\`` — canonical alias form; "SKILL FILE" carries no skill name (the file is scoped by folder, not by name), unlike cross-skill references below.
- Cross-skill references in `<resources>` (`skill \`codemap\``, `skill \`debugging\``, `skill \`planning\``, `skill \`tech-specs\``) use bare skill-name form, not file paths — per `docs/schemas/skill.md`, once a skill name is in context it's referenced directly rather than via `USE SKILL`. All four target skills exist.
- The phrase `All Rosetta prep steps MUST be FULLY completed, load-project-context skill loaded and fully executed` is a repo-wide canonical line (present verbatim across commands/agents); do not reword it locally.
- Filename `assets/iac.md` is referenced by exact path from `SKILL.md`; renaming it breaks that reference.
- `<coding>` as the outer XML tag name in both `SKILL.md` and `assets/iac.md` is the executor-facing skill marker; both files also nest `<role>` and `<when_to_use_skill>` (duplicated, not aliased) — changing one without the other reintroduces drift between the two copies.

- The inline `sensitive-data` section is intentional [decided] — coding-specific data-safety directives layered additively on top of the `sensitive-data` guardrail skill (which alwayson engages for all agents); do not dedupe it away.

## Editing guide

Safe to extend: `best_practices`, `pitfalls`, `resources` (add new cross-skill routes as sibling skills are built) — these are additive lists with low coupling risk.

Handle with care: `core_concepts`, `validation_checklist`, and anything in `assets/iac.md` — these carry the zero-tolerance/threshold/forced-sequence language quoted above; loosening wording here changes executor behavior, not just prose.

New generic coding guidance belongs in `SKILL.md`. New IaC-specific procedure belongs in `assets/iac.md`, not inline in `SKILL.md` — keep the top-level file provider-agnostic and push tool-specific detail into the asset. Do not create a `references/` folder for this skill unless content stops being "always apply when IaC" and becomes "consult on demand" — `assets/iac.md` is mandatorily pulled, which is why it's an asset rather than a reference.

Known adjacent artifact, not a coupling: `rules/coding-iac-best-practices.md` overlaps this skill's IaC scope but neither references nor is referenced by it — check before assuming it's wired in.

Referenced by: `agents/engineer.agent.md`, `agents/validator.agent.md` (both `USE SKILL \`coding\``), `skills/testing/SKILL.md` (`skill \`coding\`` for implementation context), `commands/init-workspace-flow-verification.md` (`skill \`coding\`` as file-creation reference).
