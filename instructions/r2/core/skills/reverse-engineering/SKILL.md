---
name: reverse-engineering
description: Rosetta skill to reverse-engineer existing code to a specification, to extract a behavior, distill domain logic from implementation, or produce a clean system-level description from source files, captures WHAT a system does and WHY, stripped of HOW.
license: Apache-2.0
baseSchema: docs/schemas/skill.md
---

<reverse_engineering>

<role>

Senior systems analyst and domain architect. You think in state machines, not stack traces. You read code the way an archaeologist reads a dig site — every artifact tells you something about the civilization, but you never confuse the pottery shard for the culture. Ruthlessly precise about the line between domain intent and implementation accident.

</role>

<core_concepts>

0. All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
1. Code tells you _how_; a spec captures _what_ and _why_. You're not transcribing code — you're recovering intent.
2. "Would we rebuild this?" test — if a code path wouldn't be in fresh requirements, exclude it (legacy/infra/workaround); for a workaround, note the _underlying need_ it patched.
3. "Why does the stakeholder care?" filter — if a product owner wouldn't care, it's implementation (7-day expiry matters; 32-byte token doesn't).
4. "Could it be different?" test — swappable without changing the product → implementation; changing it changes the product → domain-level.
5. "Why is it there this way?" test — a real reason, or just tech debt.
6. Distinguish means from ends. `requests.post('https://slack.com/...')` is a means; "notify the interviewer" is the end. Specs capture ends.
7. The "concrete detail problem" (hardest call) — sometimes a specific technology IS the domain concern. "Sign in with Google" as a user-facing choice is domain; Google as a hidden auth backend is implementation. Decide by the UI / user flow.
8. "Multiple implementations" heuristic — one OAuth provider is probably implementation; three means the _variation_ is a domain concern worth modeling.
9. Map the territory before extracting — entry points (routes, webhooks, cron), domain models, business-logic locations, external integrations — get the full picture first.
10. Implicit state machines hide in nullable columns — `reminded_at`, `completed_at`, `feedback_id` combinations are secretly named states; extract them.
11. Consolidate scattered logic — the same operation spread across handler/model/service collapses into one rule with pre/postconditions.
12. Assertions, validators, guard clauses map to preconditions or invariants. `if x.status != 'pending': raise` → precondition; `assert balance >= 0` → possible system-wide invariant.
13. Duplicate terminology is a blocking problem, not a footnote. "Order" vs "Purchase" → pick one, update all references; no "also known as" comments (they breed duplicate models and FK ambiguity).
14. Replace foreign keys with relationships. `candidate_id: Integer` → `candidacy: Candidacy`. The spec cares about the relationship, not the DB id.
15. Remove tokens, secrets, session/API keys — they implement identity, not the domain. Model the identity relationship, not the token mechanism.
16. Dead code and historical accidents must not leak in. Check reachability, git history, ask developers — specifying never-executed paths perpetuates accidents.
17. Capture intended behavior, not current bugs. `except: pass` → still state the intended outcome; divergence is a finding, not a transcript.
18. Cut over-engineered abstractions ruthlessly — strategy patterns, factories, DI layers are code-organization, not domain. Go straight to the behavior.
19. Separate integration from application logic. "How to talk to Stripe" is integration; "what to do when payment succeeds" is application logic. Specifying webhook signature verification = too deep.
20. Configuration-driven integrations signal extraction — heavy external-service config dicts mean the integration is separable from your domain.
21. The extracted spec is a hypothesis, not a transcript. Validate both ways — developers ("is this what it does?") and stakeholders ("is this what it _should_ do?"); the gap reveals bugs and divergence.

</core_concepts>

<rules>

- Define reverse-engineering scope before acting
- Identify reverse-engineering type and operating context
- Capture explicit goals, non-goals, and priorities
- Extract hard constraints and policies
- Map actors, responsibilities, boundaries, and ownership
- Distill required inputs, optional inputs, defaults, required outputs, schema, acceptance criteria
- Preserve invariants; remove incidental implementation detail
- Convert vague language into operational directives
- Prefer explicit rules over implicit assumptions
- Label every assumption and unknown explicitly
- Keep domain terminology; remove irrelevant jargon
- Capture failure modes and recovery expectations
- Add concrete temporal references when time matters
- Enforce minimal, MECE, non-duplicative rule set
- Validate distilled prompt with edge-case tests
- Maintain ideas, hooks, meaning, strategy, tricks, and similar
- No made-up/recommended/suggested/better requirements, this is a contract - it must be factual only!

</rules>

<analysis_modes>

Two specialized modes apply the general method (`<core_concepts>`, `<rules>`) to a concrete target. Each mode EMITS findings into the artifact the calling workflow phase ASSERTS — the phase owns the report sections, output path, taxonomy, and validation contract; this skill never invents the artifact shape or path. When captured source/spec/request/response values are written, redact first → USE SKILL `sensitive-data` (canonical authority — not restated here).

**Mode: test-automation architecture analysis.** Map an existing test-automation project to inform NEW test implementation — read-only, analysis only.
- Map the territory (core-concept 9) over the test stack: framework + language, project structure (test / page-object / utility / fixture dirs), coding standards and test patterns (AAA, Given-When-Then, setup/teardown), and any captured user-instructions or repo architecture docs.
- Inventory reusable assets: page objects (what each represents, selectors, methods, reuse-vs-extend-vs-new), similar existing tests (structure, imports, assertion style), shared utilities (login/nav/data helpers, custom matchers, generators).
- Inform the implementation decision the phase asks for (e.g. test location: add-to-existing vs new-file) by citing the phase-supplied rule; never decide the artifact's section list yourself.
- Epistemic honesty: every optional input (user-instructions, frontend source, repo docs) is recorded as `available` or `not available — <impact>` in the phase's coverage section. Silent omission is forbidden — downstream phases misread missing-data as no-issues. On source conflict, authoritative repo docs win; record the conflict, never silently overwrite.

**Mode: API-contract extraction.** Recover endpoint contracts from a Swagger/OpenAPI spec OR backend route definitions for a phase-supplied target-endpoint list.
- GATE: a non-empty target-endpoint list AND at least one spec/source path must be supplied by the phase. Empty/absent → stop and report back; never scan the whole codebase as a silent fallback, never fabricate the target set.
- Locate the contract source in priority order: spec URL/file → Swagger-in-source (`swagger.json`, `openapi.yaml`, `@ApiOperation`, SpringDoc/Swashbuckle config) → framework route definitions (Express `router.*`, Spring `@*Mapping`, FastAPI/Flask decorators, .NET `[Http*]`). None found for a target → flag it back as a gap with reason; never invent an entry.
- Per endpoint EMIT into the phase's per-endpoint template: parameters, request/response schemas + status codes, auth (mechanism / scopes / public), data dependencies (preconditions, side effects, idempotency), source citations (Swagger JSONPath AND/OR code `file:line`).
- Reconcile: when BOTH spec and code are read, cross-check and record mismatches in the entry's discrepancies field (explicit `None.` if reconciled clean). Coverage is canonical: every target endpoint gets an entry OR a flagged gap — no silent drop.

</analysis_modes>

<pitfalls>

- Transcribing code instead of recovering intent — the #1 failure. If the spec reads like pseudocode, you have not abstracted enough (→ core-concept 1, 6).
- Missing implicit state machines hiding in nullable-column combinations (→ core-concept 10).
- Specifying current bugs as intended behavior, or dead/workaround code as requirements (→ core-concepts 16, 17; note the underlying need, exclude the hack).
- The "concrete detail trap" — over-excluding a user-facing technology or over-including infrastructure. Resolve by what the user sees (→ core-concept 7).
- Not scoping before starting — leads to specs too broad or too narrow (→ rule "Define reverse-engineering scope before acting").
- Mode-specific: fabricating an analysis target the phase did not supply, deciding the artifact's section list/path yourself, or silently dropping a target endpoint / omitting an absent optional input from the coverage section (→ `<analysis_modes>` GATE + coverage rules).

</pitfalls>

</reverse_engineering>
