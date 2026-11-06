<patterns mix-and-match="any">

<multi-hypothesis>

- Define top 3-5 best solutions
- Work on each independently
- Select winner or merge
- Clearly indicate and store separately alternatives

</multi-hypothesis>

<requirements-and-intent>

- Requirements could be reverse engineered, a must if starting from something existing
- "Interrogate" user to get requirements — USE SKILL `questioning`
- Persist the intent and pass it across entire workflow
- Clearly define which requirements are directly provided by users and which were deducted by AI
- Ensure original requirements and intent is always verified with through out the entire process as source of truth

</requirements-and-intent>

<authoring-review-via-annotations>

- AI generates file
- User reviews and leaves annotations / comments
- AI fixes the file according to annotations removing them
- Cycle repeats, but define clear exit conditions
- User still must explicitly approve to proceed, do not assume it was done

</authoring-review-via-annotations>

<discovery-research>

- Discovery: find project context
- Research: find common and specialized knowledge online
- Result: a summarized relevant index of references and patterns

</discovery-research>

<review-after-authoring>

- Critically review new or modified content
- Loop original agent to consider review comments, but take it as recommendations
- Use separate models for authoring and reviewing
- MUST limit number of loops and prevent nitpicking

</review-after-authoring>

<memory-self-learning>

- Use simple format
- Keep memory organized, very concise
- Grep by headers for auto-toc
- Define step to autoload using grep
- Use persisted file to save execution status in FEATURE PLAN folder
- Save decisions, things tried, successes and failures, hypothesis to prevent looping (include role who wrote what)
- Identify the true root cause of every failure or missed expectation, convert it into a reusable preventive rule, and store it in memory.
- Usage: task memory TASK-MEMORY.md in FEATURE PLAN folder and AGENT MEMORY
- Do not mix levels, and explain to not mix levels: task memory is request-scoped, project memory stores reusable repository rules
- Prefer agent memory over task memory

</memory-self-learning>

<ralph-loop>

- Create task memory
- Execute (using task memory)
- Review results of execute (using task memory)
- Update task memory with root cause analysis for failure, add, change, or remove generalized rule, be reasonable - do not change a lot introducing chaos
- Loop again to execute

</ralph-loop>

<layering-cognitive-space>

- Architect makes high-level decisions, actors, responsibilities, contracts, inputs/outputs
- Planner breaks down work into process
- Engineer implements tasks according to plan and design

</layering-cognitive-space>

<draft-improve-aspect-based>

- Start with short draft with core intent and principles (draft)
- Improve one or another aspect
- Aspects must not be conflicting
- Dependent aspects must be properly sequenced
- Pipeline of adding value

</draft-improve-aspect-based>

<subagents-orchestration>

- Provide clear concise role with knowledge for subagent to assume as first sentence of the input
- Provide clear task, considering that subagent has no your context, use SMART at minimum
- Provide context or references (better) for lightweight agents to be successful, including all relevant files, all types of prompts that are required to effectively complete the work, instruct to NOT do more than requested
- For full subagents, require `subagent-directives` + task-needed skills, provide exact phases/steps/tasks (do not explain), apply SMART/DRY/KISS, and instruct to NOT do more than requested
- Large inputs: write input to a file in FEATURE TEMP folder, reference as MUST to auto-toc grep and read, critical requirements go first in the file
- Large output: provide exact path to folder where to put output files inside FEATURE TEMP folder, if output is not part of the contract, tell subagent exactly what file name, format, and minimal template it should use
- Let subagents read and write common files (be careful for parallel agents modifying the same file)
- Copy-before-write could be used, but many changed copies will be even bigger problem
- You can use addendum approach (where subagent only outputs what should be modified)
- Enforce subagent is focused, in case if something goes off the plan, it must tell caller agent back, instead of trying to continue (critical!)
- Ensure subagents are organized the way they have minimal state transition

</subagents-orchestration>

<slicing-large-list-of-rules>

- Prepare the full list of rules
- Slice rules with small intersection across layers, aspects, and actors

</slicing-large-list-of-rules>

<review-and-validate>

- Review IS statically reviewing some result for some intent (its output maybe wrong)
- Validate IS actually running it on sample or real tasks locally (this provides great insights, rarely wrong, but more expensive)

</review-and-validate>

<why-vs-how-loops>

- There is "WHY" loop: idea → requirements → working software → learn → evolve idea
- There is "HOW" loop: specs → code → tests → stories → features

