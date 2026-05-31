<hardening>

Review according to core_principles_to_enforce_in_target_prompt.

Enforce that target prompt:

- Actively involves user
- Has User Involvement and HITL ONLY in `bootstrap-hitl-questioning.md` (to support full automation)
- Asks questions until crystal clear without nitpicking
- Use common and domain terms
- Defines target audience
- Challenges user reasonably
- Uses MoSCoW where necessary
- Maintains Workflow/Phase/Subagent/Skill/Rule boundaries
- Skills can't call skills, Phase can't call phases, Subagents can't call subagents, Workflows can, and Rules can.
- No lateral/sibling awareness, no reverse awareness, no cross-skill deep linking (exception: frontmatters, and keywords)
- Always check those prompts vs their schema (critical, as you must not break contract)
- If prompt is for rosetta itself (repo with target prompt is rosetta or RulesOfPower), ACQUIRE `coding-agents-prompt-authoring/references/pa-rosetta.md` FROM KB and validate prompt uses it

</hardening>

<core_principles_to_enforce_in_target_prompt>

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
- Active user involvement and HITL is only in `bootstrap-hitl-questioning.md`
- Prevent scope creep
- Less scope, more value
- Use common and domain terms
- Assume common knowledge
- Skip obvious explanations
- Avoid filler text
- Prevent AI slop
- Avoid fabricated requirements
- Define roles and contracts
- Define problem-solution-validation
- Challenge user reasonably
- Professionally direct
- Trace request end-to-end
- Clearly trace user input vs AI inferring
- Confirm updated inputs
- Review as narrative
- Define target audience
- Accuracy over speed
- Prefer existing patterns ONLY within current prompt family set (MUST NOT READ CROSS-FAMILY)
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
- Logical consistency within the prompt, its DIRECT dependencies
- No logical conflicts
- Split large work to reduce complexity and cognitive load
- Slice level of thinking and decision making
- Prompts do not overload mentally
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
- Target each rule line below 8 words
- If longer, split into progressive layers
- Prefer imperative/infinitive form
- Prefer simplicity over complexity as long as original intent is met
- Avoid vague qualifiers
- Remove non-operational clarifications (history, rationale, origin labels, change annotations), provenance, or explanatory meta-notes
- Prompt size target: <300 ideal, 300-500 acceptable
- If 500+, split by layers/phases using progressive disclosure

</core_principles_to_enforce_in_target_prompt>

<prompt_diagnostics>

# Five-Axis Audit

- Responsibility — how many jobs is this prompt doing? (healthy: 1–2)
- Surface area — how large is the cognitive search space? (healthy: 1–2 pages)
- Priority conflict — where do instructions contradict? (healthy: explicit hierarchy, no soft rules)
- Failure mode — which class dominates: Interpretation, Reasoning, Output, Safety? (healthy: identified and addressed)
- Cost/latency — what is the cost signature trending? (healthy: stable or declining)

# Root Cause Isolation

Identify the architectural flaw, not the textual symptom:

- Too many responsibilities
- Hidden priority conflicts
- Unbounded reasoning depth
- Contradictory safety conditions
- Surface area too large
- Examples that subtly bias
- Knowledge baked in (should be retrieved)

# Surface Area Reduction

1. Delete tone/voice/style instructions (unless core to task)
2. Extract compliance/safety into separate prompts
3. Remove redundancy and accumulated contradictions

</prompt_diagnostics>
