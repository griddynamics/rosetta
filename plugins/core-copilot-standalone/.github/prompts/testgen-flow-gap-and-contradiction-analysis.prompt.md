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

Create `agents/testgen/{TICKET-KEY}/analysis.md`:

1. **Sections 1–6** (Contradictions, Gaps, Ambiguities, Cross-Reference Analysis, Positive Findings, Risk Assessment) — produced by `gap-and-contradiction-analysis` per its `<output_format>`. **Per-entry field shapes** — `C[N]`: Type / Source 1 (with field/section + verbatim quote) / Source 2 / Impact / Needs Clarification; `G[N]` / `A[N]` analogous — live in the skill's `references/entry-templates-and-document-skeleton.md` (verified canonical home). Sections 1–6 numbering and skeleton: same reference. The phase delegates without restating; this line is the verification trail.

2. **Verify the skill's output ended at the Risk Assessment section** before appending (semantic check, not numeric).

   **Coupling note (declared explicitly):** the skill `gap-and-contradiction-analysis` owns the document skeleton sections 1–N (currently 1–6, last section = Risk Assessment) per its `<output_format>` and `references/entry-templates-and-document-skeleton.md`. This phase appends sections (N+1) and (N+2). The semantic anchor is the **section name "Risk Assessment"**, NOT the literal numeric prefix `## 6.` — if the skill renumbers (e.g. adds a section between Contradictions and Risk Assessment), the append still attaches correctly as long as Risk Assessment is the last skill-owned section.

   **Procedure:**
   - **Primary check:** grep the file produced by step 1 for the last `^## ` heading; confirm its text **ends with `Risk Assessment`** (matches `## 6. Risk Assessment`, `## 7. Risk Assessment`, `## Risk Assessment`, etc.). Numeric prefix and number drift are tolerated.
   - **Zero-issues exception:** if the skill emitted the explicit "No issues found" zero-issues form per its `<output_format>`, that is also acceptable.
   - **Mismatch handling:** if the last `## ` heading is neither a "Risk Assessment" section nor the zero-issues form, the skill output is malformed or its skeleton has drifted beyond the semantic anchor — stop, report `Phase 2: gap-and-contradiction-analysis output does not end with Risk Assessment — last heading was: <heading>`, ask the user to inspect; do NOT append onto a misaligned document.

3. **Append the two sections below verbatim** to the end of the file (numbering continues from the skill's last numbered section — currently `## 6.` Risk Assessment, but reads the actual last-section number from the file produced by step 1 so the append stays consecutive if the skill renumbers), then fill the `[bracketed]` slots from the analysis:

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

Nothing else is appended — sections 1–6 are owned by the skill, not by this phase.

**Zero-issues rule:** if total issues = 0, the skill's sections 1–6 carry explicit `No issues found.` per its zero-issues rule; inside the append-only block above, set `Total questions expected: 0` and replace the `Recommended: ...` line with `Proceed directly to Phase 4 — no clarification needed (per Phase 2 zero-issues outcome).`

**Finding-quality grounding** (applies to every Contradiction / Gap / Ambiguity entry):

| ❌ Vague | ✅ Specific |
|---|---|
| `Some details missing.` | `User authentication method not specified — Jira mentions "secure login" but does not name OAuth, SAML, or basic auth; needed for Phase 4 requirements.` |

Name the specific concept that's missing or conflicting, quote the source text, explain why the gap blocks the next phase.

</create_analysis_document>

<update_state step="2.4">
1. Update `agents/testgen/{TICKET-KEY}/testgen-state.md` with Phase 2 complete and metrics (contradictions, gaps, ambiguities counts, risk level)
2. **Zero-issues branch:** if total issues = 0 (no contradictions, no gaps, no ambiguities), tell the user: "Phase 2 complete. No issues found — recommend skipping Phase 3 (Question Generation) and advancing to Phase 4 (Requirements Document)." Mark Phase 3 as `SKIPPED — no issues from Phase 2` in `testgen-state.md` if the user agrees, then proceed to Phase 4.
3. **Issues-found branch:** Tell user: "Phase 2 complete. Found [X] contradictions, [Y] gaps, [Z] ambiguities." Show high-risk issues requiring urgent clarification. Ask: "Ready to proceed to Phase 3 (Question Generation)?"
4. **STOP and wait for explicit user confirmation** before the parent flow advances to Phase 3. Do NOT auto-proceed on inferred approval or silence; treat ambiguous responses as "not confirmed" and re-ask. (Applies only on the issues-found branch — the zero-issues branch in sub-step 2 has its own user-agrees gate.)
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
