<!-- Authoring report for SCORE-DIFFS.md against cto-knowledge-hub/skills-authoring.md. History only; NOT an input for the judge or the assistant. -->

# RULE-REPORT — authoring SCORE-DIFFS.md against cto-knowledge-hub/skills-authoring.md

| Rule-id | Status | Evidence |
|---|---|---|
| ONLY-UNKNOWN | APPLIED | Only benchmark-specific rules; no generic code-review teaching. |
| TRACE | APPLIED | Every line traces to a logged user decision (methodology-log.md D1–D70, P1–P9). |
| REQ-COVERAGE | PARTLY | No formal requirement→line map; the user skipped the list step ("just draft"). Coverage checked section by section with the user. |
| NO-INVENTION | PARTLY | Inventions happened while drafting (STOP rule, "run's Q&A", "decision the agent was told", clear-loser definition); all removed after review. |
| NO-FILLER | APPLIED | No empty sections or slots. |
| ACTIONABLE-LANG | APPLIED | Imperative, CAPS where the user required. |
| FOR-AGENTS | APPLIED | People get BENCHMARKS.md section 6. |
| KEEP-FORCE | APPLIED | User words kept: REALLY-REALLY, FINAL, MUST, NEVER, EXACTLY, SYSTEMATIC, METHODICAL. |
| DELEGATE | N/A | The judge runs in a clean config: no plugins or skills to delegate to. |
| NO-DECISIONS-FOR-AGENT | PARTLY | Early drafts decided for the judge (clear-loser definition, judge digging, strength baseline); corrected by the user. |
| CANVAS | APPLIED | "Starter process — ADAPT to context"; VALIDATOR marked MUST after the test. |
| USER-AUTHORS | APPLIED | Rules, weights, levels, bonus, roles came from the user. |
| KEEP-DECISIONS | APPLIED | Decision log kept; approved text not undone. |
| NO-OP | APPLIED | No purpose or boundary text beyond Responsibility / No-goals. |
| FRAME | APPLIED | Responsibility, No-goals, Constraints, Starter process. |
| SHARED-ONLY | N/A | Single file; no shared definitions. |
| PROVE-BY-RUN | PARTLY | One TEST CLEAN run (Sonnet 5.5, baseline vs rosetta-light, real fixture) + audit; fixes P1–P7, P9 applied; rerun declined by the user. |
| EXACT-SCOPE | APPLIED | Judge prompt only; BENCHMARKS changes limited to judge parts. |
| BRING-VALUE | APPLIED | Raised: anchoring on report.md, script sorting, RULE-REPORT name mismatch, 9.2 name, round-subagent type. |
| RULE-REPORT | APPLIED | The judge must report every rule; this report. |
| ADDRESS-AND-RECORD | PARTLY | Every correction applied and logged; real failures 1–13 recorded in the prompt. Not added as new rules to skills-authoring.md (not asked). |
| NO-ASSUMPTION | PARTLY | Several assumptions surfaced by the user (roles, blinding, inputs); fixed. |
| DECLARE-UNKNOWNS | APPLIED | Four unknowns declared with the draft; later questions asked one by one. |
| UNDERSTAND | PARTLY | Misreadings: "who digs", "which is which", roles of sessions A/B. |
| REASONABLE | APPLIED | Probes, merges, extra rules dropped after the user's simplification. |
| BREAKDOWN | APPLIED | Section-by-section review. |
| RULE-ID-REF | APPLIED | Constraints and steps have ids; the judge reports by id. |
| HITL-GATES | PARTLY | No human gate inside the judge run; human control = operator's self-challenge and merge-ready decision (BENCHMARKS). |
| GROUNDED-SUGGESTION | PARTLY | Some suggestions were not grounded at first (e.g. STOP rule). |
| NON-OPINIONATED | APPLIED | Judge gets values tables and ideas (hints), not opinions. |
| NECESSARY-SUFFICIENT | APPLIED | MUST items marked; hints marked as ideas. |
| NO-OBVIOUS | APPLIED | No generic explanations. |
| DDD-SEPARATION | APPLIED | Judge, subagents, validator, assistant, operator, files separated. |
| PROMPT-NOT-FUNCTION | PARTLY | The JSON output is a fixed contract, required by the totals script (user decision). |
| ROUTE-EXISTS | PARTLY | score-diffs.py exists and is tested; SCORE-DIFFS.md is not yet placed in the repo. |
| DEFINE-TERMS | APPLIED | Levels, values, bonus, leaderboard defined in the file. |
| CONSISTENCY | PARTLY | Prompt ↔ script field names checked; BENCHMARKS.md, templates, README, collect-results.py not yet updated. |
| REAL-CONTEXT-TEST | APPLIED | Real run folders, real base repos, real task text. |
| SKILL-REF | N/A | No other skills referenced. |
| REAL-WORLD | APPLIED | Who acts, when, how observed: sequence table + judge steps. |
| PROPOSE-DONT-ASK | APPLIED | Judge decides leaderboard, clear losers, merge advice. |
| AUTHOR-VS-EXECUTOR | APPLIED | Prompt binds the judge; BENCHMARKS binds assistant and operator. |
| DO-NOT-REPEAT | PARTLY | Weights are in both the prompt and the script (the judge must not read the script); metrics summary in BENCHMARKS is background for the assistant (user decision). |
| FALSE-POSITIVES-NEGATIVES | PARTLY | Learned in session (escape-hatch consequence); applied afterwards. |
