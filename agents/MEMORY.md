# AGENT MEMORY

Generalized reusable lessons from agent sessions.
Root causes converted into preventive rules, not incident-specific notes.
Entries are h3 headers with [ACTIVE|RETIRED] status.
Content: brief, grep-friendly, MECE across sections. Style: one-liner per entry, optional sub-bullets for context.

## Preventive Rules

### Fixing Someone's Artifact = Touch Only The Named Defect; Never Reword Their Notes Or Resolve Their Open Questions [ACTIVE]
When asked to "fix issues/inconsistencies" in a user's artifact (diagram, doc, code), change ONLY the specific defects and preserve the author's wording, decided content, and especially their "to think/discuss"/open-question notes — verbatim. Their notes and questions are never mine to resolve or rephrase. A vague "fix it" is NOT license to rewrite in my voice or auto-resolve open questions; when scope is unclear do the minimal literal fix or ask, and never use `replace_all` on a shared label without confirming blast radius. Root cause: on a broad "fix inconsistencies" directive I rewrote the user's "To think/discuss" note and rephrased several diagram cells in my own words, mangling an un-versioned artifact. Rule: edit the named defect only; leave authored prose, notes, and questions untouched.

### Answered Decisions And Style Edits Are Review, Not Approval To Implement [ACTIVE]
A user answering design questions, picking options, or giving wording/style edits is REVIEWING — it is not authorization to write artifacts. "Design resolved" and "approved to implement" are separate gates. Treat as approval ONLY an explicit approval sentence; anything else (questions, picks, edits, refinements) keeps status pre-approval. Before any create/edit/delete of artifacts, hold for explicit approval. Root cause: I collapsed AskUserQuestion answers + style feedback into a green light and edited a skill and the always-on bootstrap unapproved. Rule: never conflate the decision gate with the approval gate; on mismatch stop immediately and revert my own just-made unapproved writes.

### Never Convert A User's Rationale Into An AI-Side Decision Heuristic — HITL Gates Present, User Decides [ACTIVE]
When the user EXPLAINS why a capability exists (e.g. "code-graph navigation is only needed if code is large or for migration"), that is context for ME, not a condition for the AI to auto-evaluate and self-gate on. A HITL gate must surface the capability and let the USER choose ("we have this built in — your choice"), never silently decide for them. Also: the agent must NOT infer/search for environmental state it cannot reliably know (e.g. "is the code indexed?"). It may only report what is ALREADY present in the current context (registered LSPs, semantic-search/index MCP tools) WITHOUT going to look for it, and present that as information to inform the user's decision. Root cause: I turned the user's explanatory rationale into an `IF (not indexed) AND (large OR migration)` AI gating condition, removing the human decision the user explicitly requested as HITL. Rule: explanations ≠ auto-conditions; decisions that belong to the user stay HITL; never assert unknowable environment state.

### Docs State Facts/Guards Only — Never Narrate Reasoning Or Assert Unverified Tool Data-Flow [ACTIVE]
User-facing docs, install gates, and website state FACTS and GUARDS — never reasoning, never my own error-corrections, never unverified claims about what a third-party tool does with data ("sends your source to a third party" AND "runs locally" are both wrong moves: one is false, the other an unverifiable what-runs-where claim that creates liability if it changes). For a third-party tool the guard is liability-shaped and ownership-neutral: "Third-party tool will have access to IP. Review license and policy with your manager." — the manager/user reviews and agrees, not us. Non-MIT tools get a SECOND guard (the commercial-license fact, e.g. GitNexus free non-commercial / paid commercial). Root cause: I wrote "indexes your source code; your IP is exposed to a third party" (false — runs locally), then "runs locally" (unverified what-runs-where), and narrated my correction into the artifact. Rule: assert only verified facts; for third-party tools use the access-to-IP + review-with-manager guard instead of describing data flow; keep reasoning and mistake-corrections out of the document. Apply especially to public/website/init-gate docs.

