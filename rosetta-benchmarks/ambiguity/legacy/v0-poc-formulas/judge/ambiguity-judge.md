# Ambiguity judge (prompt)

The independent check of the Ambiguity Score (METRICS.md, section 1.2). It reads **only the prompt text**: no checklist, no answer sheet, no repo, no other version. Every run is a fresh session, so one version can't anchor another.

## How to run it

- Model: Claude Code CLI, `claude-opus-5-5`, effort `xhigh`. No plugins, no skills, no MCP servers (a fresh `CLAUDE_CONFIG_DIR` with the common settings of BENCHMARKS.md 3.5). The session starts in the judge folder `~/ambiguity-judge`, outside the Rosetta repo, with the clean config described in [trust-judge.md](./trust-judge.md) ("Setup: as the Saleor diff judge").
- 3 runs per version (v0–v5), each in a new session, in this order: v3, v0, v5, v1, v4, v2 (mixed, not ascending).
- Paste the prompt below, with `<PROMPT>` replaced by the exact text of `prompts/<version>.txt`.
- Save the JSON answer as is to `judge/results/<version>-r<n>.json` (n = 1–3), and add the fields `version`, `run`, `model`, `date` at the top. Don't edit the judge's fields.
- Then rerun `scripts/as_score.py`. It reads these files.

## Prompt

```text
You are reviewing a ticket that a product owner gave to an AI coding agent. The agent works on an existing e-commerce code base. Judge only the ticket text below. Do not solve the task.

<ticket>
<PROMPT>
</ticket>

Rate how clear the ticket is on five dimensions, each 0, 1 or 2:
- goals: is it clear what must be built and what the result is for? (0 = clear, 1 = partly open, 2 = mostly open)
- constraints: are limits, rules and the definition of done stated? (0 = clear, 1 = partly open, 2 = missing)
- inputs: are the data, values and formats clear? (0 = clear, 1 = partly open, 2 = missing)
- context: is it clear where in the system the change goes and who uses it? (0 = clear, 1 = partly open, 2 = missing)
- contradiction: do instructions conflict? (0 = none, 1 = a possible tension, 2 = a direct conflict)

Then list:
- interpretations: the distinct, reasonable ways a competent engineer could read this ticket that would lead to materially different implementations. Count only readings that change what gets built. List at least one (the main reading).
- contradictions: each pair of instructions that cannot both be true, quoted.
- open_questions: the questions a careful engineer should ask before starting, most important first.

Answer with JSON only, in this exact shape:
{"ratings": {"goals": 0, "constraints": 0, "inputs": 0, "context": 0, "contradiction": 0},
 "interpretations": ["..."],
 "contradictions": [{"a": "...", "b": "..."}],
 "open_questions": ["..."],
 "reason": "two or three sentences"}
```

## What the scores use

- **Interpretation spread** = (number of `interpretations` − 1) ÷ 4, capped at 1, averaged over the 3 runs. Part of AS.
- **Judge total** = the sum of the five ratings (0–10), averaged over the 3 runs. Not part of AS: it is the independent rating AS is validated against.
- **Detected contradictions** are compared with the planted ones (K1, K2 in v5; none elsewhere). A missed planted contradiction or a contradiction found in v0–v4 is written in the decision log.
- `open_questions` is kept for the report. It is not scored.
