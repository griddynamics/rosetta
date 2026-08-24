# harness
Turns "I wrote it" into "I ran it": designs the executable harness — callable actions and an isolated local environment — that lets a coding agent actually exercise the system it changed.

## Why it exists
Without it, an agent working in a target repo has no way to run or observe the service, so "done" silently degrades to "compiles and unit tests pass." Left to plain judgment a model will: wrap one command per API endpoint (pushing auth, sequencing and test-data conventions back into its own head every session), mock every external dependency because that feels safe, dump raw logs that flood context instead of a curated trace, point actions at whatever environment the config happens to name, and declare the harness delivered without ever executing it. This skill forces classify → discover → HITL-approve a specification → implement through `coding-flow` → prove by execution → record an inventory.

## When to engage
Model-invocable, no `disable-model-invocation`. Auto-activates on the description's keywords when a service must be run, observed, or validated and the means do not exist. Actor: orchestrator/top-agent (it gates with HITL and hands off to a workflow). Prereqs stated in `<core_concepts>`: Rosetta prep steps complete, `USE SKILL hitl`, `orchestration`, `load-project-context`. Scope is pre-PR local verification only — unit-test frameworks, CI pipelines, production tooling and load testing are explicitly out.

## How it works
`SKILL.md` is a router, not a builder. `<process>` runs nine steps: classify the gap into ACTIONS and/or ENVIRONMENT → discover existing assets from `ARCHITECTURE.md`/`TECHSTACK.md`/`DEPENDENCIES.md`/`CODEMAP.md` → propose placement in the repo's own conventions → `APPLY SKILL FILE assets/cli-mcp-scripts.md` (ACTIONS) and/or `assets/devcontainers.md` (ENVIRONMENT) → write the specification to FEATURE PLAN folder → HITL gate on it → `USE FLOW coding-flow.md` to build → prove by executing → write the `## Harness` inventory into the target repo's `ARCHITECTURE.md`. `assets/cli-mcp-scripts.md` covers delivery shape (CLI / MCP / scripts / dual), encapsulation, action granularity, the output contract, and the environment boundary. `assets/devcontainers.md` covers the runnable set, generated artifacts, safe/unsafe dependency triage, the six containment options, HITL gates, and cold-start proof.

## Mental hooks & unexpected rules
- `"Definition of done PLUS the means to prove it"` — the harness is both halves; a spec without an executable is half-delivered.
- `"One action = smallest MEANINGFUL business outcome, composed of several calls. Not an endpoint wrapper."` with the `create-order` worked example — the single most load-bearing design rule in the asset.
- `"Observed trace = fixture for later automated tests. Verbose output is the product, not debug noise."` — this is why verbose is the default and `--quiet` the exception; inverting it breaks the manual-verify → automated-test loop.
- `"Redact credentials, tokens, cookies, keys on EVERY output path. Default, not a flag."` paired with `--show-secrets` as opt-in gated by `sensitive-data`.
- `"Secrets passed as CLI arguments — they land in shell history and process listings."` — non-obvious leak path, listed as a pitfall.
- `"Uncertain counts as unsafe until the user decides otherwise."` — the triage defaults to caution rather than to convenience.
- `"No unsafe dependency reachable from inside — verify by attempting the call, not by reading config."` — proof by execution, not by inspection.
- `"Written but unexecuted = not delivered."` — the acceptance rule the whole skill exists to enforce.
- Containment options are ordered cheapest→most faithful and are `"presented as options... the user chooses"` — the skill never picks containment silently.
- `"Each action: its own command AND its own file"` — file granularity is part of the contract, not a style preference.

## Invariants — do not change
- Frontmatter `name: harness` must equal the folder name and matches the registry entry in `docs/definitions/skills.md` (plain list, `- harness`).
- Frontmatter `description` is the ONLY surface visible before the skill loads — it carries every activation trigger and must stay short and keyword-dense. `SKILL.md` deliberately has no `<when_to_use_skill>` section for that reason (same omission as `orchestration`); do not add one back as a trigger list.
- Asset filenames `assets/cli-mcp-scripts.md` and `assets/devcontainers.md` are referenced by exact path from `<process>` step 4; renaming either breaks the router.
- The `## Harness` section name in the target repo's `ARCHITECTURE.md` is written by three files (`SKILL.md` step 9, both assets' `<registration>`) — keep them identical.
- `USE FLOW coding-flow.md` in step 7 is the implementation handoff, fed by the specification written to FEATURE PLAN folder in step 5; this skill specifies and gates, it does not build. Replacing the flow with a plain `USE SKILL coding` drops the reviewer, HITL, and validation phases that make the harness trustworthy.
- Redaction-by-default plus `sensitive-data`-gated `--show-secrets`, and the local/isolated default with an HITL gate for shared environments, are user-approved decisions, not defaults to relax.
- `RECOMMEND USE SKILL \`harness\`` pointers in `testing/SKILL.md` (`<core_concepts>` Infrastructure) and `coding/SKILL.md` (`<core_concepts>`) replaced the older free-floating "CLI testing harness for libraries/packages" phrasing — they are this skill's inbound couplings; renaming it needs matching edits there.
- Alias grammar follows `docs/schemas/skill.md`: `APPLY SKILL FILE` for this skill's own assets (never carries a skill name), `USE SKILL` for siblings, `USE FLOW <name>.md` for the workflow.

## Editing guide
Safe to change: wording inside `<core_concepts>`, `<pitfalls>`, and the asset bodies, as long as the action-granularity rule, the output contract, the safe/unsafe criteria, and the containment list survive. Handle with care: the nine `<process>` steps (the HITL gate at 6 and the proof at 8 are the reason the skill works), the asset paths, and the `## Harness` section name. New guidance about the callable surface belongs in `cli-mcp-scripts.md`; new guidance about running the system locally belongs in `devcontainers.md`; a genuinely new harness kind belongs in a new `assets/*.md` plus one classification branch in step 1 — never inlined into `SKILL.md`. The folder is designed to grow more assets. Precedent worth reading before editing: `src/rosetta-mcp-server/validation/verify_mcp.py` in this repo — a real host that installs and exercises the MCP server exactly as an IDE would.