### Read Every File You Cite; Don't Dress Up Native Agent Mechanics As Rosetta Design [ACTIVE]
Rosetta's always-INJECTED footprint = the named bootstrap rules (`bootstrap-core-policy`, `-execution-policy`, `-guardrails`, `-hitl-questioning`, `-rosetta-files`) + exactly one mode file (`bootstrap.md` MCP xor `plugin-files-mode.md` plugins/standalone) — per `pa-rosetta-intro-for-AI.md`. Everything else (skills/workflows/agents) loads ON DEMAND; the host agent surfaces skill name+description and auto-loads 1–2 skill bodies from those descriptions — that is NATIVE coding-agent behavior (Claude Code, Cursor, etc.), NOT a Rosetta-injected "channel," so never frame it as one. Guardrail chain: the always-on `bootstrap-guardrails` rule instructs loading the on-demand `hitl`/`sensitive-data`/etc. skills (`pa-rosetta.md:10`); shrinking that rule toward 0 shifts reliance onto native description auto-activation (= `skills-refactoring.md` W5). Process root cause: while reviewing `reduce-bootstrap.md` I (a) cited `pa-rosetta.md`/`pa-rosetta-intro-for-AI.md` as edit targets WITHOUT reading them, and (b) invented a "two always-on channels" insight out of basic agent mechanics. Always read every reference file before asserting about it; don't theorize platform behavior you already know.

### Story/Spec Authoring Means Doing The Analysis, Not Deferring It [ACTIVE]
When asked to author a task/story/spec for a refactor, the deliverable is the SOLUTION, not a task shell that defers every call to a future "analysis" phase. First mine canonical definitions (`docs/definitions/*.md`), prior art (`docs/stories/`, `docs/TODO.md`, `agents/MEMORY.md`, git log), and build a real usage map (grep `USE SKILL`/`ACQUIRE`) — then commit to concrete, evidence-cited verdicts (per-item table) with reasoned defaults marked overridable. Root-cause incident: produced a skills-refactoring story with generic multiple-choice "grilling" and "decide in analysis later" bullets, having skipped `docs/definitions/skills.md` (the source of truth) which revealed 12 off-list skills + 15 unbuilt + naming drift. Grilling must be earned from findings (e.g. "init-workspace-* are thin ACQUIRE+EXECUTE wrappers" or "guardrails are rule-invoked so descriptions are trimmable"), not asked blind.

### Verify Third-Party SDK Signatures Before Injecting kwargs Via A Wrapper [ACTIVE]
Confirm the real method signature of any third-party SDK method before injecting kwargs through a monkey-patch wrapper. SDK methods that do NOT declare a kwarg (e.g. RAGFlow `get/post/...` do not accept `timeout`) will raise `TypeError` at runtime when an injected kwarg is forwarded. mypy cannot catch this when the wrapper uses `**kwargs` passthrough. Always read the actual installed source (site-packages or refsrc) and quote the line — do not rely on docs or assumptions. If the kwarg is unsupported by the SDK method, inject it at the underlying transport layer instead (e.g. `requests.sessions.Session.request` for any requests-based SDK).

### Do Not Manufacture Approval Questions For Unrequested, Unchanged Details [ACTIVE]
Only surface decisions the user actually owns. Pre-existing behavior the user did not ask to change (e.g. existing `next` step flags resume/previously_blocked/previously_failed) must be left untouched and NOT raised as "needs your nod." Re-raising settled or out-of-scope items reads as churn and erodes trust. Before listing an item as open, check: did the user ask to change THIS? If no, leave it as-is and stay silent.

### Emitted Recommendations Are Directive — No Optionality/Internal Qualifiers [ACTIVE]
In emitted guidance/notes, state the recommended action directly ("call show_status with --target <id>"), never qualify it with optionality or internal mechanics ("optionally", "not required", "technically"). Whether a parameter is optional belongs in that parameter's own spec/args doc, not in a recommendation note. Adding the qualifier silently turns a recommendation into "you may skip this." Same root family as leaking author rationale into outputs: keep author-facing facts out of caller-facing directives.

