# Modernization or Migration using AI

## Key Principles

1. Workspace structure is critical. Composite with submodules is highly recommended, fallback to refsrc. See [configuration guide](../CONFIGURATION.md).
2. Modernization/migration principles and decisions documented in context in a CONCISE manner.
3. Modernization/migration scope, pattern mapping, technical archetype mapping, component mapping is the most important.
4. Leaf-based code-to-code migration is fast and reliable, allows to refactor then in-place with working solution.
5. Integration, E2E, side-by-side, screenshots are the spine for automated migration.
6. Requirements matter, but as a part of a final checklist.
7. Maintain the same naming, attributes, actions, models, but according to target for easy matching (examples: MyComponent -> my-component / my_component / getMyComponent). Any change must be earned.
8. Must use Fable/Sol-XHigh/Opus-XHigh for initial documentation and planning.
9. No new changes during migration. Any improvements are added later on once migration succeeds.
10. Found issues, fixes, improvements. All after migration is confirmed.
11. Use `coding-flow` for actual migration/modernization.

## Red Flags

1. Mocking. Must only be used for unit testing and nothing else. All services must work and run locally.
2. Migrating big features. Must migrate leafs first.
3. Requirements-first. AI will deviate. Migrate code first, then improve migrated code. Requirements are validation gates.
4. Planning for humans. Must use AI to build a graph of a plan for AI agentic sessions (sequential, parallel, etc), including specialized WHAT and CHECKLIST in each session.

## Process

1. Initialize source repositories
2. Improve business and architecture contexts
3. Define migration document (what this repo has) in source repository, extract inventory for migration, must reference that file in CONTEXT/ARCHITECTURE/AGENTS.
4. Initialize target repositories
5. Improve business and architecture contexts
6. Define the main migration document, include source migration document, must reference that file in CONTEXT/ARCHITECTURE/AGENTS.

## Start Prompt Templates

### Prompt 0: Setting up the stage (a rule or common prompt)

```md
Scope & intent:

- Rewrite ≠ redesign. Port behavior; change only the implementation.
- "No new features" means no behavior change — not fewer files. Migrating more files, routes, or dead stubs is faithfulness, not scope creep.
- Port defects as-is; log them separately. A known bug reproduced MUST BE CALLED OUT; a bug silently fixed is an unapproved behavior change. Bug not called out is a failure.
- Name every deliberate deviation explicitly. Anything not named is an accident.
- One stack substitution at a time, each explicitly approved. Framework defaults (fonts, icons, boilerplate) are silent substitutions — strip them.
- Always use checklists with fresh-eye subagent validator; Use in each session and for the bigger blocks. Wide, not deep. Checkpoints, not tasks. Limited by severity (all medium+) not by count.

Identity & reviewability:

- Keep names 1:1: components, similar files, functions, params, fields, routes, CSS classes, ids. Adapt only the naming convention.
- Same inputs, outputs, param order, shapes. No renaming, merging, splitting, or "while I'm here" improvements.
- Target: easier migration and mapping old vs new

Tests as the gate:

- Tests judge the code. Red test → fix the code, not the test. Only harness/selector/import/URL edits are legitimate.
- Audit the legacy suite before trusting it — generator stubs pin nothing and give false confidence.
- Author the golden master against the running original, before porting starts. Green-against-legacy defines truth.
- Run the same spec set against both apps. Divergent suites destroy the gate.
- Output fidelity (DOM/API shape) is a testability requirement, not just aesthetics — it's what lets one suite serve both.

Side-by-side is the final gate:

- Running side-by-side and evaluating behavior old-vs-new is critical final gate
- Taking and comparing screenshots for frontend and mobile to detect discrepancies

Sequencing:

- Leaf-first, dependency-resolved: port a unit only when all its dependencies already exist. No stubbing, no forward references.
- Shared code (types, data access, shell) first.
- Small sessions — one or a few units. Never big-bang.
- App-wide/global behaviors land last and alone; early they break everything else's tests.
- Preserve legacy asymmetries deliberately. Inconsistency you "clean up" is behavior you changed.
- Keep inventory list current and updated.

Documentation discipline:

- Separate the contract to preserve from the plan to build it from the current state. Never let planned work read as landed.
- Prescriptive "patterns" for code that doesn't exist yet are speculation — they drift, contradict, and mislead. Delete them.
- One authority per fact. Two documents describing the same decision will disagree.
- Archetype-level mapping (framework concept → framework concept) beats file-level inventory; the audience already knows both frameworks.
- Terse each item and exhaustive overall. No fluff. Every extra line is a line that can go stale.

Working with AI agents:

- Framework-idiom pull is strong: agents drift toward "better" over "same" even with explicit instruction. One correction pass is rarely enough.
- Delegation amplifies over-production — each agent expands within its slice and nobody prunes. Budget for a trim pass.
- Verify claims against artifacts, not reports. "Done" from a subagent is a hypothesis.
- Record hard-won environment facts (install constraints, toolchain quirks) where the next session will read them.

De-risking:

- Boot the legacy app early. Docs-only parity claims are assumptions; one run converts several into facts.
- Identify what gates everything else and attack it first.
- Verify visual/behavioral fidelity by comparison, not by value-matching config.
```

