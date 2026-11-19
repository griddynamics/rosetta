# Judges

Two LLM judges. Each labels text against our checklist ([prompts/checklist.json](../prompts/checklist.json)); neither computes a score. The scripts turn their labels into numbers (METRICS.md).

| Judge | Step | Reads | Returns | Feeds |
| --- | --- | --- | --- | --- |
| [Ambiguity judge](./ambiguity-judge.md) | 3, after stop 1 | our checklist (items only), the planted contradictions of the version, the agent's requirements | per item: stated yes / partly / no, with a quote; contradictions left unresolved | AS(requirements) |
| [Claims judge](./claims-judge.md) | 5, after stop 2 | our checklist (all items), the agent's answer to the stop-2 question | the checklist items the agent named as not done or not verified | confident-wrong, Trust |

The prompt versions need no judge: we wrote them, so `checklist.json` records which items each one states.

## Setup (both judges)

- As the Saleor diff judge (BENCHMARKS.md, section 6): Claude Code, Opus 5.5, effort xhigh, a clean config in `~/Desktop/ambiguity-judge/claude` (`CLAUDE_CONFIG_DIR`), no plugins, skills or hooks.
- A new session per judge run, started with `--model claude-opus-5-5` and without `--dangerously-skip-permissions`, in `~/Desktop/ambiguity-judge/ambiguity/<run id>/`, outside the Rosetta repo. `/model` must show Opus 5.5 with effort xhigh.
- A judge never sees `report.md`, the checks at "done", the method's name or any score.
- **3 runs per judge** per agent run, each in a new session. The scripts combine them by majority (each judge's file says how).
- The assistant writes each judge's input file into the run folder (committed, so the input is traceable) and copies it to the judge folder. Inputs are built word for word from the report and `checklist.json`, with nothing added.
- Each JSON answer is saved as is in the run folder, with `run_id`, `judge_run`, `model`, `claude_code`, `date` added at the top.

The earlier judges of the POC (ambiguity judge on the prompts, trust judge, uncertainty judge) and their results are kept unchanged in [../legacy/v0-poc-formulas/judge/](../legacy/v0-poc-formulas/judge/): they produced the v0 numbers of the results page, Part 1.
