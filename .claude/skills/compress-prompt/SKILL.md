---
name: compress-prompt
description: Compress a Rosetta KB prompt artifact (skill · workflow · phase · rule · agent · template · generic) by stripping structural tautology and ineffective scaffolding while preserving every importance-bearing token. Use when the user asks to compress, shorten, tighten, densify, or reduce a prompt / skill / workflow / phase / rule file.
disable-model-invocation: true
---

# Compress a KB Prompt

## Mental model
- The artifact you compress is loaded into a coding agent that runs in ANOTHER repo, on ANOTHER user's task. Every token becomes that agent's context → scaffolding = distraction that dilutes focus.
- Compress ≠ shrink words. Compress = strip scaffolding, keep 100% signal, sharpen focus, replace with meaningful unicode characters, like arrows.
- Reader is AI like you, capable: it already knows the domain AND the KB grammar. Use terms and acronyms. Don't explain — nudge.
- CAPS = importance. Word count is an OUTCOME, never a target.
- INVARIANT ≠ STEP. Invariants (always-on constraints) → declare ONCE, flag always-on. Steps → ordered, run once. NEVER re-assert an invariant as per-step reminders — that's the echo authors reflexively add; compress hoists + cuts it.
- GOLDEN RULE: NEVER trade a high-value token for a few saved words (unless it is repeatedly used and overall gives high results, we can loose 2% of value overall).
- BULLETS vs ORDERED: ALWAYS convert bullets to ordered lists, if work is sequential or can be sequential. Reason: aligns with AI sequential token generation.
- DENSIFY EVERY rule.
- Take time to think during reasoning, take different options, iterate multiple times TRANSFORM.
- Your task is MAXIMUM compression, not just low hanging fruits!
- NO rush, TAKE time
- Don't bring this skill terms or meta-thinking
- Identify what is load bearing

## Allowed reads — read-only, NEVER adjust
Read ONLY: the target artifact + its type schema + the grammar below. Nothing else. Stay focused.