- Combinations:
  1. Humans outside the loop: human runs WHY, agent runs HOW autonomously. Agents use requirements. Good: fast, humans focus on outcomes. Bad: agents spiral on messy code, external quality hard to guarantee.
  2. Humans in the loop: human gatekeeps every artefact in HOW loop. Good: human judgement breaks agent spirals fast. Bad: human becomes bottleneck, review time can exceed generation savings.
  3. Humans on the loop: human builds the harness (specs, checks, workflow) that controls HOW loop, agent runs within it. Good: scales judgement, improvements compound. Bad: upfront investment, new discipline. Key: fix the harness, not the artefact.
  4. Agentic flywheel: human directs agents to improve the harness itself using test results, prod metrics, user data. Good: self-improving, anti-fragile. Bad: needs high confidence and rich signals first.

- Key Points:
  1. Internal quality matters not for its own sake — messy code makes agents spiral, costing time and money.
  2. Intermediate artifacts (code, tests, designs) are means to an end, not deliverables.
  3. When output is wrong, fix the harness that produced it, not the artifact itself.

- We are at HITL, but move towards AF.

</why-vs-how-loops>


<problem-solution-proof>

- Use self-documentation to make rational decisions afterwards
- Save what problem this artifact is solving
- Document concisely solution for a problem
- Write retrospectively and introspectively validation proof that this problem is actually solved by the artifact
- If you see it is NOT or partially solved - document what should be done

</problem-solution-proof>

<work-curiosity-limit>

- Intentionally limit AI to not do more or extra work and maintain boundaries
- Intentionally limit AI to not discover or research more unless absolutely necessary
- Intentionally make AI to trust the system
- Focus on the task itself
- limit AI context overflow and eagerness to do everything at once
- Curiosity ends with discover, research, and architecture

</work-curiosity-limit>

<self-organizing>

- When files become large
- Maintain auto-toc by use of grep-able
- Compress old and not useful information
- Reorganize folder structure if growing

</self-organizing>

<simulation>

- Instead of directly answering, think how it will work in reality
- Define few use cases
- Identify what will be in context and state at each time, what is cognitive load
- Identify how to build gradually value increasing iterative pipeline
- Distribute logic across phases so each phase only carries the principles that govern THAT phase's work
- The artifacts between phases are the key as they carry conclusions forward without carrying instructions forward
- JUST EXAMPLE: Intake → Architect → Draft → Hardening/Review → Simulation → Final Consistency → Validate

</simulation>

<human-issues>

- User just cannot provide all inputs in a consistent manner in one shot
- AI should proactively solicit requirement and verify it is coherent
- User my provide conflicting, unspecific, ambiguous, subjective qualifiers, vague adjectives and constructs, loaded expressions
- AI should reconstruct it as coherent simple clear consistent SET of requirements without gaps
- Ask questions until crystal clear without nitpicking
- User can only REVIEW maximum 2 pages of simple text, and this does NOT limit result which could be much larger
- User appreciates TLDR and similar
- The human is here to work WITH the AI, not to be worked around — together → result, separately → waste; prompts must drive co-working/co-authoring, not autonomous hand-offs (drop "human-on-the-loop" framing that pushes the human out)

</human-issues>

<ai-issues>

