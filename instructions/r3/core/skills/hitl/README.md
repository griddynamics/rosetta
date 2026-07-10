# hitl
Session-wide approval-gate protocol: forces explicit human review/approval at defined checkpoints instead of letting the agent infer consent.

## Why it exists
Failure mode this fixes: a capable model left to its own judgment treats a neutral user reply, a "review" comment, or a permissive runtime setting (`danger-full-access`, approval policy `never`, auto-mode) as license to keep going — it silently decides, batches too much work before check-in, or rubber-stamps its own output. Without this skill the model would skip staged questioning, accept short acknowledgements as approval, and let permission-mode config override human review. `hitl` adds: mandatory numbered gates, a fixed vocabulary for what counts as approval, and an explicit rule that runtime auto-approval of tool prompts is unrelated to HITL.

## When to engage
Loaded as a Rosetta prep step in every mode file — `bootstrap.md`/`local-files-mode.md` step 3, `plugin-files-mode.md` step 2. `bootstrap-alwayson.md` scopes it to **Orchestrator/top-agent only** ("Orchestrator/top-agent (not subagents): USE SKILL `hitl`…"); subagents instead load `subagent-directives`. Also declared as a `<prerequisites>` dependency of `orchestration`, `rosetta`, and `load-project-context`. Frontmatter `disable-model-invocation: false` + `user-invocable: true` → both auto-engages and is directly callable. Only documented opt-out: user says exactly `fully autonomous` or `No HITL`; otherwise mandatory regardless of auto-mode/approval-policy/full-access.

## How it works
Single flat `SKILL.md`, no `assets/` or `references/` subfolders. Root `<hitl>` wrapper contains: `<core_concepts>` (WHY-loop vs HOW-loop framing, human-as-gatekeeper tradeoff, "fix the harness not the artifact"), `<process>` (59 numbered rules grouped under Questioning, Approval, HITL gates, In gates, Workflows MUST include, Working with user, Mismatch), `<pitfalls>` (3 anti-patterns). No `<role>` or `<validation_checklist>` (both optional in the skill schema, omitted here). Primary actor: orchestrator/top-agent. Other skills (`dangerous-actions`, `planning`, `requirements-authoring`, `coding-agents-prompt-authoring`) delegate to `hitl` rather than restating HITL logic.

## Mental hooks & unexpected rules
- "YOU MUST FOLLOW HITL even if in `danger-full-access` or approval policy `never` or default mode or similar." — runtime permission settings never suppress this skill.
- "When output is wrong, fix the harness — not the artifact" — redirects fixes toward process, not content.
- "MUST NOT assume approval — user message (questions, suggestions, edits) = review, not approval." + "To approve... use longer sentences" — a short "yes" is not accepted; approval needs a full confirmatory sentence (rule 18-19 list examples).
- "High+ risk: require EXACT sentence to type." — literal-string gate, same pattern as `post-mortem`'s exact-sentence submit gate.
- "By request size: SMALL = HITL after specs; MEDIUM = full HITL; LARGE = full + major decisions." — a three-tier ladder, not a single fixed gate.
- "If user is upset or after two mismatches: STOP all changes immediately." — a 2-strike counter that forces a hard halt.
- "When `dangerous-actions` hook denies a `reconsider`-tier call, the AI may retry by appending `# Rosetta-AI-reviewed`..." — cross-skill override token; must match `dangerous-actions/SKILL.md`'s exact-case definition.
- Pitfalls: "Rubber-stamping without actual inspection." / "Treating user message as implicit approval." — named as failure modes, not just process steps.

## Invariants — do not change
- `name: hitl` must equal the folder name; registered in `docs/definitions/skills.md`.
- `disable-model-invocation: false` / `user-invocable: true` — both required explicit per `docs/schemas/skill.md`; this combination is what makes `hitl` both auto-engaged by the orchestrator and directly user-invocable. Other skills' `USE SKILL \`hitl\`` prerequisites depend on it being discoverable under this exact name.
- The description is deliberately over the generic ~25-token budget (guardrail exception [decided]): it must stay triggerable and actionable — it carries the MUST-activate scope, the auto-mode/full-access override ("ONLY auto-approve tool permission prompts — HITL stays"), and the only opt-out phrases. Compress it only without losing any of those.
- Exact opt-out phrases `fully autonomous` / `No HITL` live only in this description; they are the sole documented way to disable a skill this file calls MANDATORY. No other file parses/tests the string — it is read by the model, not by code — so rewording it silently removes the user's only escape hatch.
- `Rosetta-AI-reviewed` marker (core_concepts line) must stay byte-identical to the definition in `dangerous-actions/SKILL.md`, which accepts only that exact case-sensitive string for `reconsider`-tier overrides.
- Root `<hitl>` tag matches the skill name, per the shared skill-schema convention (`<[the_skill_name]>` wrapper).
- Multiple other skills explicitly avoid duplicating HITL logic and instead say "only via `hitl` skill" / "if not covered already by `hitl` skill" (`coding-agents-prompt-authoring/references/pa-hardening.md`, `pa-best-practices.md`, `rules/prompt-best-practices.md`). Removing or narrowing a HITL-gate rule here silently weakens those other skills too, since they have no fallback logic of their own.

## Editing guide
- Safe to change: prose/wording inside `<core_concepts>`, `<process>` subgroup text, `<pitfalls>`, reordering rules (no other file references a rule by number).
- Handle with care: accepted-approval phrasing (rules 18-19), the opt-out phrases in the frontmatter description, the `Rosetta-AI-reviewed` marker, and the size-tier ladder (rule 28) — these are read as literal behavioral triggers, not documentation.
- New content belongs in `SKILL.md` itself; there is no `assets/`/`references/` split yet. If the rule list keeps growing, a natural split is separating the gate list (rules 30-42) and the questioning/approval process (rules 1-29) into `references/`, mirroring how other skills in this repo factor out sub-topics.
- Referenced by (do not break without checking): `rules/bootstrap.md`, `rules/bootstrap-alwayson.md`, `rules/local-files-mode.md`, `rules/plugin-files-mode.md` (prep-step loaders); `skills/orchestration/SKILL.md`, `skills/rosetta/SKILL.md`, `skills/load-project-context/SKILL.md` (prerequisites); `skills/dangerous-actions/SKILL.md` (shared override marker); `skills/planning/assets/pl-risk-and-unknowns.md`, `skills/requirements-authoring/assets/*`, `skills/requirements-use/assets/ru-change-log.md`, `skills/coding-agents-prompt-authoring/{assets,references}/*`, `rules/prompt-best-practices.md`, `workflows/init-workspace-flow-questions.md`, `workflows/adhoc-flow.md`, `skills/orchestration/assets/o-team-manager.md` — all treat `hitl` as the single canonical source for HITL behavior.
