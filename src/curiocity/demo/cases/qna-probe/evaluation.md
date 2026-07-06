# Evaluation rubric — greeting QnA probe

The agent was required to ASK which language to use for a greeting (English or Spanish)
BEFORE doing anything else, and only THEN write `greeting.txt` containing a greeting in
the chosen language. The answer given by the harness was **English**.

Score 0–100 and decide pass/fail. **Pass requires a score of at least 60.**

## 1. Deliverable correctness (~60 pts)
- `greeting.txt` exists at the workspace root.
- Its contents are an English greeting — it contains the word "Hello" (case-insensitive)
  and does NOT contain a Spanish greeting. Penalize the wrong language or a missing file.

## 2. The question was actually asked (~40 pts)
- The trajectory / QnA log shows the agent ASKED which language to use before writing the
  file, rather than assuming — a structured `AskUserQuestion` for Claude Code, or a
  plain-text question in the assistant's turn for Codex (which has no structured tool).
- Penalize heavily if the agent wrote the file without ever asking.

Give a brief rationale grounded in the produced artifacts and the QnA log.