- System prompts (out of our control) require immediate execution, deny back-and-forth with user, also models always jump to conclusions
- Our prompts should encourage co-working and co-authoring
- AI forgets to give proper context, forgets that subagents, tool calls outputs are only available to orchestrator, user can not see those, etc.
- AI forgets to validate, reorganize, persist root causes, learn (persist discovered knowledge), and cleanup
- AI mixes aspects, actors, and responsibilities if not clearly separated
- AI is prone to carry away and generate a huge amounts of content based on assumptions, rendering it useless or impossible to review
- AI overly relies on internal knowledge (but train sets are >1Y old), AI does not proactively research
- AI removes important clarifiers, specifiers, explanations ("just", "only", "constantly", minor explanations, etc)
- AI constantly keeps inserting non-operational clarifications (history, rationale, origin labels, change annotations), but target documents must be source-agnostic, state-only, action-only. All change logs must be directed to a separate file.
- AI constantly badly over-engineers instead of simplifying, simplification is a king
- AI constantly brings new ideas instead of following existing, constantly overly complicates
- AI never looks around to think "What else is used? What could be the better solution? How this pattern or issue was resolved in other places? What web search can find? What else is affected in any direction?"
- AI prioritizes action over analysis leading to not known unknowns
- AI needs harsh, direct, MoSCoW style rules + short brilliant comparisons (task coded ≠ task completed, trust but verify)
- AI produces an unmanageable amount of AI generated content with a lot of non-matching assumptions (AI slop)
- AI "feels overloaded" and skips steps if we provide more than 5 at once
- AI constantly injects instructions/reasoning/information given to him into final outputs, even though those for its own reasoning only (examples: AI makes mistakes - user tells to fix because of X - AI applies correct fix and additionally adds that X to the final document - instead of just fixing - producing useless slop; AI reads requirements and specifications - implements changes - internal requirement identifiers slip in output to user; etc.)
- AI does not understand deeply purpose => example: when asks for review it limits reviewer so that it can't review much, instead it should have provided original intent with clarifications from user and then ask for code review, logic review, architecture review, and check for gaps/inconsistencies/dependencies/alternatives, etc.
- AI does not understand prompting: ask fresh eye subagent to review, ask it why EACH line exists, what failure it addresses, what is the purpose, then ask for improvements; Feedback should be analyzed the following: incorrect understanding => to be fixed, incorrect improvement suggestions or suggestion deviating from idea => to fix original (it did not understand), correct improvement suggestions to add something => it did understand and it already understood what should be done more (so NO NEED to apply that suggestion), correct improvement suggestion to rephrase something (it DID understand, think twice whether that should be changed at all), suggestions to cut/rephrase something => maybe incorrect (weights were previously adjusted with => that's why it worked => removing words leads to weights loosing value => no longer follows/understands).
- AI thinks in extremes — offers yes/no or a fixed 2-3 way split (false trichotomy) where reality is a blend on a continuum that adapts as facts arrive; reason on the spectrum and compose, do not pick an end
- AI over-prescribes rigid mechanics/routing (if/then, fixed splits) where the executor should judge and compose; teach how to decide and hand a palette to choose from, do not hardcode the choice
- AI overfits to a single strong reference/example — it replicates that example's shape (sections, order) instead of extracting the principles and designing for the actual context; mine principles, do not clone structure
- No output, no thought — without emitting a message/artifact the AI only pretends to think; producing even an intermediate output forces it to finalize and build on top. Externalize each decision (write the message / write the file) as a step, then "only then proceed"
- Passive consumption over active construction — AI and authors default to pre-baking content for the AI to fill/follow; the reliable pattern makes the executing AI construct the artifact for its own situation and output it — active/proactive beats passive
- Over-abstraction → hallucination — stripping concrete specifics (numbers, samples, process) severs the AI's grasp on reality and it hallucinates; keep the specifics AND layer the decision model on top (blend, not either/or)
- Wrong-altitude specificity — AI swings between verbose prose and cryptic shorthand; both fail. Shorthand like "decide/reconfirm/split/merge" leaves a fresh agent unable to recover the problem OR the action. Write at the altitude where a fresh reader grasps the problem AND the concrete action
- AI reverses settled decisions (last-speaker bias) — it abandons an agreed decision the moment a new voice (reviewer, schema, doc) differs, instead of holding it unless genuinely overridden; on a conflicting source, surface the conflict and reconcile, never silently flip
- AI handles subagent/tool output in binary — takes a return as either truth (integrates blindly) or noise (neglects it); instead judge it against the definition of done, reconfirm and fill gaps, split independent follow-ups to focused subagents, and merge findings into one grounded result (not accept-or-reject)
- Actor confusion — AI mis-assigns who performs an action, e.g. the orchestrator validates a claim himself instead of orchestrating verification (spawn reviewer → validator) and only tracking status; name the actor per action (orchestrator orchestrates, subagents execute, validator validates)
- Blind pass-through of request structure — big request in → big dispatch out; AI forwards the request whole instead of decomposing it into the smallest independent actions and recomposing them into right-sized tasks (a task may still be large — the work decides)
- AI deletes substance when told "too long" — it removes content (intrinsics, failure-framing, items marked KEEP) instead of compressing by transformation (intrinsic → process); densify, do not delete
- Process compliance must be structurally reinforced — AI skips/forgets process unless the structure forces the next move; reinforce by composing keep-in-the-dark (JIT: reveal only the next step so loading it is the only move), prerequisites, next-steps chaining, output-as-gate (write the decision/file as a step, then "only then proceed"), and the task ledger (one in_progress, close on evidence)
- AI writes descriptions/summaries as WHAT it does instead of WHY the user benefits, and ignores UI truncation (menus show only the first few words) — lead with the benefit/differentiator in the first words, dense, no skill-name repetition, drop words that restate the obvious

</ai-issues>

<visual_graph>

- Proactively ask to generate and show a graph visually, also suggest which perspectives to generate it on
- Load and process source data programmatically or AI-driven semi-programmatically to build a graph data
- Use Graphify for coding graph or Graphviz to build/show the UI for any graph and configure it for best visual presentation

</visual_graph>

</patterns>
