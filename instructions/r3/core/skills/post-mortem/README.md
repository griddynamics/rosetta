# post-mortem
User-invoked two-phase harness diagnosis: attribute a bad outcome to a layer (prompt/workspace/local config/Rosetta/tooling), then — only if ≥1 defect is Rosetta-attributed — optionally file a sanitized GitHub issue against Rosetta.

## Why it exists
Without it, a model asked "why did this fail" would blame the artifact instead of the harness that produced it, skip straight to a conclusion without an evidence inventory, default to blaming Rosetta instructions rather than the more-common local causes, treat a user's question or edit on a draft as approval, and jump from diagnosis to filing an issue in one motion. The skill forces an evidence-first, per-layer, root-cause process with a hard stop between reporting and submitting.

## When to engage
`disable-model-invocation: true` + `user-invocable: true` → never auto-runs, explicit invocation only, `argument-hint: "optional: skill/agent/workflow name or concern"`. Prerequisite: "All Rosetta prep steps MUST be FULLY completed, load-project-context skill loaded and fully executed." Never self-chained: `deviation` (step 8) and `self-learning` (step 11) each say "RECOMMEND user to USE SKILL `post-mortem` ... NEVER run it yourself" — both hand off to the user, neither invokes it directly.

## How it works
Single flat `SKILL.md`, no `assets/`/`references/`. Root `<post_mortem>` wraps: `<core_concepts>` (harness-not-artifact scope, root-cause-not-symptom, five-layer taxonomy, blunt tone, hard gate between phases, P0-P3 severity); `<process>` phase ① (10 steps: collect evidence → OUTPUT inventory → assess every layer → OUTPUT candidate list → drill one candidate to root cause → OUTPUT verdict, loop → generalize fixes → OUTPUT recommendations → store rules in AGENT MEMORY.md → OUTPUT final report assembled only from prior outputs) and phase ② — entered ONLY if ≥1 defect was attributed to Rosetta instructions, otherwise state "nothing Rosetta-attributable" and stop — (6 steps: Gate A yes/no to file → sanitize → OUTPUT full draft → Gate B exact-sentence submit → `gh issue create` or manual fallback → report URL); `<validation_checklist>` (7 proof checkpoints); `<pitfalls>` (8 anti-patterns); `<templates>` (post-mortem report + GitHub issue draft, both fenced markdown). Actors: the user (invoker, sole gate-answerer), the executing agent (diagnostician, never fixes anything), `griddynamics/rosetta` (issue target via `gh`).

## Mental hooks & unexpected rules
- "Most failures are local; do NOT default to blaming Rosetta." — bias correction against the skill's own habitat (invoked after Rosetta-authored skills stumble).
- Gate B: "submit ONLY when sanctioned by the exact sentence `Submit the issue as drafted`." — literal-string submit gate, same pattern hitl's README calls out.
- "question/suggestion/edit/'fix it' = review ≠ approval. Unclear answer ≠ 'no' → ASK AGAIN directly." — applies at both Gate A and Gate B; no silent default either way.
- "Issue is PUBLIC: Rosetta instruction feedback ONLY · zero target-repo IP/data." — hard sanitization boundary because the target repo is public.
- Numbered `OUTPUT ... ONLY THEN proceed` checkpoints after steps 2/4/6/8/13 — forced sequence, cannot skip ahead to a conclusion or a draft.
- "16. Report issue URL. Change NOTHING else — this skill fixes nothing." — scope lock: diagnose and report only, never remediate.
- "Critique the harness, never people." — blameless framing paired with an explicitly "blunt, harsh on defects" tone toward instructions/files.

## Invariants — do not change
- `name: post-mortem` equals the folder name; registered in `docs/definitions/skills.md` alongside `self-learning`/`post-mortem`/`sensitive-data`/`hitl`/`dangerous-actions`.
- Root tag `<post_mortem>` — underscore form of the hyphenated name, per the schema's `<[the_skill_name]>` wrapper convention (mirrors `self_learning`).
- `disable-model-invocation: true` + `user-invocable: true` must stay paired: never auto-engages (callers only recommend it), stays directly callable via `/post-mortem`. Per `docs/schemas/skill.md`, `disable-model-invocation: true` exempts the description from the auto-invocation token budget but requires it stay user-friendly — current description "Diagnose instruction defects and optionally submit Rosetta GitHub issue" satisfies that.
- `argument-hint` is present because `user-invocable: true`, per the schema's pairing rule.
- Gate B literal string `Submit the issue as drafted` is the only accepted sanction text (process step 14); nothing parses it in code, but rewording removes the documented anti-rubber-stamp safeguard and breaks the parity hitl's README cites ("High+ risk: require EXACT sentence to type ... same pattern as `post-mortem`'s exact-sentence submit gate").
- `gh issue create --repo griddynamics/rosetta ...` — target repo string; changing it silently redirects where findings get filed.
- Inbound couplings — re-verify with `grep -rn "post-mortem" instructions/r3/core --include="*.md"`: `deviation/SKILL.md` step 8 and `self-learning/SKILL.md` step 11 both name-reference `post-mortem` in prose only (not machine-checked) — renaming or restructuring this skill breaks those recommendations silently. `hitl/README.md` cites this skill's Gate B as a comparison example, a documentation-only coupling.

## Editing guide
- Safe: prose inside `<core_concepts>`/`<process>` bullets that preserves the OUTPUT-checkpoint sequencing and Gate A/B semantics; template field order; `<pitfalls>` ordering.
- Handle with care: the 10-step phase-① and 6-step phase-② numbering (removing an `OUTPUT` checkpoint changes behavior, not just cosmetics); the exact Gate B sentence; the frontmatter invocation flags; the P0-P3 severity taxonomy (consumed by both templates).
- New content belongs directly in `SKILL.md` — no `assets/`/`references/` split exists yet; if the templates or process grow, consider factoring per the split pattern hitl's own README flags for itself.
- Referenced by: `deviation/SKILL.md`, `self-learning/SKILL.md` (recommend-only, never auto-invoke); `docs/definitions/skills.md` (registry); `hitl/README.md` (cites this skill's Gate B pattern).
