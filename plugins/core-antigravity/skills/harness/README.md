# harness

Turns "I wrote it" into "I ran it": designs the executable apparatus — callable actions, an isolated local environment, or the skills and subagents themselves — that lets a coding agent actually exercise what it changed.

## Why it exists

Without it an agent has no way to run or observe its work, so "done" silently degrades to "compiles and unit tests pass." Left to plain judgment a model will wrap one command per API endpoint, mock every external dependency because that feels safe, dump raw logs that flood context, point actions at whatever environment the config happens to name, author a skill it never once triggers, and declare all of it delivered without executing anything. This skill forces classify → discover → HITL-approve a specification → build → prove by execution → record an inventory.

## When to engage

Model-invocable, no `disable-model-invocation`. Auto-activates on the description's keywords when something must be run, observed, or validated and the means do not exist. Actor: orchestrator/top-agent — it gates with HITL and hands off. Prereqs in `<core_concepts>`: Rosetta prep steps complete, `USE SKILL hitl`, `orchestration`, `load-project-context`. Scope is pre-PR local verification only; unit-test frameworks, CI pipelines, production tooling and load testing are out.

## How it works

`SKILL.md` is a router, not a builder. `<process>` runs nine steps: classify the gap into ACTIONS, ENVIRONMENT, and/or PROMPTING → discover existing assets from `ARCHITECTURE.md`/`TECHSTACK.md`/`DEPENDENCIES.md`/`CODEMAP.md` → propose placement in the repo's own conventions → load the matching asset → write the specification to FEATURE PLAN folder → HITL gate → build → prove by executing → write the `## Harness` inventory into `ARCHITECTURE.md`.

| Asset | Covers |
| --- | --- |
| `assets/cli-mcp-scripts.md` | delivery shape, encapsulation, action granularity, output contract, environment boundary |
| `assets/devcontainers.md` | runnable set, artifacts, safe/unsafe dependency triage, six containment options, HITL gates, cold-start proof |
| `assets/prompting.md` | the block palette in five clauses, container rules, boundaries, the build loop |
| `assets/prompting-writing.md` | rendering blocks into text a model follows; model defaults to write against; review protocol |
| `assets/prompting-proof.md` | fixture, one trigger per invariant, evaluator ladder, repeats, baseline, containment |
| `references/configure/*.md` | per-coding-agent formats, locations, and feature support; routed from the `target agent` block |

ACTIONS and ENVIRONMENT hand implementation to `coding-flow`. PROMPTING authors text and scripts inline — `SKILL.md` step 7 says so explicitly, because that flow's reviewer and validator phases duplicate the harden and prove steps the prompting assets already own.

## Mental hooks & unexpected rules

- `"Definition of done PLUS the means to prove it"` — the harness is both halves; a spec without an executable is half-delivered.
- `"One action = smallest MEANINGFUL business outcome, composed of several calls. Not an endpoint wrapper."` with the `create-order` worked example — the most load-bearing design rule in `cli-mcp-scripts.md`.
- `"Observed trace = fixture for later automated tests. Verbose output is the product, not debug noise."` — why verbose is default and `--quiet` the exception.
- `"Redact credentials, tokens, cookies, keys on EVERY output path. Default, not a flag."` paired with `--show-secrets` as opt-in gated by `sensitive-data`.
- `"Secrets passed as CLI arguments — they land in shell history and process listings."` — a non-obvious leak path, listed as a pitfall.
- `"Uncertain counts as unsafe until the user decides otherwise."` — triage defaults to caution, not convenience.
- `"No unsafe dependency reachable from inside — verify by attempting the call, not by reading config."` — proof by execution, never by inspection.
- `"A skill is a contract: when I run, what I read, what I do, what I refuse, what done means."` — the frame that organizes the whole prompting block palette; the blocks are grouped by clause, not by topic.
- `"Anything carrying procedure, capability, knowledge, or scripts is a SKILL. Always."` with `"A SUBAGENT is a context placeholder holding a non-specialized proto-role"` — there is no skill-versus-subagent decision to make, and collapsing a skill into a subagent is the error the pair exists to block.
- `"Acting from memory is the default failure."` — the grounding half of the knowledge block; tell it what it cannot know, and make it observe what it would otherwise recall.
- `"Deterministic step → code. Prose re-derives it every session and drifts; code does not."` — scripts are a skill capability, not a compression trick.
- `"Disclosure that loads everything anyway saves nothing."` — progressive disclosure is falsifiable, and `prompting-proof.md` asserts it by checking the untaken branch stays unread.
- `"One trigger per invariant."` — the proof trigger list is derived, not improvised; routing, grounding, scope, gate, injection, disclosure, completion, idempotency, composition, subagent.
- `"Assert routing first. A skill that never loads is the most common failure, and the happy path hides it."`
- `"One green run proves nothing."` — pass rate over trials, plus a baseline run with the artifact absent; no movement means it earns nothing and costs tokens.
- `"Written but unexecuted = not delivered."` — the acceptance rule the whole skill exists to enforce.
- Containment options are ordered cheapest→most faithful and are `"presented as options... the user chooses"`.
- `"Each action: its own command AND its own file"` — file granularity is contract, not style.

