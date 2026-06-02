---
name: testgen-flow-gap-and-contradiction-analysis
description: Phase 2 of testgen-flow - Gap and contradiction analysis of collected data
tags: ["testgen", "phase"]
baseSchema: docs/schemas/phase.md
---

<testgen_flow_gap_and_contradiction_analysis>

<description_and_purpose>
Analyze Jira ticket and Confluence documentation to identify contradictions, gaps, ambiguities, and inconsistencies that need clarification before requirements generation.
</description_and_purpose>

<workflow_context>
- Phase 2 of 7 in `testgen-flow`
- Input: `raw-data.md` from Phase 1
- Output: `analysis.md` with categorized contradictions, gaps, ambiguities, risk assessment
- Skills: `gap-and-contradiction-analysis`
- Prerequisite: Phase 0, Phase 1 complete
</workflow_context>

<phase_steps>
1. Load raw data
2. Run gap and contradiction analysis
3. Create analysis document
4. Update state file
</phase_steps>

<load_raw_data step="2.1">
1. Read `agents/testgen/{TICKET-KEY}/raw-data.md` completely
2. Extract key sections: Jira description and acceptance criteria, labels, components, priority, each Confluence page content, comments from both sources
3. **Failure paths:**
   - **`raw-data.md` missing:** stop Phase 2, record `Phase 2 blocked: raw-data.md missing` in `testgen-state.md`, and ask user to rerun Phase 1.
   - **`raw-data.md` exists but key sections empty** (no Jira description / no Confluence content): record the empty sections as gaps for Phase 3 to surface, and proceed — do not silently fabricate content.
   - **`raw-data.md` corrupt / unparseable:** stop Phase 2, record the parse error, and ask user to inspect the file.
</load_raw_data>

<run_analysis step="2.2" subagent="architect" role="Requirements gap analyst">
1. USE SKILL `gap-and-contradiction-analysis`
2. Sources to analyze: Jira ticket data + Confluence page data from `raw-data.md`
3. Identify contradictions, gaps, ambiguities across Jira and Confluence
4. Cross-reference Jira vs Confluence for information present only in one source
</run_analysis>

<create_analysis_document step="2.3">

Create `agents/testgen/{TICKET-KEY}/analysis.md` in two passes:

**Pass 1 — Skill-owned sections (authoritative template lives in the skill).** Sections 1–6 (Contradictions, Gaps, Ambiguities, Cross-Reference Analysis, Positive Findings, Risk Assessment) are produced by `gap-and-contradiction-analysis` per its `<output_format>`. This phase does NOT duplicate that template — refer to the skill for section structure, per-finding entry shape, and risk-tier conventions.

**Pass 2 — Testgen-specific additions, appended AFTER the skill's sections.** Append the two sections below verbatim. The fence is a **delta on top of the skill's output**, not the whole document template:

```markdown
## 7. Next Steps

1. Generate clarification questions (Phase 3)
2. Total questions expected: [Estimate based on issues found]
3. Recommended: Review with [Stakeholder role] before proceeding

---

## Analysis Metadata

- **Jira Fields Analyzed**: [List key fields]
- **Confluence Pages Analyzed**: [Count and titles]
- **Analysis Duration**: [Time spent]
- **Automated Checks**: [Any automated validation performed]
- **Manual Review**: [Areas requiring human judgment]
```

**Zero-issues rule** (separate atomic instruction, applies to Pass 1 + Pass 2):
- Pass 1: still produce sections 1–6 with explicit `No issues found.` text in each per the skill's `<output_format>` zero-issues rule.
- Pass 2: append the same two sections above, with `Total questions expected: 0` and the Recommended line replaced by `Proceed directly to Phase 4 — no clarification needed (per Phase 2 zero-issues outcome).`

**Finding-quality grounding** (one positive / one negative pair kept inline so the rule survives even when the skill is not loaded; the skill's `<analysis_guidelines>` "Be Specific" rule remains authoritative):

| ❌ Vague | ✅ Specific |
|---|---|
| `Some details missing.` | `User authentication method not specified — Jira mentions "secure login" but does not name OAuth, SAML, or basic auth; needed for Phase 4 requirements.` |

Apply the same shape to every contradiction / gap / ambiguity entry: name the specific concept that's missing or conflicting, quote the source text, and explain why the gap blocks the next phase.

</create_analysis_document>

<update_state step="2.4">
1. Update `agents/testgen/{TICKET-KEY}/testgen-state.md` with Phase 2 complete and metrics (contradictions, gaps, ambiguities counts, risk level)
2. **Zero-issues branch:** if total issues = 0 (no contradictions, no gaps, no ambiguities), tell the user: "Phase 2 complete. No issues found — recommend skipping Phase 3 (Question Generation) and advancing to Phase 4 (Requirements Document)." Mark Phase 3 as `SKIPPED — no issues from Phase 2` in `testgen-state.md` if the user agrees, then proceed to Phase 4.
3. **Issues-found branch:** Tell user: "Phase 2 complete. Found [X] contradictions, [Y] gaps, [Z] ambiguities." Show high-risk issues requiring urgent clarification. Ask: "Ready to proceed to Phase 3 (Question Generation)?"
</update_state>

<validation_checklist>
- `analysis.md` created with categorized findings
- At least 1 issue identified OR explicit "No issues found" statement
- Each issue has clear type, source quotes, and suggested question
- Risk assessment completed
- State file updated with Phase 2 complete
- Metrics updated in state file
</validation_checklist>

<pitfalls>
- Focus on implementation-blocking issues first
- Balance thoroughness with practicality — don't over-analyze minor details
</pitfalls>

</testgen_flow_gap_and_contradiction_analysis>