### Answer "How Does The Caller Get X" With Caller-Visible Commands Only [ACTIVE]
When a user asks how a CALLER/USER obtains something from a command, answer only with caller-visible invocations, parameters, output fields, and a concrete example. Never cite internal code flags, variable names, or file internals — not part of the caller contract, only confuse. Read the implementation first to ground behavior, then translate to the caller's vocabulary. Root cause of a real incident: explained `plan next` retrieval using internal `resume`/`previously_*` flags instead of the caller-facing `next`→`show_status`→`query` flow, and re-derived behavior from a self-proposed option instead of the code.

### Prefer HTTPS Metadata Links Over `mailto:` Package URLs [ACTIVE]
Modern package validation can reject `mailto:` entries in `project.urls`; keep support links as HTTPS URLs and put raw email addresses in docs instead.

### Verify Nested Workflow Runtimes Before Closing CI Migrations [ACTIVE]
GitHub Actions runtime cleanup must inspect both local `uses:` refs and referenced reusable workflows, and confirm upstream `runs.using` values directly before marking the repo migrated.

### Use Override Inputs When Third-Party Actions Vendor Deprecated Tool Installers [ACTIVE]
If an upstream composite action exposes a path override for an internal runtime like Bun, preinstall the tool in-repo and pass the resolved executable instead of waiting on the vendor to refresh its bundled installer.

### Clear Live Auth Environment Triggers In Unit Test Fixtures [ACTIVE]
When env vars can trigger real authentication, add an autouse fixture that strips them so CI and local unit suites never reach shared services by accident.

### Approved Workaround Shape Wins Over Narrower Substitutions [ACTIVE]
When a user explicitly approves a concrete workaround implementation shape, execute that shape or ask before deviating; do not silently replace it with a “safer” variant.

### Wait For PyPI Visibility Before Publishing Dependent Packages [ACTIVE]
When one package pins a just-published sibling package version, gate the dependent publish on the upstream PyPI JSON endpoint returning 200 for that exact version instead of trusting workflow completion timing alone.

### Never Directly Edit Plugin Files — Always Edit Source Instructions [ACTIVE]
`plugins/` content is fully regenerated by `npx rosettify-plugins@latest` (via `scripts/pre_commit.py`); any direct edit is overwritten on the next sync. Edit `instructions/r{2,3}/core/...` first, then run the script.

### Complete ALL Prep Steps Before Any Action [ACTIVE]
Prep Step 2 requires reading both `CONTEXT.md` AND `ARCHITECTURE.md` in full before proceeding. Skipping either leads to wrong execution path (e.g., editing generated files instead of source files).

### NEVER Run git stash / stash pop Without Explicit User Permission [ACTIVE]
`git stash pop` on a pre-existing stash is irreversible and destroys in-progress user work. To check whether failures are pre-existing, read existing output or use `git diff HEAD` — never touch git state. Any git operation that modifies history, stash, or working tree is a dangerous action requiring explicit user approval first.

### Load And Execute The Matching Workflow BEFORE Any Implementation [ACTIVE]
Completing prep steps does NOT authorize immediate coding. The workflow (e.g., `coding-flow`) must be loaded and each phase executed in order: discovery → specs → plan → HITL approval → implementation → review → validation → HITL → tests → final validation. Skipping HITL gates and reviewer phases leads to incomplete or misaligned deliverables that the user must catch.
- Spec approval is NOT implementation approval. After implementation, reviewer + validator subagents (per phase 6/7/11 of `coding-flow`) must still run before the post-impl HITL gate, regardless of request size or how clear the change looks.
- Even SMALL tasks under coding-flow require the reviewer phase (applies=ALL); skip only the phases marked applies=MEDIUM,LARGE.

### Keep Generators Generic And Content-Agnostic [ACTIVE]
When building template-based generators, separate the generic replacement engine from content production. Hardcoding domain logic inside the replacer blocks reuse and extensibility.