## Invariants — do not change

- Frontmatter `name: harness` must equal the folder name and matches the registry entry in `docs/definitions/skills.md` (plain list, `- harness`).
- Frontmatter `description` is the ONLY surface visible before the skill loads — it carries every activation trigger and must stay short and keyword-dense. `SKILL.md` deliberately has no `<when_to_use_skill>` for that reason (same omission as `orchestration`); do not add one back as a trigger list.
- Asset filenames are referenced by exact path from `<process>` step 4; renaming any breaks the router.
- The `## Harness` section name in the target repo's `ARCHITECTURE.md` is written by `SKILL.md` step 9 alone. The assets deliberately carry no `<registration>` block — do not reintroduce one, it would fork the definition.
- `USE FLOW coding-flow.md` in step 7 is the implementation handoff for ACTIONS and ENVIRONMENT, fed by the specification from step 5. Replacing it with a plain `USE SKILL coding` drops the reviewer, HITL, and validation phases. The step's closing clause exempting PROMPTING is load-bearing; without it the router contradicts itself for the third kind.
- Redaction-by-default plus `sensitive-data`-gated `--show-secrets`, and the local/isolated default with an HITL gate for shared environments, are user-approved decisions, not defaults to relax.
- `references/configure/*.md` are a verbatim copy of the plugin-root `configure/` folder, reached with `APPLY SKILL FILE`, never the `READ CONFIGURE` alias. The root folder still ships and still has its alias; retiring both is follow-up work. While both exist, edits must land in the plugin-root copy and be re-copied here — never diverge.
- `RECOMMEND USE SKILL harness` pointers in `testing/SKILL.md` (`<core_concepts>` Infrastructure) and `coding/SKILL.md` (`<core_concepts>`) are this skill's inbound couplings; renaming it needs matching edits there.
- Alias grammar follows `docs/schemas/skill.md`: `APPLY SKILL FILE` for this skill's own assets and references (never carries a skill name), `USE SKILL` for siblings, `USE FLOW <name>.md` for the workflow.

## Editing guide

Safe to change: wording inside `<core_concepts>`, `<pitfalls>`, and the asset bodies, as long as the action-granularity rule, the output contract, the safe/unsafe criteria, the containment list, the five-clause frame, and the container rules survive. Handle with care: the nine `<process>` steps (the HITL gate at 6 and the proof at 8 are why the skill works), the asset paths, and the `## Harness` section name.

Routing for new content: the callable surface → `cli-mcp-scripts.md`; running the system locally → `devcontainers.md`; what a skill or subagent is assembled from → `prompting.md`; how its lines are written → `prompting-writing.md`; how it is executed and asserted → `prompting-proof.md`; per-coding-agent specifics → `references/configure/`. A genuinely new harness kind belongs in a new asset plus one classification branch in step 1 — never inlined into `SKILL.md`.

The prompting assets are held to the rules they teach: under 8 words per line where the line allows, no meta-explanation, no restating what a model already knows. An edit that adds a "why this section exists" paragraph fails the asset's own `<cut>` list. Adding blocks to the palette is the common temptation and usually wrong — the palette is picked from, not enumerated; a candidate block that is already a competent author's habit belongs nowhere.

Precedent worth reading before editing: `src/rosetta-mcp-server/validation/verify_mcp.py` — a real host that installs and exercises the MCP server as an IDE would. For the prompting kind: `tests/e2e-tests/*` (fixture workspace, pinned plugin install, trigger prompt, gated evaluator ladder with an `llm-judge` rubric) and `docs/manual-tests/*.md` (trigger prompts plus a per-phase "must see" table).
