# Ambiguity judge (step 3, after stop 1)

Says which checklist items the agent's requirements state, and which contradictions they leave unresolved. The script turns this into AS(requirements) with the same formula as AS(prompt) (METRICS.md, section 1). Setup: [README.md](./README.md).

## Input

`judge-input-requirements.md`, written by the assistant into the run folder:

1. The checklist items that count for AS (not the general ones), numbered as in `prompts/checklist.json`, text only (no weights).
2. The planted contradictions of the prompt version (side A and side B, quoted), or "none".
3. The agent's answer at stop 1 (report Appendix B), word for word.

## Output and how it is combined

Saved as `judge-requirements-r1.json` … `r3.json`. Per item, the median of the 3 runs (yes = 1, partly = 0.5, no = 0); the number of unresolved contradictions is the median of the 3 counts.

## Prompt

```text
Read judge-input-requirements.md in the current folder, and nothing outside it. It holds a numbered checklist of what a complete implementation of a task needs, the contradictions planted in the task (if any), and the requirements an AI agent wrote down before implementing the task.

For each checklist item, say whether the agent's requirements pin it down:
- yes: they state it clearly. A value different from the checklist still counts as stated: you judge whether it is decided, not whether it is right.
- partly: they mention it but leave part of it open or vague.
- no: they do not mention it, or leave it open.
Quote the requirement that states it (for yes and partly).

Then list the contradictions the requirements leave unresolved: pairs of statements in the requirements that cannot both be true, and each planted contradiction that the requirements do not settle on one side.

Answer with JSON only:
{"items": [{"item": 1, "stated": "yes | partly | no", "quote": "..."}],
 "unresolved_contradictions": [{"quote_a": "...", "quote_b": "..."}],
 "reason": "two or three sentences"}
```
