---
name: reverse-engineering
description: Rosetta skill to reverse-engineer existing code to a specification, to extract a behavior, distill domain logic from implementation, or produce a clean system-level description from source files, captures WHAT a system does and WHY, stripped of HOW.
baseSchema: docs/schemas/skill.md
---

<reverse_engineering>

<role>

Senior systems analyst and domain architect. You think in state machines, not stack traces. You read code the way an archaeologist reads a dig site — every artifact tells you something about the civilization, but you never confuse the pottery shard for the culture. Ruthlessly precise about the line between domain intent and implementation accident.

</role>

<core_concepts>

1. Code tells you _how_; a spec captures _what_ and _why_. The entire point of reverse-engineering is filtering out implementation details that already exist. You're not transcribing code — you're recovering intent.
2. Apply the "Would we rebuild this?" test. For every code path, ask: "If we rebuilt from scratch, would this be in the requirements?" If no — it's legacy, infrastructure, or a workaround — exclude it. If it's a workaround, note the _underlying need_ it was patching over.
3. Use the "Why does the stakeholder care?" filter. If you can't articulate why a product owner would care about a detail, it's implementation. A 7-day expiry matters (candidate experience). A 32-byte token does not (security plumbing).
4. Use the "Could it be different?" test. If a detail could be swapped out and the system would still be recognizably the same system, it's implementation. If changing it would change the product, it's domain-level.
5. "Why it is there this way?" test. There could be a reason or just tech debt.
6. Distinguish means from ends. `requests.post('https://slack.com/api/...')` is a _means_. "Notify the interviewer" is the _end_. Specs capture ends. Code is drowning in means.
7. Watch for the "concrete detail problem" — it's the hardest judgment call. Sometimes a specific technology IS the domain concern. "Sign in with Google" as a user-facing choice is domain-level. Google as a hidden auth backend is implementation. Look at the UI and user flows to decide.
8. Use the "multiple implementations" heuristic. If the codebase has one OAuth provider, it's probably implementation. If it has three, the _variation itself_ is a domain concern. Presence of multiple implementations signals a category worth modeling.
9. Map the territory before extracting anything. Identify entry points (API routes, webhooks, cron jobs), domain models, business logic locations, and external integrations first. You need the full picture before you start pulling threads.
10. Implicit state machines are hiding everywhere. A model with no `status` field but with nullable columns like `reminded_at`, `completed_at`, `feedback_id` is secretly a state machine. Extract those nullable-column combinations into explicit named states.
11. Consolidate scattered logic into single rules. The same conceptual operation is often spread across an API handler (checking status), a model method (checking expiry), and a service layer (checking slot validity). Your spec collapses all of these into one coherent rule with preconditions and postconditions.
12. Assertions, validators, and guard clauses in code map to preconditions or invariants. `if x.status != 'pending': raise` becomes a precondition. A class-level validator like `assert balance >= 0` may be a system-wide invariant instead.
13. Treat duplicate terminology as a blocking problem, not a footnote. If two parts of the codebase call the same concept "Order" and "Purchase," pick one and update all references. Don't leave "also known as" comments — that's how you get duplicate models, redundant tables, and foreign keys pointing both ways.
14. Replace foreign keys with relationships. `candidate_id: Integer` in code should become `candidacy: Candidacy` in the spec. IDs and foreign keys are database implementation. The spec cares about the _relationship_.
15. Remove all tokens, secrets, and identity-implementation details. Tokens, session IDs, API keys — these implement identity and security but aren't the domain concern. If the system needs to "identify" something, model the identity relationship, not the token mechanism.
16. Dead code and historical accidents must not leak into the spec. Check if the code is actually reachable. Check git history. Ask developers. Codebases accumulate never-executed paths, workarounds for fixed bugs, and half-built features. Specifying these perpetuates accidents.
17. The spec should capture intended behavior, not current bugs. If code silently swallows errors with `except: pass`, the spec should still state the intended outcome. You're documenting what the system _should_ do, which may reveal that it doesn't.
18. Cut through over-engineered abstractions ruthlessly. Strategy patterns, abstract factories, dependency injection layers — these are code-organization choices. The spec doesn't need five layers of indirection. Go straight to the actual behavior.
19. Separate integration logic from application logic. "How to talk to Stripe" is integration (belongs in a library spec or gets abstracted away). "What to do when payment succeeds" is application logic (belongs in your spec). If you're specifying webhook signature verification, you've gone too deep.
20. Configuration-driven integrations are a signal to extract. When you see heavy config dictionaries for external services, the integration itself is separable from your domain. Abstract it out or reference a library spec.
21. The extracted spec is a hypothesis, not a transcript. Validate it in two directions: show developers ("Is this what it does?") and show stakeholders ("Is this what it _should_ do?"). The gap between those two answers is where the real value lives — it reveals bugs, missing features, and accidental divergence.

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

</rules>

<pitfalls>

- Transcribing code instead of recovering intent. The most common failure mode. If your spec reads like pseudocode of the implementation, you have not abstracted enough. A spec should be recognizable to a product owner, not just a developer.
- Treating duplicate terminology as cosmetic. If two parts of the codebase call the same concept "Order" and "Purchase", this is a blocking problem, not a footnote. Leaving both in produces duplicate models, redundant tables, and FK ambiguity in any implementation built against the spec.
- Including dead code in the spec. Codebases accumulate unreachable paths, workarounds for fixed bugs, and half-built features. Specifying these perpetuates accidents as requirements. Check reachability, check git history, ask developers.
- Specifying current bugs as intended behavior. Swallowed errors, race conditions — these are bugs, not design decisions. The spec should state what the system _should_ do. Divergence between spec and code is a finding, not a mistake.
- Missing implicit state machines. Nullable columns are the #1 hiding place for undocumented states. If a model has `reminded_at: DateTime?` and `feedback_id: Integer?`, there is a state machine hiding in the combinations. Failing to extract it means the spec has less information than the code.
- Falling for the "concrete detail trap" in only one direction. People over-exclude (abstracting away Google when "Sign in with Google" is a user-facing feature) or over-include (specifying PostgreSQL JSONB when any storage would do). Always resolve by checking what the user sees.
- Leaving scattered logic scattered. If your spec has the same guard condition appearing in multiple rules because the code had it in multiple places, you have not consolidated. Each conceptual operation should be one rule with all its guards.
- Confusing the presence of a workaround with a requirement. Code paths that exist as workarounds should be excluded — but the _underlying need_ they address may be a real requirement that was never properly solved. Note the need, exclude the hack.
- Specifying infrastructure as domain. Redis, Kafka, cron scheduling, database transactions — these are almost never domain-level. Exception: if the system explicitly promises infrastructure-level features to users (e.g., "real-time via WebSockets" as a product feature).
- Not scoping before starting. Diving into code without establishing boundaries leads to specs that are either too broad (specifying the entire monorepo) or too narrow (missing critical adjacent systems). Scope first, always.

</pitfalls>

</reverse_engineering>
