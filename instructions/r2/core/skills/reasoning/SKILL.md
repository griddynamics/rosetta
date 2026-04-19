---
name: reasoning
description: "Apply structured meta-cognitive reasoning to complex problems using the canonical 7D flow (Discover, Deconstruct, Diagnose, Develop, Deliver, Design, Debrief), then deliver a clear answer with confidence score and caveats. Use when problems have multiple dependencies or tradeoffs and confidence must be explicit."
license: Proprietary
disable-model-invocation: false
user-invocable: true
argument-hint: problem, context?, constraints?
model: claude-4.6-opus-high, gpt-5.3-codex-high, gemini-3.1-pro-high
context: default
agent: planner, prompt-engineer
metadata:
  version: "1.0"
  category: "reasoning"
tags:
  - reasoning
  - analysis
---

<reasoning>

<when_to_use_skill>
Use when problems have multiple dependencies or tradeoffs and confidence must be explicit; skip for simple low-risk questions. Every output must include: answer, confidence score (0.0–1.0), and key caveats grounded in explicit reasoning steps.
</when_to_use_skill>

<workflow>

Execute the canonical 7D reasoning flow in order. For simple questions, skip to step 5 (DELIVER) with a direct answer.

1. **DISCOVER** — search relevant information: affected areas, existing patterns, standards, best practices, files, and knowledge
2. **DECONSTRUCT** — extract core intent, key entities, and context; identify output requirements and constraints; break into sub-problems; map provided vs missing information
3. **DIAGNOSE** — audit for clarity gaps, ambiguity, and bias; check specificity, completeness, logic, and facts; assess structure and complexity needs
4. **DEVELOP** — apply techniques (multi-perspective analysis, constraint-based precision, chain-of-thought frameworks); extract actors, actions, data, entities; identify dependencies, edge cases, and constraints; assign explicit confidence (0.0–1.0) per sub-problem; resolve assumptions tied to public facts; resolve high-impact uncertainties with targeted questions
5. **DELIVER** — construct output artifact suited to task complexity; provide implementation guidance (what and why); define measurable, technology-agnostic success criteria verifiable without hidden assumptions; combine sub-results using weighted confidence: `overall = Σ(weight_i × confidence_i) / Σ(weight_i)` where weights reflect sub-problem impact
6. **DESIGN** — define target artifact structure, constraints, and technical approach options; include NFR/quality attributes; clarify decisions with rationale and tradeoffs; define error handling and validation strategy
7. **DEBRIEF** — if overall confidence < 0.8: identify the weakest sub-problem (lowest confidence × highest weight), re-execute steps 1–6 for that sub-problem only, then recompute overall confidence. If still < 0.8 after one retry, deliver with explicit caveat listing unresolved weaknesses.

</workflow>

<boundaries>

- Do not fabricate missing facts — label assumptions explicitly
- Escalate blockers with targeted questions
- Keep reasoning concise and decision-oriented
- Always output: answer, confidence score, and caveats

</boundaries>

<validation_checklist>

- Problem complexity was classified (simple → skip to DELIVER; complex → full 7D)
- Discovery and decomposition were completed
- Relevant facts and gaps were identified
- Sub-problems were explicitly defined with individual confidence scores
- Verification checks were performed
- Weighted confidence synthesis was applied with formula
- Output includes answer, overall confidence score, and key caveats
- If confidence < 0.8: weakest sub-problem was retried and result updated

</validation_checklist>

<pitfalls>

- Treating guesses as facts — always separate evidence from inference
- Overstating confidence without evidence — ground scores in specific findings
- Ignoring conflicting signals — explicitly address contradictions
- Retrying the entire process instead of targeting the weakest sub-problem

</pitfalls>

<resources>

Use `USE SKILL` to load:

- skill `planning`
- skill `questioning`
- skill `validation`

</resources>

</reasoning>