### Prompt 1: Establish the modernization mandate & principles

```md
Author the governing principles for a replatforming project into <architecture doc>. This is the contract section — the rules every later session inherits. Do not write the archetype mapping or the port checklist; separate prompts own those.

Read first: <legacy source root>, any existing analysis of it, and the current <architecture doc> if present.

Produce, terse, at the top of the document:

1. Mandate. State the rewrite/redesign boundary in one paragraph. If the user's intent is faithful preservation, say so in their words — quote them if they stated it, because paraphrase drifts. Make explicit that migrating more files/routes/dead artifacts is faithfulness, not scope creep, while changing behavior is a violation.
2. Identity rule. Which names and signatures must survive the port: components, files, functions, params, data fields, routes, CSS classes/ids. State what may adapt (naming convention only) with one worked example. State the goal: a reviewer can diff each new file against its legacy counterpart side by side.
3. Defect policy. Where known defects get recorded, and that they are ported as-is rather than fixed. Name the specific defects you found, each with its legacy source, so nobody "fixes" them by reflex.
4. Approved deviations. Every deliberate difference from the original, each traceable to an explicit decision — stack substitutions, URL/contract changes, dropped subsystems. Anything not listed here is an accident, not a decision.
5. Preserved asymmetries. Legacy inconsistencies that must NOT be unified. These are the highest-risk items: they look like bugs and invite cleanup.
6. Out of scope. Subsystems that exist in the legacy code but have no consumer or were abandoned, with the evidence.
7. Current state. One line. Never let planned work read as landed.
8. Subagents. One small subset (few files), migrated, ONLY then another small subset (few files). Context control. Hallucination control. MUST NEVER read ALL original files at once.
9. Delay, Latency, Timeout. Keep very low 2s - 5s timeouts and delays. Fail early instead of waiting for 30 secs each time.

Rules: cite evidence as repo-relative paths. Do not duplicate file inventory, versions, or port steps — cross-reference them. Assume a competent reader who knows both technologies. If you find a contradiction with an existing doc, report it rather than authoring a second version of the same fact — one authority per fact.

Report: which principles rest on assumption vs. verified evidence, and any decision that needs the user rather than you.
```

### Prompt 2: Author the archetype mapping

```md
Author <migration doc> — a type/archetype-level mapping from <source framework> to <target framework>. Not a file inventory; that lives in <code map doc>.

Read first: <legacy source root> (verify against source, not summaries), <architecture doc> for the mandate and identity rule.

Produce, as tables:

1. Framework building blocks. Enumerate the source framework's own vocabulary — every archetype it names — and give each its target equivalent. Work from the framework's concept list, not from what this app happens to use, so the mapping stays reusable. Include lifecycle hooks individually. Where an archetype has no target equivalent, say it dissolves and into what.
2. Architectural layers. The source's layering (e.g. MVC/MVVM roles) against the target's. Call out explicitly where two source layers collapse into one target artifact — that's the biggest structural shift and the thing most often gotten wrong.
3. State management. Reactive primitives, DI/singletons, computed values, per-screen state. State plainly if no global store is warranted, and why.
4. Data/API layer. What exists on each side. If there is no backend, say so — absence is information.
5. Design system. Source design-system archetypes → target archetypes: variables/tokens, utilities, grid, breakpoints, component classes → variant props, wrapper components → primitives, JS plugin behavior, theming. Note which assets stay unchanged.
6. Testing. Each source harness type → its target equivalent, including assertion libraries and runners.
7. Identity rule table. Legacy artifact → target artifact → the rule, with worked examples covering files, component invocation, functions, constants, data fields, route segments, and selectors.

Rules: terse — the reader knows both frameworks; define the mapping, don't teach it. Verify legacy claims by reading source. Every row earns its place; delete rows that state the obvious. Do not restate the mandate — reference it.

Report: archetypes with no clean target equivalent, and where a faithful mapping conflicts with target idiom.
```

### Prompt 3: Define the test strategy & acceptance gate