Schemas (learn which XML scopes are MANDATORY vs optional, and each scope's role):
- `docs/schemas/skill.md`
- `docs/schemas/workflow.md`
- `docs/schemas/phase.md`
- `docs/schemas/rule.md`
- `docs/schemas/agent.md`
- `docs/schemas/template.md`
- `docs/schemas/generic.md`

Grammar — directive commands the system ACTS ON; protect verbatim + their args:

| Command | Semantics |
|---|---|
| `USE SKILL <name>` / `READ SKILL <name>` | activate skill (load `SKILL.md` + act) / load content only |
| `READ SKILL FILE <subpath>` / `APPLY SKILL FILE <subpath>` | load / load+execute a file of the CURRENT skill; never names a skill (isolation is grammar-enforced) |
| `USE FLOW <name>.md` / `READ FLOW <name>.md` | invoke a whole workflow / load without executing |
| `APPLY PHASE <file>.md` | load + fully execute the next phase body of a running workflow |
| `INVOKE SUBAGENT <name>` / `READ SUBAGENT <name>` | spawn subagent / load its definition only |
| `READ RULE <file>.md` / `APPLY RULE <file>.md` | load / load+execute a rule |
| `READ TEMPLATE <file>.md` | load a template |
| `READ CONFIGURE <tool>.md` | load an IDE/agent configure spec |
| `LIST <path>` | enumerate immediate children of a KB folder |
| `ACQUIRE <path> FROM KB` | MCP-only, generated shells: `query_instructions(tags="<path>")` |

## KEEP verbatim (never shrink / drop)
- MANDATORY scope tags + nesting — structure is signal. OPTIONAL scopes EARN keep (load-bearing audit).
- Grammar commands above + their args: file / skill / tool / model names, paths, section anchors.
- CAPS importance markers: MUST · NEVER · DO NOT · HALT · WAIT · SELF-CHECK · HITL …
- Per-scope / per-step instructions, kept IN their scope (e.g. update-state, gate notes).
- Semantic distinctions: required vs recommended, blocking vs optional, default vs conditional.

## CUT — where real reduction lives
- Tautology → rule stated >1× across scopes; keep ONE authoritative copy, kill the echoes.
- Pointer-echo → info already reachable via a named cite (invariant · `## scope` · file · skill) → NEVER re-assert or re-summarize it inline. Invariants → hoist to ONE always-on block; other echoes → cut. The pointer IS the content.
- Meta-commentary explaining the prompt's own notation / convention to a reader.
- Stale / orphaned items → reference a scheme, attribute, or value no longer present.
- WHOLE-SCOPE echo → CUT the scope, not just its lines.
- LOAD-BEARING test: delete scope → agent acts differently? No ⇒ cut.
- Audit EACH scope, esp. references · best_practices · validation · pitfalls.
- Keep ONLY signal unreachable elsewhere in-file / via cite.
- Mandatory-but-echo scope → shrink to minimum unique nugget.
- Lone nugget → hoist to load-bearing home, drop wrapper.
- Repeated literals → define once as a short alias (e.g. `OUT/ = <long/path>`), reuse everywhere.
- Cut the fluff.
- Restated the same thing in different ways.

## COMPRESS
- HARD CAP: every rule / bullet line < 10 words.
- Group same-topic rules, merge, rephrase clearly, output as separate.
- NO new lines as escape hatch.
- Whole file: MAY add ≤ 10 lines total.
- NEVER drop signal to hit the cap.
- Verbose prose / step-narration the agent already infers → terse cue.
  e.g. "ONE PHASE AT A TIME: read file, execute, update state, advance" → "ONE PHASE AT A TIME. READ JIT."
- Favor unicode connectives for density: → · ⇒ ≠ ± …  (English words only otherwise).
- DENSE, TERMS, ACRONYMS, TERSE-phrases (not sentences!)
- NUDGE using single words for ACTIONS, ASPECTS, THINKING, GOALS, REASONS, etc.

## NEVER
- Shave adjectives while leaving duplication intact (tiny gain, no structural fix).
- Drop CAPS / grammar commands / per-step instructions / distinctions to hit a number.
- Remove a schema-mandatory scope, or edit any schema / `ARCHITECTURE.md` file.
- Re-inject your own explanations while compressing.
- Remove items which sole purpose is process adherence, but you can compress it. Example "4. Update state file based on current state `file path`." in each phase => compress to `4. Update state`

## TRANSFORM — ordered passes, LOOP until iteration cannot compress any more
INVARIANTS (always-on, declared once): `## KEEP verbatim` + `## NEVER`. Run passes IN ORDER; skip none.
1. **CUT** — FIRST whole-scope load-bearing audit, THEN line/rule cuts → `## CUT`.
2. **GROUP + REPHRASE** — cluster same-topic rules → merge → rephrase clearly → output as SEPARATE lines. NEVER defer duplication to a later pass.
3. **COMPRESS** — densify → `## COMPRESS`.
4. **HARD CAP** — every rule/bullet line < 10 words; NO line-splitting to cheat; NEVER drop signal for the cap; whole file MAY add ≤ 10 lines.
↺ Repeat from pass 1 until a full loop changes nothing — each pass exposes new cuts/merges.

## Process (HITL)
1. Read target + its type schema + the grammar above. Nothing else.
2. Inventory: per-scope purpose + LOAD-BEARING verdict (keep/shrink/cut) + duplications, stale items, repeated literals.
3. Draft the compressed artifact as file next to current one, running `## Transform` to fixpoint. Do not overwrite yet.
4. HITL: present to the user → word Δ (before→after, %) + where the cuts came from + your reasoned take on the subagent findings.
5. VERIFY via subagent — `INVOKE SUBAGENT` (Sonnet-5 class, low reasoning (!), e.g. `claude-sonnet-5`) with a fresh read of OLD vs NEW, asking only:
   - Does anything change in an executing agent's understanding or behavior?
   - Is anything now ambiguous, underspecified, or lost?
   - Any rule / gate / distinction present in OLD but missing or weaker in NEW?
   - Any whole scope that only rephrases other scopes? → cut.
   - Anything else can be compressed? Anything you feel like you already know?
   - Any rules or phrases too verbose?
   - Anything that is obvious?
6. Do NOT auto-apply the subagent's output. CRITICALLY evaluate its findings — decide which are real vs noise, and why; adjust the draft only where a finding is genuine.
7. HITL: present to the user → proposed artifact + word Δ (before→after, %) + where the cuts came from + your reasoned take on the subagent findings.
8. On explicit user approval → write the TARGET file only.