### For Byte-Parity Rewrites, The Generator Owns Only The Placeholder — Decode The Wrapper From Preserved Templates [ACTIVE]
When re-implementing a template-driven generator to byte-for-byte parity, the largest parity hazard (complex hook/JSON/shell payloads) is usually NOT all generated: the WRAPPER (matchers, advisory blocks, `version`, array brackets) lives in the preserved `.tmpl` files; the generator produces ONLY the placeholder string (e.g. `{{{bootstrap_hooks_<ide>}}}`). Read the preserved templates first to draw the line between template-literal and generated, then build a unit oracle that decodes the EXPECTED placeholder value out of the baseline output and asserts your assembly equals it — before driving the full `diff`. This collapses a "reproduce a 44KB file" problem into "reproduce one joined string."

### Verify Error/Limit MEASUREMENT Units Against The Baseline's Actual Messages, Not Assumptions [ACTIVE]
A size/limit/validation check can pass the FILE diff yet mis-measure: the new generator flagged 5 false "bootstrap entry > 10000 chars" violations because it measured the whole IDE wrapper (~18k, bash+powershell) instead of the per-entry `additionalContext` (~8.9k). The truth came from RUNNING the old generator and reading its exact stderr (`additionalContext is 11104 chars (max 10000)`) — which also revealed the old gen genuinely exits 1 on r3 (so exit-1 was correct parity, not a deviation). When a soft-error/limit exists, run the reference tool, capture its real messages and exit code, and match the measured UNIT to them; never infer the unit from the requirement prose alone.

### Independently Re-Run Exit Code + Dry-Run + Parity After Every "Done" Claim — Files-Green Hides Side-Effects [ACTIVE]
A subagent reported "dry-run writes nothing" with a passing test, but an independent run wrote 12 files: only `pluginWrite` was no-op'd while `pluginCleanup`/`pluginCopy` still hit disk, and the test's fixture had no preserved files so it never exercised the path. Orchestrator verification must independently execute the actual scenario (count files on disk under `--dry-run`, check the process EXIT CODE not just the file diff, confirm `--verbose` adds lines) rather than trust a green report. For dry-run specifically: assert ZERO filesystem mutations against a tree that HAS preserved files, since seeding/cleanup are the side-effects most likely to leak.

### Implement The User's Stated Mechanism — Do Not Substitute Your Own Abstraction [ACTIVE]
When the user names the exact mechanism/wording (e.g. "condition the templates by `release`"), implement that literally. Do NOT swap in a "cleaner" abstraction (e.g. a capability flag) justified by an internal rule — that is silent reinterpretation and confuses the user, who then can't follow the explanation. If you believe a different shape is better, propose it explicitly and get approval; never assume. Root cause of a real session derailment: substituted `advisory_hooks` for the requested release condition, then explained in terms the user never asked for. (User later chose a semantic flag themselves — the lesson is who decides, not which shape.)

### Don't Surface Internal Implementation Findings To Non-Code Stakeholders [ACTIVE]
Reviewer/agent findings about internal mechanics (loop crashes, escaping nuances, "what a template contains") are your problem to fix silently. Keep user-facing communication about THEIR decisions and observable behavior, not code internals — unless a finding changes a user decision.

### Handlebars/pybars3: Triple-Stache For Raw JSON, Comma Inside The Conditional [ACTIVE]
`pybars3` (Python Handlebars, cross-language twin of `handlebars.js`) double-stache `{{x}}` HTML-escapes (`"`→`&quot;`) and corrupts JSON; use triple-stache `{{{x}}}` for raw injection. `{{#if}}` takes a single truthy value (no `==`); for comparisons register an `eq` helper (`{{#if (eq a "b")}}`). When gating a JSON object member with `{{#if}}` on its own line, put the separating comma INSIDE the block as a leading comma on the conditional member, else the non-conditional branch emits a trailing comma → invalid JSON. `scripts/` is excluded from `mypy.ini` `files`, so untyped third-party imports there don't break type validation.

### Verify Target Runtime Capabilities Before Generating Code That References Them [ACTIVE]
Always confirm that assumed env vars, APIs, or runtime features actually exist in the target platform before generating code that depends on them.

