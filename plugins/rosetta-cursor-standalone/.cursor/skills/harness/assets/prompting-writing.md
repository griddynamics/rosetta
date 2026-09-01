<harness_prompting_writing>

Line-level craft for skill and subagent files. Every draft, every edit.

<compress>

- Start minimal. Add only what fails without it.
- Under 8 words per line. Longer → split into layers.
- Imperative or infinitive. Phrases, not sentences.
- One idea per line. No idea twice in one file.
- Name the term instead of explaining it. The executor is a model like you.
- Intrinsics over prose: `coded ≠ done`, `review < validation`, `A → B → C`.
- Under 300 lines ideal, 300-500 acceptable, 500+ split by phase or layer.
- Front-load the load-bearing constraints. Each rule stands alone, readable without the rest.

</compress>

<cut>

- Obvious facts, standards, definitions the model already holds.
- Meta-explanation: why a line exists, what it replaced, what changed.
- History, rationale, origin labels. Change notes go to one change log, never the artifact.
- Filler, hedges, vague qualifiers, restated headings.
- Tone and style instructions, unless style is the task.
- Examples past the one that constrains. Extra examples dilute and invite copying.
- References by number — "see phase 1", "per step 3". They break on reorder.
- Prose restating a deterministic procedure. Ship the script instead.

</cut>

<keep>

- Rules that override the model's default behavior. That is the whole payload.
- Clarifiers the model wants to delete: only, just, never, before, even if.
- Mental hooks and unusual comparisons. They carry weight plain phrasing loses.
- Concrete specifics: numbers, thresholds, exact strings. Abstraction invites hallucination.
- Explicit priority wherever two instructions can conflict.

</keep>

<counter_model_defaults>

Write against these. They recur in every model, including you.

- Deletes substance when told "too long". Densify by transformation, never by dropping rules.
- Reverses a settled decision when a new source disagrees. Surface the conflict; do not flip.
- Clones the shape of a strong example instead of extracting its principle.
- Swings between verbose prose and cryptic shorthand. Write where a fresh reader gets both the problem and the action.
- Offers a two- or three-way split where the answer is a blend.
- Hardcodes routing where the executor should judge. Hand a palette, not a branch.
- Skips a step unless structure forces the next move. Chain prerequisites; make writing the artifact the gate.
- Injects its own reasoning and internal identifiers into the output.
- Generates volume on assumption, past what anyone can review.
- Drops instructions when given more than five at once.
- Acts from memory where it should observe.
- Writes a description as what it does, not what the user gains. Menus truncate — benefit first.

</counter_model_defaults>

<human_input>

- Arrives incomplete, conflicting, and vaguely qualified. Reconstruct a coherent set; ask until clear, do not nitpick.
- A human reviews about two pages. The result may be larger; the review surface is what caps.
- Co-author, never hand off. A gate is where you work together, not where you pause alone.

</human_input>

<review>

Ask a fresh-context reviewer why each line exists and what failure it prevents. Then read the feedback:

- Misunderstood a line → the line is unclear. Fix the line.
- Suggests what was already intended → understood. Change nothing.
- Suggests cutting words → suspect. Those words carry the weight that earned current behavior.
- Suggests added scope → decline unless the brief covers it.

Separate models for authoring and review. Cap the loops. Review yields recommendations, not orders.

</review>

</harness_prompting_writing>
