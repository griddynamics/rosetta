# backlog
Two-mode backlog skill: decide whether an existing story is honestly ready for development, and break approved work into a human WBS.

## Why it exists
Left to plain judgment, an agent handed a story either declares it fine and starts coding, or declares it blocked and stops. Both are wrong. This skill forces a code-grounded readiness verdict on two independent axes, and makes an unready story *partially actionable* instead of blocked. The failure modes it targets are named in the technical-analysis prompt: nobody should discover mid-sprint that an external contract was never read, a package was never used here, or a field does not exist.

## When to engage
- Actor: orchestrator or top agent. The two deep passes and the write-back run as `engineer` subagents.
- `story-validator` — a story, ticket, or epic exists and sprint-intake readiness is unclear.
- `work-breakdown` — approved, readiness-cleared work needs a human WBS with EARS FRs.
- Prereqs: Rosetta prep steps complete, `load-project-context` executed. `story-validator` additionally needs a readable Issue Tracker integration; write-back needs write access or it degrades to ready-to-paste text.
- Not for: authoring requirements from scratch (`requirements-authoring`), AI session graphs (`planning`), implementation (`coding`).

## How it works
`SKILL.md` is a router and holds nothing but routing, orchestration, and the cross-mode grounding/audience rules. All method lives in `assets/`:

| Load | Purpose |
|---|---|
| `assets/story-validator.md` | mode-1 method: 7 steps, verdict rules, toolbox, report contract |
| `assets/story-validator-business-analysis.md` | step 2 dispatch prompt |
| `assets/story-validator-technical-analysis.md` | step 4 dispatch prompt |
| `assets/story-validator-backlog-writeback.md` | step 7 dispatch prompt + tracker write binding |
| `assets/work-breakdown.md` | mode-2 method: size scaling, WBS contract, WBS template |
| `assets/work-breakdown-templates.md` | LARGE only: EARS FR + risk-register templates |

Mode-1 flow: intake via `data-collection` (read-only) → business analysis → user Q&A → technical analysis → parallel focused concerns → user Q&A → gated write-back.

## Mental hooks & unexpected rules
- `"Readiness is a claim about information, not about effort"` — the verdict comes from the enough-information test, never from how polished the story reads.
- `"Two verdicts, independent, never merged"` — technical feasibility can be sound while business intent is ambiguous. Neither axis colours the other.
- `"Blocking is the last resort"` — the toolbox exists so the answer is a split, a spike, or a labelled assumption plus follow-up, not a refusal.
- `"Ungrounded output is worse than no output"` — no citation means it is not a finding; it becomes an unknown.
- `"Verbatim means copied. A paraphrased contract is a defect."` — paraphrasing a field list is precisely what stalls implementation later.
- `"Enumerate options; never choose one"` — the technical pass reasons from the implementer's seat but hands the decision to them.
- `"You make sure they never have to ask what"` — tasks carry contracts, paths, and precedents; they carry no chosen approach.
- `"Delete is not available"` — the write binding has no delete op by design; irreversible removal of other people's history is proposed, never performed.
- Concerns are split so they fail independently: one unresolved external dependency must not drag every other concern to not-ready.

## Invariants — do not change
- `name: backlog` equals the folder name and the entry in [docs/definitions/skills.md](../../../../../docs/definitions/skills.md).
- `description` drives auto-activation and is budgeted at roughly 25 tokens. It must keep naming story readiness, sprint intake, and WBS.
- The four verdict labels are external contract, written into a live tracker: `ready-for-development`, `not-ready-for-development`, `tech-ready`, `not-tech-ready`. Renaming them breaks every saved filter and board query using them.
- Subagents reach a dispatch prompt by using this skill with a `dispatch` name, never by an `APPLY SKILL FILE` written into a dispatch line: `SKILL FILE` resolves against the *current* skill, and a freshly spawned subagent has none. The `<dispatch>` branch in `SKILL.md` is what anchors `assets/` in the subagent's context, and it must stay ahead of `<modes>`. The three names `business-analysis`, `technical-analysis`, `backlog-writeback` are load-bearing and must match the asset filenames.
- Every analysis and write-back dispatch carries `subagent_required_model="gpt-5.6-sol-high"`. The `engineer` agent defaults to a workhorse tier; without the override the deep passes run under-powered.
- The write binding names operations by capability, not by vendor tool name, and has no delete operation. Preview-then-approve, and per-operation confirmation for overwrites and closes, are the safety contract.
- `assets/work-breakdown-templates.md` stays behind the `applies="LARGE"` gate. Inlining it loads template text into every SMALL run.
- `skills/planning/SKILL.md` redirects human-work-breakdown requests here. That redirect is the compatibility path for existing `planning` callers.

## Editing guide
Safe: `role` wording, pitfall and best-practice bullets, report section ordering, toolbox phrasing. Handle with care: the verdict label strings, the seven-step sequence and its two user gates, the write binding's approval and no-delete rules, the task contract's forbidden list, the size-scaling table, and the `applies="LARGE"` gate. New capability → a new mode asset plus one row in the `SKILL.md` trigger table; never grow `SKILL.md` with method detail. New per-concern analysis depth → the relevant dispatch prompt, not the router. `plugins/**` is generated; edit here and regenerate. Referenced by `docs/definitions/skills.md` and `skills/planning/SKILL.md`.
