# Story: Skills Taxonomy Reconciliation + Frontmatter Refactoring

> **Maintenance principle — this file SHRINKS as work lands.** When an item is implemented, collapse it to a one-line nudge and delete the detail that is no longer needed. Keep only: open work (full detail), tiny done-nudges, and durable decisions. Do not let it grow; do not keep finished how-it-was-done prose.

Status: IN PROGRESS — remaining: W5 (guardrails reframe), W2 generator changes.

## Open

- **W5 — Native-trigger reframe.** Shrink `bootstrap-guardrails.md` to a minimal pointer — remove inline trigger restatements already carried by skill descriptions. Done when: the rule no longer repeats any trigger the description already carries.
- **W2 generator changes** — per-IDE flag handling in `src/plugin-generator/src/plugin-processors/`:
  - **Cursor** — emit skills to repo-level `.cursor/skills/`; `disable-model-invocation` on plugin-delivered skills is broken (Cursor bug — fully hides skill).
  - **Copilot** — switch `*.prompt.md` → Agent Skills (`.github/skills/`); prompt files honor neither flag.
  - **Codex** — `disable-model-invocation: true` → `agents/openai.yaml` `policy.allow_implicit_invocation: false`; frontmatter flag ignored.
  - **OpenCode** — omit hidden skills (neither flag supported; `hidden: true` only works for subagents).

## Done (nudges)

W0 definitions reconciled · W1 init-workspace bodies inlined · W1 gitnexus→codemap merged · W1 coding-iac→coding · codemap skill added · W2 visibility flags on all r3 + r2 skills · W2 research (IDE→attribute matrix) · W3 phase-file flags · W4 descriptions compressed · W6 ARCHITECTURE + web skill/workflow counts · codemap-refresh hook (multi-backend GitNexus/Graphify, pre-check debounce, cross-platform node+setTimeout).

## Durable decisions

- `disable-model-invocation: true` ONLY for: `init-*` phases, workflow phase files, `specflow-use`.
- `user-invocable: true`: all capability skills + `hitl`, `operation-manager`, `questioning`, `specflow-use`, `reverse-engineering`, `tech-specs`. `risk-assessment`: `false`.
- Asset refs in skills: `ACQUIRE <skill/assets/file> FROM KB` (full path) — not bare `assets/`.
- Script-as-asset: scripts too large to inline → dedicated skill with `assets/*.txt`; executor ACQUIREs, renames, runs (established by `codemap`).
- Internal authoring notes never appear in skill text; reviewers grep for leakage.
- Reviewer: run `git diff HEAD` as primary input — not just new files.
- Release targeting: default `r3`; ask which release(s) per request.
- `context-engineering`: TBD placeholder, do not build. `discovery`: distinct skill, separate from codemap.
