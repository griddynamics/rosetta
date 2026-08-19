# reasoning

Meta-cognitive skill that forces an 8-step DISCOVERY→DECIDE flow with explicit confidence and Tree-of-Thoughts branch expansion before a decision is committed.

## Why it exists

Without this skill a capable model jumps to a plausible-sounding answer, states it with unearned confidence, and never checks the strongest alternative to its own leading hypothesis. It fixes that failure mode by making decomposition, framework selection, and confidence scoring explicit steps, then forcing a second pass: DEBRIEF gates on confidence and DECIDE requires branching to competing answers — not just confirming the first one — before committing.

## When to engage

Multi-dependency/tradeoff problems needing explicit confidence; skip simple, low-risk questions. Output: answer + confidence + key caveats grounded in explicit reasoning steps (per `<when_to_use_skill>`). Frontmatter also routes engagement via `description`'s "Must use when asked to think or reason." Named `agent` affinities: `planner`, `architect`, `prompt-engineer` — used by other agents (planner, architect, reviewer, requirements-engineer, researcher) as a mid-flow step, and by workflows as a required/recommended skill at specific phases.

## How it works

Single flat `SKILL.md`; no `assets/` or `references/` subfolder. `<role>` frames the executor as a meta-cognitive reasoning specialist. `<core_concepts>` mandates the canonical 8-point flow, one numbered block each: DISCOVERY (search, terse output) → DECONSTRUCT (intent/entities/sub-problems) → DIAGNOSE (gaps, and select frameworks by name — e.g. EARS, STRIDE, 5 Whys — deferring their use to later steps) → DEVELOP (per-sub-problem confidence 0.0–1.0) → DESIGN (artifact structure, NFRs, tradeoffs) → DELIVER (output artifact, verification, weighted confidence) → DEBRIEF (challenge the answer; confidence <0.8 loops back to step 1) → DECIDE (only after DEBRIEF passes: a 7-step Branch/Expand/Score/Prune/Commit/Output/Loop algorithm using Tree-of-Thoughts). `<validation_checklist>` provides 9 proof-of-work checks (not a restatement of the process). `<best_practices>` and `<pitfalls>` are short, non-overlapping lists of what to do and what commonly goes wrong.

## Mental hooks & unexpected rules

- "do not stop at the single surviving answer" — DECIDE is not optional once DEBRIEF passes; the model must branch to alternatives even after it already has a confident answer.
- "If honest confidence < 0.8: name the weakest link, output a terse decision, and loop 1–7 again" — a numeric gate, not a vague "reflect more" instruction; below threshold, the whole 7-step flow (not just DEBRIEF) re-runs.
- "Do not abandon a branch because it looks weak early — follow it until it actually fails or actually holds" — bans early pruning by intuition; a branch is only killed with a stated reason (Prune step).
- "Decide WHAT to use; defer USING it to DEVELOP and DESIGN" — framework selection (DIAGNOSE) and framework application are deliberately split across two different steps, not done together.
- "For simple questions, skip deep decomposition and use ToT directly" — the 8-step flow itself is conditional; DECIDE's branching can be reached without the full DISCOVERY..DELIVER chain for low-complexity cases.

## Invariants — do not change

- Frontmatter `name: reasoning` must equal the folder name and match the `- reasoning` line in `docs/definitions/skills.md`.
- `description` follows the schema's GENERIC form but is dense with "meta-cognitive", "8D", and a 3-model CSV — likely over the schema's stated "~25 tokens" budget; not verified compliant, flagged for a maintainer to recount.
- `model: claude-4.8-opus-high, gpt-5.5-high, gemini-3.1-pro-high` — the multi-vendor CSV is intended: the plugin generator selects the appropriate id per target agent. Keep one id per vendor.
- `agent: planner, architect, prompt-engineer` with `context: default` — intended; kept as affinity metadata (which subagents this skill serves). It only becomes a fork target under `context: fork`.
- The flow is 8 steps (DISCOVERY, DECONSTRUCT, DIAGNOSE, DEVELOP, DESIGN, DELIVER, DEBRIEF, DECIDE) and frontmatter calls it "8D," so the file is internally self-consistent; external callers (e.g. `prompts/adhoc-flow.prompt.md:41`) now use the same "8D" label. Do not renumber the flow.
- Inbound couplings, real (verified by reading each hit, excluding generic uses of the word "reasoning"): `USE SKILL reasoning`/`` USE SKILL `reasoning` `` in `agents/planner.agent.md`, `agents/architect.agent.md`, `agents/reviewer.agent.md`, `agents/requirements-engineer.agent.md`, `agents/researcher.agent.md`; `skills/planning/SKILL.md` (step 1 of its core flow, plus its `<resources>` list); `skills/orchestration/assets/o-team-manager.md`; and workflow references (required or recommended skill) in `prompts/research-flow.prompt.md`, `prompts/coding-flow.prompt.md`, `prompts/adhoc-flow.prompt.md`, `prompts/code-analysis-flow.prompt.md`, `prompts/self-help-flow.prompt.md`. Renaming the skill folder or the `reasoning` alias breaks every one of these call sites.
- Excluded as noise (word "reasoning" used generically, not as a skill reference): `configure/claude-code.md`, `configure/cursor.md`, `configure/codex.md`, `configure/github-copilot.md` (model-capability prose); `instructions/bootstrap-alwayson.instructions.md` ("the reasoning was sound"); `templates/shell-schemas/agent-shell.md`; `skills/coding-agents-prompt-authoring/references/*.md`; `skills/dangerous-actions/SKILL.md` and its `README.md` (describe their own guardrail reasoning process, not this skill).

## Editing guide

Safe to edit: wording inside `<best_practices>`/`<pitfalls>`, additional named frameworks in DIAGNOSE's examples, `<validation_checklist>` items. Handle with care: the 8 step names and their order (external callers and this skill's own DEBRIEF/DECIDE cross-references depend on the sequence), the `<0.8` confidence threshold (a numeric gate other logic branches on), and the DECIDE algorithm's 7 sub-steps (Branch/Expand/Score/Prune/Commit/Output/Loop). New reasoning techniques belong in DEVELOP; new NFR/quality-attribute categories belong in DESIGN. Referenced by: five agent shells (planner, architect, reviewer, requirements-engineer, researcher), `skills/planning/SKILL.md`, `skills/orchestration/assets/o-team-manager.md`, and five workflow files (research, coding, adhoc, code-analysis, self-help flows).