```md
Add a test strategy section to <migration doc>, and reflect it in <architecture doc>'s testing section. This defines how the port is proven correct.

Read first: the legacy test suite — read it, don't assume it's useful. Count files, lines, and real assertions.

Produce:

1. Gate principle. Tests judge the code: a red ported test means fix the code, not the test. Enumerate the only legitimate test edits (harness, selector syntax, imports, URL shape). Forbid relaxing assertions to reach green.
2. Legacy suite audit — do this before designing anything else. Report what the existing tests actually pin. If they are generator stubs or existence checks, say so with the numbers and conclude plainly that porting them is near-worthless as a gate. This finding determines the whole strategy; don't skip to design.
3. Golden master. If the legacy suite is inadequate, the gate must be authored against the running original and green there before porting begins. Specify: what to cover (user-visible journeys end to end, including behavior that looks like a bug), and that green-against-legacy is the definition of truth — assert odd behavior, don't tidy it.
4. Dual-target harness. How one spec set runs unchanged against both systems: per-target servers, and an indirection helper for any approved contract difference (e.g. URL shape). Name that difference as the only permitted divergence in the suite. Forking the suite destroys the gate.
5. Output fidelity as a test requirement. Because one suite serves both, the rendered output (DOM/response shape) must stay close to the original — structure, selectors, ordering, text. Connect this to the identity rule: this is why selectors are preserved. Add the corollary about not restructuring markup to suit the new design system's preferred composition.
6. Authoring location & SCM. If tests are authored inside read-only reference material, state the carve-out explicitly: test files writable, application code untouched. Check the ignore rules — an acceptance gate that lands untracked is not a gate. Flag needed changes.
7. Sequencing. Gate-building as a distinct phase preceding all porting, then the per-session loop.
8. Side-by-side and screenshots. Must use side-by-side execution plus screenshots for final validation - once everything else works and passes.

Rules: terse. Ground every claim about the legacy suite in what you read. Do not restate the archetype mapping.

Report: whether the legacy suite is usable as-is, what blocks running the original, and any coverage you cannot achieve.
```

### Prompt 4: Generate migration/modernization session plans

```md
You are producing a graph of session plan files for an incremental modernization project. Each file will later be executed by a coding agent (a capable LLM with discovery, design, implementation, review, and verification skills of its own).

Inputs you must read first

- <architecture doc> — target-state architecture and the port checklist
- <migration doc> — archetype mapping, identity rules, test strategy
- <open issues doc> — known blockers and deferred defects
- <legacy source root> — the system being replaced

Output

- plans/plan.md — index/tracker
- plans/<NN>-plan-<slug>.md — one file per session, numbered in dependency order

Hard rules for session files:

1. State only WHAT to do and final CHECKLIST. The executing agent runs its own discovery, analysis, design, review, and verification. Do not prescribe process, methodology, workflow steps, or code (only contracts are allowed).
2. Assume high competence. The reader knows both the source and target technologies well. Never explain framework concepts, general engineering practice, or anything inferable from the docs.
3. Do not restate the docs. Reference them by path. Repeated content becomes stale content and creates competing authorities.
4. Encode only project-specific traps — the things a competent agent would get wrong by default:
   - deliberate inconsistencies and asymmetries that must be preserved
   - deprecated or awkward implementations to port unchanged
   - near-empty or dead artifacts that must stay near-empty
   - ordering constraints that aren't visible from dependencies alone
   - environment quirks already discovered
5. Very Terse. Target 20–30 lines for WHAT, 40-50 lines for CHECKLIST.
6. Structure: # NN — Title, optional Depends on:, ## Do (numbered), ## Subagents (name + responsibility + long-running or short-term), optional ## Rules or ## Notes (only for traps), ## Done when (observable, verifiable outcomes — not "works correctly"), ## Checklist (examples showing aspects: `[ ] Unit tests coverage > 85%`, `[ ] PCI compliance`, `[ ] Integration tests coverage > 85%`, `[ ] Edge cases tested`, `[ ] Work protocol adhered`, `[ ] Documents updated`, `[ ] Code ran locally and manually tested by AI`, `[ ] DevOps implemented`, `[ ] SRE covered`, `[ ] Security checked`, etc).

Decomposition

- Order by dependency: a unit is portable only when everything it needs already exists in the target.
- Shared foundations first (types, data access, shell/layout).
- Leaf-first: leaves → composites → pages/screens → wiring → global behaviors.
- Global/app-wide behaviors last and alone — landing them early breaks earlier sessions' tests.
- One or a few units per session. Never big-bang.
- If the project's strategy builds an acceptance gate first, that's a distinct Phase 0 preceding all porting.
- Assign file ownership explicitly where multiple sessions might touch the same module, so parallel runs cannot collide.

Index file (plan.md) must contain

- The read-first document list
- The governing rules, one line each, with a pointer to their authority
- Where outcomes/findings/decisions get recorded
- File-ownership assignments that prevent collisions
- A table per phase: # | Session | Depends on | Parallel with
- Explicit note that unlisted pairs are sequential, and that parallelism is valid only because the sessions share no files
- Any session that must run alone, flagged as such

Before finishing

- State which sessions are genuinely parallelizable and why, and name any latent collision you resolved via ownership assignment.
```
