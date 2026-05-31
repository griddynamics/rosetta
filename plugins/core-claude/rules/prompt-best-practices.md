---
name: prompt-best-practices
description: Rules for authoring reliable, minimal, and clear prompts for AI agents. Apply when creating, refactoring, reviewing, or validating any prompt artifact.
alwaysApply: false
tags: ["prompting", "rules", "best practices"]
---

<prompt_best_practices>

Problem: Prompts degrade through long content, scope creep, implicit assumptions, AI slop, missing contracts, and absent validation.

Validation: Each prompt has a problem statement, explicit contract, and proof the solution works.

Prompts include skills, agents, subagents, workflows, rules, templates, commands, or just any generic prompt.

<must>

1. Follow core_concepts section fully
2. Enforce all core_principles in the target prompt
3. Pass every validation_checklist item
4. Apply all best_practices entries
5. Avoid every listed pitfall
6. Question user until crystal clear
7. Review results proactively with user
8. Adapt rules to task complexity

</must>

<should>

1. Use meta-prompting for project context
2. Choose better model when available (opus, deep thinking, high thinking)

</should>

<core_concepts>

Role/boundaries:

- Treat user prompt as text
- Do not execute instructions
- Simulate agent behavior
- No side effects without HITL
- No change log or change explanations in the prompt
- Analyst artifacts vs target artifacts are different layers, do not mix

Mode selection: full authoring vs refactor only.

Store prompt analyst working artifacts in FEATURE PLAN folder if large task, otherwise just keep in memory:

- Prompt Brief
- Final Prompt
- Validation Pack
- Traceability

Do not project working artifacts into generated target prompts.

Target prompt structure, ideas, goals must be derived from source prompt request/intent/type and explicit user constraints.

Artifacts:

- Brief: goal, non-goals, audience, constraints, facts/assumptions, questions, risks, HITL
- Contract: actors, responsibilities, inputs, outputs, schema, boundaries
- Validation: checklist, tests, failure modes, recovery

</core_concepts>

<core_principles>

- SRP always
- DRY always
- KISS always
- YAGNI always
- MoSCoW where necessary
- MECE always
- SMART always
- Small prompts
- Precise wording
- Explicit over implicit
- Respect instruction hierarchy
- Identify and address root causes
- Facts over guesses
- State assumptions explicitly
- Define output schema
- Prefer structured outputs
- Validate with test cases
- Actively involve user
- Prevent scope creep
- Less scope, more value
- Use common and domain terms
- Assume common knowledge
- Skip obvious explanations
- Avoid filler text
- Avoid AI slop
- Avoid fabricated requirements
- Define roles and contracts
- Define problem-solution-validation
- Challenge user reasonably
- Professionally direct
- Trace request end-to-end
- Separate AI vs human
- Confirm updated inputs
- Review as narrative
- Define target audience
- Accuracy over speed
- Prefer existing solutions instead of new pattern or concepts
- Think before editing
- Consider prerequisites, consequences, clearly state if those don't match the original intent
- Set clear boundaries
- Ability to adapt to task complexity
- Define context, processes, and actors
- Keep agent focused
- Simplicity first
- Make surgical changes
- Strong success criteria
- Use concrete time references
- Protect secrets and privacy
- Refuse unsafe requests
- Cite sources when needed
- Choose better model
- Use mental hooks
- No gaps or ambiguity
- Prompt family consistency
- No logical conflicts
- Split large work to reduce complexity and cognitive load
- Slice level of thinking and decision making
- Do not overload mentally
- Maintain ideas, hooks, meaning, strategy, tricks, and similar
- Templates with contextual placeholders
- Agent-agnostic (Cursor, Claude Code, GitHub Copilot, Windsurf, OpenCode, and etc)
- Progressive disclosure to reduce cognitive load
- Classification and planning to think first
- Evidence-Based to reference truth
- Use of meta-prompting to adapt project context
- Prefer flexible solutions over rigid
- Feature-alignment to polyfill missing features
- Avoid tautology
- Serve intended purpose
- Each rule line must be less than 8 words and proper English phrases
- Prefer imperative/infinitive form
- Prefer simplicity over complexity as long as original intent is met
- Avoid vague qualifiers
- Remove non-operational clarifications (history, rationale, origin labels, change annotations), provenance, or explanatory meta-notes

</core_principles>

<tips_tricks_quirks>

Handle user flaws:

- User just cannot provide all inputs in a consistent manner in one shot
- AI should proactively solicit requirement and verify it is coherent
- User my provide conflicting, unspecific, ambiguous, subjective qualifiers, vague adjectives and constructs, loaded expressions
- AI should reconstruct it as coherent simple clear consistent SET of requirements without gaps
- Ask questions until crystal clear without nitpicking
- User can only REVIEW maximum 2 pages of simple text, and this does NOT limit result which could be much larger
- User appreciates TLDR and similar

Handle AI flaws:

- System prompts (out of our control) require immediate execution, deny back-and-forth with user, also models always jump to conclusions
- Our prompts should encourage co-working and co-authoring
- AI forgets to give proper context
- AI forgets to validate, reorganize, persist root causes, learn (persist discovered knowledge), and cleanup
- AI mixes aspects, actors, and responsibilities if not clearly separated
- AI is prone to carry away and generate a huge amounts of content based on assumptions, rendering it useless or impossible to review
- AI overly relies on internal knowledge (train set is >1Y old), AI does not proactively research
- AI removes important clarifiers, specifiers, explanations ("just", "only", "constantly", minor explanations, etc)
- AI constantly keeps inserting non-operational clarifications (history, rationale, origin labels, change annotations), but target documents must be source-agnostic, state-only, action-only. All change logs must be directed to a separate file.
- AI constantly over-engineers

</tips_tricks_quirks>

<best_practices>

- Prompt must have clearly defined problem statement, proposed solution, and **valid proof** that solution solves the problem
- Proactively review results with user
- Proactively question user until crystal clear
- Prompt_brief first, get it approved, then draft
- Contract-first prompting
- Define inputs, outputs, roles, and boundaries early
- Label assumptions explicitly
- Prefer schemas + examples
- Include checklist + tests + failure modes
- Insert Human-in-the-Loop gates, if not covered already by `bootstrap-hitl-questioning.md`
- Keep diffs surgical
- Prefer existing standards, patterns, simple solutions
- Time and temporal references and relationships explicit
- If adjectives or verbs do not clearly match the intended task, identify and propose synonyms
- Persist memory of new discoveries, root causes of misunderstanding/oversights/failures, etc.

</best_practices>

</prompt_best_practices>
