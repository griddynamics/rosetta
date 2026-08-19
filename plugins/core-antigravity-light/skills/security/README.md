# security

Reusable security-review method for coding agents: safety gates, evidence contracts, security-area guidance, and remediation-task templates. `security-flow` supplies the ordered orchestration and the mandatory canonical subagent assignments.

## Why it exists

Without it, a capable model asked to "review security" improvises: it ingests whole repositories (carrying secrets into model context), runs whatever scanner it recognizes, rewrites third-party severities into its own judgment, and drifts from review into fixing. This skill blocks each of those. A filename-only secret gate runs before any target content is ingested. Tool facts must be verified and dated before a tool is called operational. Source findings are preserved unchanged and normalized fields are added alongside, never over, them. Remediation is out of scope by construction — the skill emits concise task inputs for a later user-invoked coding flow.

## When to engage

Auto-engages from the frontmatter `description`; `user-invocable: true`, so it is also reachable directly from the `/` menu. Registered in `docs/definitions/skills.md`. Engage it for review of software, infrastructure, platforms, interfaces, hosts, or AI systems. Engage `security-flow` instead when the run needs ordered phases, subagent dispatch, and HITL approval gates; this skill carries the method, not the sequence. Invoked stand-alone it still holds every gate — the gates are stated here, not in the flow.

## How it works

`SKILL.md` carries the common method: `<secret_gate>`, `<authorization>`, `<overall_flow>` (steps 0-8), `<tool_contract>`, `<finding_integrity>`, `<outputs>`, `<templates>`, `<asset_routing>`, `<validation_checklist>`, `<pitfalls>`. Area detail is progressively disclosed through `<asset_routing>`, which maps seven groups (architecture/trust, code, platform, interfaces, offensive, operations, AI, human-operated tools) onto 17 `assets/security-*.md` files. Each inspection asset follows the same shape: `<apply_when>`, `<inspect>`, `<tools>`, `<safety>`, `<evidence>`. `assets/security-secret-scan.sh` is the filename-only fallback scanner; `assets/security-secrets.md` carries the secret-family floor it must cover. `<templates>` names all seven `rules/security-*.md|json` output contracts. Outputs land under `docs/security/<run-id>/` with storage approval, raw scanner output under that run's `raw/` subfolder.

## Mental hooks & unexpected rules

- The scanner is reached with `APPLY SKILL FILE`, never `READ SKILL FILE`. Per `docs/ARCHITECTURE.md`, `READ` loads into context without executing — on a shell script that silently turns the gate into dead text while the flow can still record a pass.
- Exit codes are part of the gate: exit 0 means use the filename list, exit 2 means the scanner is unusable and the run stops without ingesting source.
- `<overall_flow>` step numbers are shared with `security-flow`'s phase numbers (0 prerequisites through 8 report-and-package). Every phase subagent holds both files, so the two numberings must stay identical.
- Filename-only is absolute: the gate never requests, emits, or reads matches, lines, fragments, or values.
- "Recommendation-only" is a real tool state — materially unverifiable, unavailable, GUI, hosted, or bot tools are recommended, never called operational.
- Tasks group by remediation area plus shared root cause and fix strategy, never by repository layout.

## Invariants — do not change

- Frontmatter `name: security` must equal the folder name and its registration in `docs/definitions/skills.md`.
- `user-invocable: true` must stay: the capability is directly reachable, and its gates must therefore hold without a flow.
- `APPLY SKILL FILE` on `assets/security-secret-scan.sh`, and the exit 0 / exit 2 mapping. Weakening either disables the secret floor.
- The non-overridable stops: above-QA or ambiguous secret hits, and prohibited production active/offensive/mutating/fuzz/exploit/DAST/network/exfiltration testing.
- Source-finding preservation and the rule that material high+ stays unverified without a second signal or reproduction.
- Skill isolation: never name a canonical subagent or a specific workflow. `<pitfalls>` describes the bounded-role anti-pattern without naming the role.
- Remediation stays out of scope — never invoke, coordinate, monitor, or validate fixes.
- Raw scanner output is never committed and never deleted on the user's behalf.

## Editing guide

Safe to edit: `<inspect>` bullets and candidate-tool lists in an asset, additional `<pitfalls>`, and clarifying prose here. Handle with care: `<secret_gate>` step order and its verb and exit-code contract, the `<authorization>` prohibition list, `<overall_flow>` numbering (must move together with `security-flow` phase numbers), and the `<templates>` list (every declared output needs a named template, or the subagent never learns the artifact shape). Keep common rules in `SKILL.md` and area-specific inspection, evidence, and safety guidance in the matching asset. When adding a secret family to `assets/security-secrets.md`, update and test the fallback scanner in the same change. Do not add security-specific agents — reuse canonical agents by cognitive fit. Validation: check Rosetta frontmatter and references, run shell syntax and fixture tests for the scanner, and simulate every safety branch.
