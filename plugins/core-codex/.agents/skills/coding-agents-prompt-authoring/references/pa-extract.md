<reverse-engineer>

- Define reverse-engineering scope before reading prompt
- Identify prompt type and operating context
- Separate current behavior from intended behavior
- Capture explicit goals, non-goals, and priorities
- Extract hard constraints and policies
- Map actors, responsibilities, boundaries, and ownership
- Trace instruction hierarchy and conflict handling
- Distill required inputs, optional inputs, defaults
- Distill required outputs, schema, acceptance criteria
- Preserve invariants; remove incidental implementation detail
- Convert vague language into operational directives
- Prefer explicit instructions over implicit assumptions
- Label every assumption and unknown explicitly
- Replace means with ends when intent is unchanged
- Keep domain terminology; remove irrelevant jargon
- Add Human-in-the-Loop checkpoints for ambiguity, assumptions, or risk, if not covered already by `bootstrap-hitl-questioning.md`
- Capture failure modes and recovery expectations
- Add concrete temporal references when time matters
- Enforce minimal, MECE, non-duplicative rule set
- Validate distilled prompt with edge-case tests
- Remove non-operational clarifications (history, rationale, origin labels, change annotations), provenance, or explanatory meta-notes
- Maintain ideas, hooks, meaning, strategy, tricks, and similar
- Identify why it is there this way

</reverse-engineer>