### Cross-Process Mutex Requires An Atomic-Create Primitive, Not Rename Or Hardlink [ACTIVE]
When implementing concurrent-writer safety for shared files, plain `fs.renameSync` (POSIX rename overwrites the destination) and `fs.linkSync` (atomic per-name but doesn't serialize the read-mutate-write window) both fail under real multi-process load. Verified by spawning N≥10 concurrent processes: rename lost ~10% of writes; hardlink lost ~10% at N=30. Use an atomic-create primitive (`fs.mkdirSync` on a `.lock` directory, or `O_CREAT|O_EXCL` file marker) to wrap the entire cycle, with a stale-lock timeout (~30 s) so crashed holders don't deadlock followers. Always validate concurrency-sensitive code with real spawned processes, not in-process async or mocked filesystems — single-process tests cannot reproduce cross-process races.

### Validate Concurrency Claims With Real Multi-Process Tests Before Shipping [ACTIVE]
Unit tests that mock filesystem races (vi.spyOn, in-process Promise.all) cannot catch cross-process write conflicts on real filesystems. When a requirement promises concurrent-write safety, the validation MUST include a multi-process test that spawns N independent OS processes against a single shared resource and asserts (a) no lost writes, (b) no corrupted state, (c) no leaked lock artifacts. The cost is one bash/node script and ~5 seconds of CI time; it catches an entire class of bugs that pass every other gate. Build this test before claiming the feature is done.

### Adding A Command Input Field Means Updating Every Layer, Including The Base Type [ACTIVE]
A new command parameter is not "wired" until it exists at EVERY layer: (1) the base input interface type (e.g. `CommandInput`) — omitting this is a silent typecheck failure caught only at compile, (2) the command's `inputSchema`, (3) the run-delegate destructuring + required/validation check, (4) the CLI frontend (positional/option), (5) the MCP/named-field surface, (6) help content (usage/args/required/examples). After adding the field, run `typecheck` immediately — a missing base-type field surfaces there, not in tests. Treat these six layers as a checklist for any new command input.

### E2E Tests Spawn The Built dist Binary — Rebuild Before Running Them After Source Edits [ACTIVE]
rosettify's e2e suites (`tests/e2e/*.e2e.test.ts`) `spawnSync` the compiled `dist/bin/rosettify.js`, while unit tests import `src/` directly (vitest transforms TS). So `npm test` can show unit tests reflecting your latest source while e2e tests silently run against a STALE dist — a behavior change in src that an existing e2e doesn't exercise passes, but a new e2e that does exercise it fails with confusing results. After any src change that an e2e asserts, run `npm run build` before `npm test` (the e2e `beforeAll` only checks the binary exists, not that it is current). General rule: when a test harness shells out to a build artifact, rebuild the artifact as part of the validation loop, not just at publish time.

### Per-Vocabulary Processors And Per-IDE Assemblers Are Preferred Over Central Switch Dispatchers [ACTIVE]
When a behavior differs by IDE or vocabulary (model normalization, hook entry shape), the correct design is a case-specific processor per case — not one processor that switches on an identity-discriminant field. Identity encoded as an enum (`ModelVocabulary.kind`, `hookEntryShape`) and switched on at runtime is identity relabeled: it reintroduces the target-coupling the data-driven design was meant to remove. The pattern: export shared low-level helpers from one module; create one thin per-case processor file per case; compose the matching processor into each spec. Never add a `kind`/`shape`/`strategy` enum to a spec type when you can instead compose a different processor.

### Plan Contradictions Must Go Back To The Original Author, Not Be Fixed By The Orchestrator [ACTIVE]
When a reviewer finds contradictions in plan steps authored by an architect subagent, the correct response is to route the finding back to the architect (re-spawn or send message) for resolution — not to have the orchestrator interpret or reconcile the contradiction. The orchestrator lacks the architect's context and will produce a silent reinterpretation. Contradictory step instructions must be clarified at the source before implementation begins, or an explicit decision from the user must be captured in the plan.

### Investigation Prompts Must Give Zero Hints — Let The Investigator Discover [ACTIVE]
When spawning an architect or reviewer for open-ended investigation (audit, diff review, smell detection), never state what you expect to find, which file to look at, or what the suspected issue is. The value of independent investigation is destroyed if you prime the investigator with the answer. Frame the task as: here is the authoritative source, here is the code, reason through everything and tell me what you find. If the investigator misses something, re-spawn with a broader mandate — never with a targeted hint.

### Model Maps Must Be Exhaustive Lookup Tables, Not Layered Transforms [ACTIVE]
Each model vocabulary (Claude, GPT, Gemini) for each IDE (Cursor, Copilot) must be a single exhaustive `Record<string, string>` covering every known token variant including effort suffixes (`-high`, `-medium`, `-low`) and bare IDs. No secondary upgrade maps, no inline effort-stripping logic, no passthrough for known model families. Unknown tokens may passthrough as a fallback. This keeps normalization readable, testable, and consistent across all vocabularies.

### Do Not Add Models Beyond The Authoritative Reference Scope [ACTIVE]
When building model maps, include only models that appear in the authoritative reference (Python generator) or are explicitly requested. Do not speculatively add older model families ("for backward compat") without being asked. The user sees every extra entry and will question it. When in doubt: ask, or leave it out.

### Verbatim Content SpecEntries Must Be Flagged To Skip Plugin-Level Processors [ACTIVE]
Any SpecEntry whose source content must be emitted verbatim (e.g. configure/*.md — IDE guide documentation) must carry a `verbatim: true` flag. Plugin-level processors that rewrite content (e.g. `pluginRewriteReferences`) must check this flag and skip verbatim frames. Without this, a global content-rewriting processor will apply its rename pairs to documentation strings it was never intended to touch (e.g. `.windsurf/workflows/` → `.windsurf/commands/`). The flag is a belt-and-suspenders guard; the primary fix is the regex boundary (see next rule).

### Dot-Directory Prefix Is The Boundary Between IDE-Native Paths And Plugin-Internal References [ACTIVE]
When a content-rewriting processor applies folder rename pairs (e.g. `workflows/ → commands/`), the boundary between paths that SHOULD be rewritten and paths that MUST NOT is the dot-directory prefix. Bare tokens like `workflows/coding-flow.md` are plugin-internal and must be rewritten. Tokens preceded by a vendor dot-directory segment (`.windsurf/`, `.cursor/`, `.github/`) are IDE-native filesystem documentation and must never be rewritten. Implement this via a negative lookbehind `(?<!\.[A-Za-z][A-Za-z0-9_-]*/)` ahead of the existing word-boundary guard. Do NOT solve this with a regex lookahead or an opt-out flag alone — those are bandaids that don't capture the structural rule.

### Requirement IDs And Internal Refs Belong In Code Comments Only, Never User-Facing Strings [ACTIVE]
Any `FR-`/`NFR-` identifier, internal path, or module name placed in a string that gets SERIALIZED or shown to a user — JSON-schema `description`, CLI argument help text, help-content fields, error messages — leaks internal traceability and violates the no-leak rule (FR-ARCH-0016); a serialized-help no-leak test enforces it. Keep all such identifiers in `//` or `/** */` comments. Before finishing any change that adds schema/arg/help/error strings, grep the diff for `\bN?FR-[A-Z]` inside quoted strings and move any hit into a comment.

## What Worked

### Inspecting Upstream `action.yml` With `gh api` Separates Repo Fixes From Upstream Limits [ACTIVE]
Querying the action metadata directly is a reliable way to prove whether a deprecation warning is fixable in-repo or still blocked by an upstream action publisher.

### Autouse Env Cleanup Fixtures Keep Tests Deterministic [ACTIVE]
Clearing auth-triggering env vars in test setup prevents flaky networked behavior and keeps unit tests scoped to local code paths.

## What Failed

### Top-Level Workflow Bumps Alone Do Not Guarantee Runtime Migration [ACTIVE]
Updating only the visible workflow file can leave hidden Node 20 actions in nested reusable workflows and create a false “migration complete” result.

### `mailto:` Values In `project.urls` Break Modern Packaging Validation [ACTIVE]
Using email links directly in package metadata can fail publish/install validation even when the project otherwise builds correctly.

## Hooks Runtime Abstraction — Baseline Notes (2026-04-29)

### adapter.ts Imports — Files Requiring Update When adapter.ts Is Split [ACTIVE]
Src: `loose-files.ts`, `md-file-advisory.ts`, `codemap-refresh.ts`. Tests: `adapter.*.test.ts` (×5), `loose-files.test.ts`, `md-file-advisory.test.ts`, `codemap-refresh.test.ts`. Entrypoints re-export via their own stubs and need no changes.

### hooks.json Is Generated From .tmpl By rosettify-plugins [ACTIVE]
`npx rosettify-plugins@latest` renders `hooks.json.tmpl` and writes the result to `.cursor/hooks.json`, `.codex/hooks.json`, etc. during pre-commit plugin-sync. Never edit generated hooks.json directly.

### Test Runner Is vitest [ACTIVE]
Canonical: `npx vitest run` (not `node --test`). All tests: `cd src/hooks && npm test`.

### Plugin Generator Source Is Release-Selected (Default r2) [ACTIVE]
`npx rosettify-plugins@latest` is release-aware: `--release` selects `instructions/<release>/core` and defaults to **r2**, matching ims-mcp's `DEFAULT_VERSION = "r2"`. r3 is opt-in via `--release r3`. To affect plugin output for a given release, edit that release's `instructions/<release>/core`; sync shared skills/workflows across `r2` and `r3` when they are meant to stay aligned.

### Hook Build Auto-Discovers All *.ts In src/hooks/src/hooks/ [ACTIVE]
`src/hooks/scripts/build-bundles.mjs` uses `readdirSync` — no explicit list. Adding a new `.ts` file is sufficient to include it in the build. The regression test (`hooks-registered.test.ts`) performs the same discovery and cross-checks `hooks.json` registration.

### Regression Test Requires All Discovered Hooks In ALL Plugin hooks.json [ACTIVE]
When scoping a hook to a single platform (e.g. claude-code only), add it to the `CLAUDE_CODE_ONLY_HOOKS` Set in `hooks-registered.test.ts` AND add a `isLibraryModule()` exclusion for any helper/data files (files ending in `-patterns`, `-evaluate`). Omitting either causes false regression failures.

### DANGEROUS_PATHS Patterns Are Basename-Matched — Caller Must Extract Basename [ACTIVE]
`DANGEROUS_PATHS` regexes (secret-env, ssh-private-key, netrc, etc.) are anchored with `^` and designed for basenames. The evaluation layer must extract basename from `file_path` before testing. Strip trailing slashes first: `filePath.replace(/\/+$/, '').split('/').pop()`. Full-path patterns (aws-credentials, kube-config) also exist in the same array — test against both full path and basename.

### ID Namespace Collisions Across Pattern Arrays [ACTIVE]
`DANGEROUS_BASH` and `DANGEROUS_CONTENT` may share conceptually similar patterns (both have DROP TABLE). Use namespaced IDs (`sql-drop-table` vs `content-sql-drop-table`) to avoid silent collisions when IDs are used in error messages or audit logs.

### Pre-commit Hook Runs Full Test Suite — Unrelated Failures Block Commits [ACTIVE]
`scripts/pre_commit.py` triggers `pnpm test` which includes the regression test. Any new hook source file instantly triggers a regression test failure for plugins that lack registration. Plan registration updates (hooks.json, CLAUDE_CODE_ONLY_HOOKS) in the same commit as the new hook source file, not a later commit.

## Discoveries

### Official GitHub Pages Setup And Deploy Actions Are Still Node 20 Upstream [ACTIVE]
As of 2026-03-18, `actions/configure-pages@v5` and `actions/deploy-pages@v4` still declare `runs.using: node20`, so those warnings are not removable by a repo-local version bump.
