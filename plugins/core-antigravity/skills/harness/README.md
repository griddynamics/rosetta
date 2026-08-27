# harness

Turns "I wrote it" into "I ran it": designs the executable apparatus — callable actions, an isolated environment, the skills and subagents themselves, or the automation that runs them unattended — that lets a coding agent actually exercise what it changed.

## Why it exists

Without it an agent has no way to run or observe its work, so "done" silently degrades to "compiles and unit tests pass." Left to plain judgment a model will wrap one command per API endpoint, mock every external dependency because that feels safe, dump raw logs that flood context, author a skill it never once triggers, and wire an unattended agent that executes whatever an issue body tells it to. This skill forces classify → discover → HITL-approve a specification → build → prove by execution → record an inventory.

## When to engage

Model-invocable, no `disable-model-invocation`. Auto-activates on the description's keywords when something must be run, observed, or validated and the means do not exist. Actor: orchestrator/top-agent — it gates with HITL and hands off. Prereqs in `<core_concepts>`: Rosetta prep steps complete, `USE SKILL hitl`, `orchestration`, `load-project-context`. Scope is pre-PR local verification plus the unattended apparatus around it; production tooling and load testing are out.

## How it works

`SKILL.md` is a router, not a builder. `<process>` runs nine steps: classify the gap → discover existing assets from `ARCHITECTURE.md`/`TECHSTACK.md`/`DEPENDENCIES.md`/`CODEMAP.md` → propose placement in the repo's own conventions → load the matching asset → write the specification to FEATURE PLAN folder → HITL gate → build → prove by executing → write the `## Harness` inventory into `ARCHITECTURE.md`.

| Kind | Gap | Asset → covers |
| --- | --- | --- |
| ACTIONS | cannot act on or observe a running service | `cli-mcp-scripts.md` — delivery shape, encapsulation, action granularity, output contract, environment boundary |
| ENVIRONMENT | cannot run it locally at all | `devcontainers.md` — runnable set, artifacts, safe/unsafe dependency triage, six containment options, HITL gates, cold-start proof |
| PROMPTING | cannot author or prove a skill or subagent | `prompting.md` — block palette in five clauses, container rules, boundaries, build loop · `prompting-writing.md` — line-level craft, model defaults to write against, review protocol · `prompting-proof.md` — fixture, one trigger per invariant, evaluator ladder, repeats, baseline |
| AUTOMATIONS | nothing guards changes or advances work items unattended | `automations.md` — prevention vs autonomous execution, substrate resolution, the state model, triggers, runtime, loud failure, proof · `automations-security.md` — trust boundary, least privilege, audience, the guardrail starter |

`references/configure/*.md` carries per-coding-agent formats, locations, and feature support; the `target agent` block routes to it.

Kinds compose. ACTIONS, ENVIRONMENT and AUTOMATIONS hand implementation to `coding-flow`. PROMPTING authors text and scripts inline — step 7 says so explicitly, because that flow's reviewer and validator phases duplicate the harden and prove steps the prompting assets already own. An automation's router prompt is itself authored through the PROMPTING assets.

## Mental hooks & unexpected rules

Actions and environment:

- `"Definition of done PLUS the means to prove it"` — the harness is both halves; a spec without an executable is half-delivered.
- `"One action = smallest MEANINGFUL business outcome, composed of several calls. Not an endpoint wrapper."` with the `create-order` worked example.
- `"Observed trace = fixture for later automated tests. Verbose output is the product, not debug noise."` — why verbose is default and `--quiet` the exception.
- `"Uncertain counts as unsafe until the user decides otherwise."` — triage defaults to caution, not convenience.
- `"No unsafe dependency reachable from inside — verify by attempting the call, not by reading config."` — proof by execution, never by inspection.

Prompting:

- `"A skill is a contract: when I run, what I read, what I do, what I refuse, what done means."` — the frame; blocks are grouped by clause, not by topic.
- `"Anything carrying procedure, capability, knowledge, or scripts is a SKILL. Always."` with `"A SUBAGENT is a context placeholder holding a non-specialized proto-role"` — there is no skill-versus-subagent decision to make.
- `"Acting from memory is the default failure."` — tell it what it cannot know, make it observe what it would otherwise recall.
- `"Deterministic step → code. Prose re-derives it every session and drifts; code does not."`

Automations:

- `"Terminal state is never the input state."` — re-processing becomes structurally impossible rather than merely discouraged.
- `"The claim into the working state is the concurrency lock."` and nothing loads from a working state, so a crashed run parks visibly instead of looping.
- `"A flow whose only visible output is the end result has nothing to intervene in."` — the no-autopilot rule, stated as a structural property.
- `"Trigger is a doorbell."` — ignore the payload, load the whole state; dropped events strand nothing. Moving an item into an input state is the authorization.
- `"Overlap → exit early. Never cancel-in-progress; it strands claimed work mid-flight."`
- `"Guardrails must live outside the agent's write reach. Branch protection is the mitigation. The prompt asking nicely is not."`
- `"A silently unallowlisted tool disables the automation without failing it."` — shell-tokenized allowlists, verified empirically.
- `"'Internal' is not private."` — an internal repository is public to the whole organization, contractors included; the actor being internal or external changes nothing, only the damage does.
- `"The agent's own output is an attack surface."` — injected text in its comment reaches a human, or a downstream automation, and gets acted on there.

Across all four: `"Written but unexecuted = not delivered."`

## Invariants — do not change

- Frontmatter `name: harness` must equal the folder name and matches the registry entry in `docs/definitions/skills.md` (plain list, `- harness`).
- Frontmatter `description` is the ONLY surface visible before the skill loads — it carries every activation trigger and must stay short and keyword-dense. `SKILL.md` deliberately has no `<when_to_use_skill>` for that reason (same omission as `orchestration`); do not add one back as a trigger list.
- Asset filenames are referenced by exact path from `<process>` step 4; renaming any breaks the router.
- The `## Harness` section name in the target repo's `ARCHITECTURE.md` is written by `SKILL.md` step 9 alone. The assets deliberately carry no `<registration>` block — do not reintroduce one, it would fork the definition.
- Step 7's per-kind clauses are load-bearing: without the PROMPTING exemption and the AUTOMATIONS split (definition through the flow, router prompt through the prompting assets) the router contradicts itself for two of its four kinds.
- Redaction-by-default plus `sensitive-data`-gated `--show-secrets`, and the local/isolated default with an HITL gate for shared environments, are user-approved decisions, not defaults to relax.
- The `<starter>` block in `automations-security.md` is a runtime artifact copied into a target repo's router prompt, not instructions this skill's executor follows. Only the alert channel and forge command are meant to be adapted; the threat list, the no-exemption-for-framing rule, and the non-public-findings section are not.
- `references/configure/*.md` are a verbatim copy of the plugin-root `configure/` folder, reached with `APPLY SKILL FILE`, never the `READ CONFIGURE` alias. The root folder still ships and still has its alias; retiring both is follow-up work. While both exist, edits must land in the plugin-root copy and be re-copied here — never diverge.
- `RECOMMEND USE SKILL harness` pointers in `testing/SKILL.md` and `coding/SKILL.md` are this skill's inbound couplings; renaming it needs matching edits there.
- Alias grammar follows `docs/schemas/skill.md`: `APPLY SKILL FILE` for this skill's own assets and references (never carries a skill name), `USE SKILL` for siblings, `USE FLOW <name>.md` for the workflow.

## Editing guide

Safe to change: wording inside `<core_concepts>`, `<pitfalls>`, and the asset bodies, as long as the action-granularity rule, the output contract, the safe/unsafe criteria, the containment list, the five-clause frame, the container rules, and the state-model invariants survive. Handle with care: the nine `<process>` steps (the HITL gate at 6 and the proof at 8 are why the skill works), the asset paths, and the `## Harness` section name.

Routing for new content: the callable surface → `cli-mcp-scripts.md`; running the system locally → `devcontainers.md`; what a skill or subagent is assembled from → `prompting.md`; how its lines are written → `prompting-writing.md`; how it is executed and asserted → `prompting-proof.md`; unattended work and its state model → `automations.md`; anything about trust, privilege, or disclosure → `automations-security.md`; per-coding-agent specifics → `references/configure/`. A genuinely new harness kind belongs in a new asset plus one classification branch in step 1 — never inlined into `SKILL.md`.

The assets are held to the rules the prompting ones teach: layered lines, no meta-explanation, nothing a competent model already knows. An edit that adds a "why this section exists" paragraph fails `prompting-writing.md`'s own `<cut>` list. Adding blocks to the prompting palette is the common temptation and usually wrong — the palette is picked from, not enumerated. The same applies to the automations asset: it teaches the decisions and the invariants, and hardcodes no state names, no tracker, and no substrate.

Precedent worth reading before editing: `src/rosetta-mcp-server/validation/verify_mcp.py` for the service kinds; `tests/e2e-tests/*` and `docs/manual-tests/*.md` for PROMPTING; and for AUTOMATIONS this repo's own working implementation — `docs/AUTOMATION-ARCHITECTURE.md`, `.github/workflows/repo-{triage,analysis,plan,implement}.yml`, the router prompts in `.github/prompts/`, and `.github/scripts/{check_trace,scrub_trace}.py`. That implementation is where the state-model invariants were measured; it is one project's answers, not the shape the asset prescribes.
