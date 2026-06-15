
<best_practices>

- Prompt must have clearly defined problem statement, proposed solution, and **valid proof** that solution solves the problem
- Proactively review results with user
- Proactively question user until crystal clear
- Prompt brief first, get it approved, then draft
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
- Persist memory of new discoveries, root causes of misunderstanding/oversights/failures, etc
- Consider or emulate cognitive load and LLM context usage with standard tasks:
  - Define how to split cognitive load
  - Progressive disclosure should be actually reducing context and cognitive space
  - If skills are used just sequentially, you just load all of them
  - If subagents are used, how do you pass information, reasoning and build result on top of previous results, without loading all previous skills and documents (prevent AI from doing it)
  - How do you maintain source of truth and overall intent clearly (persisted requirements flow?)
  - Think about cognitive layering, step-by-step flows, preventing loss of context, slicing rules, improvements to be made each step, information and business flows, architecture of the entire set of prompts, value adding pipeline, tracking decisions (both positive and negative), intermediate artifacts are concise but useful, use standard prep steps for you advantage, prevent artifacts duplicating content of rules and skills, ensure there are criticizing reviewers (without nitpicking, results of review are recommendations, as reviewer maybe wrong), validators are those which actually run in reality.

</best_practices>

<pitfalls>

**Scope & Objectives**

- Mix multiple objectives in one prompt
- Scope creep: unapproved features or nice-to-haves
- Over-specify what the model already knows

**Clarity & Precision**

- Implicit inputs, outputs, or schemas
- Hidden assumptions presented as facts
- Temporal ambiguity ("recent", "soon", relative ordering)
- Inventing unnecessary new terminology

**Brevity & Signal**

- Overlong prompts restating obvious rules
- AI slop: large content generated, filler, repetition, generic platitudes
- Overcomplicate what could be simpler

**Examples**

- Too many examples dilute focus
- Irrelevant or inconsistent examples confuse model
- Model overfits by copying patterns too literally

**Reasoning & Logic**

- Premature conclusions without full reasoning
- Circular logic: conclusion justifies the reasoning
- Missing intermediate steps in calculations

**Constraints & Guardrails**

- Ignore user or environment constraints
- Ignore token limits for input/output space
- No test cases or acceptance criteria
- No Human-in-the-Loop gates for ambiguous, assumptions, tradeoffs
- Duplicating `bootstrap-hitl-questioning.md`

**Format**

- Inconsistent structure mid-reasoning or mid-output

</pitfalls>
