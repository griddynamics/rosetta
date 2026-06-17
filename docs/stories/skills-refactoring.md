# Story: Skills Taxonomy Reconciliation + Frontmatter Refactoring

Status: IN PROGRESS — r3 W1/W2/W3/W4 done; r2 visibility flags ported; W0/W6 done; W2 research done. Remaining: W5 (guardrails reframe), W2 generator changes.

## Done (this PR — feat/skills-visibility-flags)

- **W4** — All descriptions compressed (verb-first ≤25 tokens). 4 critical skills kept verbatim.
- **W3** — Phase files `user-invocable: false`; top-level flows `true`. Descriptions → `Phase N <label> of <flow>`.
- **W2** — All 44 r3 skills carry both `user-invocable` + `disable-model-invocation`. r2 ported (35 skills). Cross-IDE matrix deferred (W2 research).
- **W1 init-workspace** — 7 skill bodies inlined into phase files; skill folders deleted (r3 only).
- **W1 gitnexus** — `gitnexus-{tools,cli,setup}` merged into single `gitnexus` skill with `assets/gitnexus-{cli,setup}.md` (r3 only).
- **W1 coding-iac** — folded into `coding` via `assets/iac.md` (prior pass).
- **codemap skill** — new `skills/codemap/` (`disable-model-invocation: true`, `user-invocable: false`); scripts in assets; wired into init-workspace-flow-discovery, coding-flow discovery (recommended), reverse-engineering.
- **Various** — `orchestrator-contract` read-only clarification; `questioning` rules refined; `coding-flow` architect-background guidance; `coding-agents-prompt-adaptation` removed; `hooks-authoring` → `coding-agents-hooks-authoring`.

## Open Workstreams

- **W5 — Native-trigger reframe.** Shrink `bootstrap-guardrails.md` to a minimal pointer — remove inline trigger restatements already carried by skill descriptions. Done when: rule no longer repeats any trigger the description already carries.
- **W2 generator changes** (remaining after research). Implement per-IDE flag handling in `src/plugin-generator/` (TypeScript, per-IDE processors under `src/plugin-generator/src/plugin-processors/`):
  - **Cursor** — emit skills to repo-level `.cursor/skills/` not plugin-delivered; `disable-model-invocation` on plugin-delivered skills is broken (fully hides skill, Cursor bug)
  - **Copilot** — switch target from `*.prompt.md` → Agent Skills (`.github/skills/`); prompt files honor neither flag
  - **Codex** — transform `disable-model-invocation: true` → `agents/openai.yaml` sidecar `policy.allow_implicit_invocation: false`; frontmatter flag silently ignored
  - **OpenCode** — omit hidden skills from output (neither flag supported); `hidden: true` only works for subagents

## Done (this PR — feat/skills-visibility-flags)

- **W0** — `docs/definitions/skills.md` and `docs/definitions/workflows.md` reconciled: plan-manager→operation-manager, init-workspace-* removed, gitnexus consolidated, codemap/load-*/natural-writing/coding-agents-* added, unbuilt workflows removed.
- **W6** — `docs/ARCHITECTURE.md` + `docs/web/docs/architecture.md`: skill count updated (20→35, workflows 4→12), extension points updated to r3. IDE configure files updated with available frontmatter fields (`instructions/r3/core/configure/`).
- **W2 research** — IDE→attribute matrix produced. Configure files updated with available fields per IDE.

## Confirmed decisions (keeper — needed for W0/W5/W6)

- `disable-model-invocation: true` ONLY for: `init-*` phases, workflow phase files, `specflow-use`.
- User-facing skills (`user-invocable: true`): all capability skills + `hitl`, `operation-manager`, `questioning`, `specflow-use`.
- `risk-assessment`: `user-invocable: false`.
- `reverse-engineering`, `tech-specs`: `user-invocable: true`.
- Asset references in skills: use `ACQUIRE <skill/assets/file> FROM KB` (full path) — not bare `assets/` paths. See `gitnexus/SKILL.md:46-47`, `codemap/SKILL.md:37-38`.
- Script-as-asset pattern: scripts too large to inline → dedicated skill with `assets/*.txt`; executor ACQUIREs, renames, runs. Established by `skills/codemap/`. Apply to any future executable asset.
- Internal notes must never appear in skill text: authoring context (structural depth, what it "is not", etc.) stays out of SKILL.md entirely. Reviewers must grep for leakage.
- Reviewer process: MUST run `git diff HEAD` as primary input — not just read new files — to catch regressions and command-alias violations.
- gitnexus consolidation: prior "dropped" decision reversed; `gitnexus-{cli,setup,tools}` → single `gitnexus` skill (`skills/gitnexus/`).
- Release targeting: default `r3`; ask each request which release(s) to apply.
- `context-engineering`: TBD placeholder in definitions, do not build.
- `discovery`: distinct skill, separate from codemap.
