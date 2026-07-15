---
name: testgen-flow-gap-and-contradiction-analysis
description: "Phase 2 Gap & Contradiction Analysis of testgen-flow"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<testgen_flow_gap_and_contradiction_analysis>

<description_and_purpose>
Analyze the Issue Tracker ticket and Wiki documentation to identify contradictions, gaps, ambiguities, and inconsistencies that need clarification before requirements generation.
</description_and_purpose>

<workflow_context>
- Phase 2 of 7 in `testgen-flow`
- Input: `raw-data.md` from Phase 1
- Output: `analysis.md` with categorized contradictions, gaps, ambiguities, risk assessment
- Required skills: `qa-knowledge` (`gap_analysis` mode)
- Prerequisite: Phase 0, Phase 1 complete
</workflow_context>

<phase_steps>
1. Load raw data
2. Run gap and contradiction analysis
3. Create analysis document
4. Update state file
</phase_steps>

<load_raw_data step="2.1">
1. Read `plans/testgen-{TICKET-KEY}/raw-data.md` completely
2. Extract key sections: ticket description and acceptance criteria, labels, components, priority, each Wiki page content, comments from both sources
3. **Failure paths:**
   - **`raw-data.md` missing:** stop Phase 2, record `Phase 2 blocked: raw-data.md missing` in `testgen-state.md`, and ask user to rerun Phase 1.
   - **`raw-data.md` exists but key sections empty** (no ticket description / no Wiki content): record the empty sections as gaps for Phase 3 to surface, and proceed — do not silently fabricate content.
   - **`raw-data.md` corrupt / unparseable:** stop Phase 2, record the parse error, and ask user to inspect the file.
</load_raw_data>

<run_analysis step="2.2" subagent="architect" role="Requirements gap analyst">
1. USE SKILL `qa-knowledge` (`gap_analysis` mode, general multi-source variant). The mode is analysis-only and EMITS categorized findings into this phase's `<analysis_document_contract>` artifact; it never invents the artifact shape or path.
2. Sources to analyze: Issue Tracker ticket data + Wiki page data from `raw-data.md`.
3. Identify contradictions, gaps, ambiguities per the mode's detection catalogs — contradiction (value-mismatch / logic-conflict / requirement-conflict), gap (functional / non-functional / data / business-logic / dependency), and ambiguity (vague-term) probes. This phase does NOT restate the taxonomies; it invokes them through the mode and OWNS the output document below.
4. Cross-reference ticket vs Wiki for information present only in one source (single-source case → skip-with-note).
</run_analysis>

<create_analysis_document step="2.3">

Create `plans/testgen-{TICKET-KEY}/analysis.md`. The `qa-knowledge` `gap_analysis` mode EMITS its categorized findings into the phase-owned document contract below — this phase OWNS the full skeleton, section list, and risk-assessment artifact shape; the mode supplies the finding entries.

**Precondition (mode produced findings):** step 2.2 invoked the `gap_analysis` mode and produced categorized findings (or an explicit zero-issues result). If the mode could not run, apply `<failure_handling>` "gap_analysis produced no findings" — do NOT fabricate a partial analysis.

<analysis_document_contract>

The document has these sections in order; empty finding sections carry `No issues found` (never silently omitted). Per-entry shapes: C[N] (Type / Source 1 / Source 2 / Impact / Needs Clarification), G[N] (Type / Context / Missing Information / Impact / Suggested Question), A[N] (Source / Vague Statement / Possible Interpretations ≥2 / Clarification Needed). Risk tiers are exactly three (High / Medium / Low) — no fourth tier. **Phase 3 priority mapping (so the downstream P0/P1 signal is unambiguous):** a High finding whose Impact is "blocks implementation" → Phase 3 **P0** (MUST answer); Medium (impacts quality) → **P1**; Low (minor clarification) → **P2/P3**. Phase 3 classifies a question's priority from the finding's tier + its stated Impact, not from a tier name alone.

```markdown
# Analysis - [TICKET-KEY]

**Analyzed**: [DateTime]
**Sources**: [Issue Tracker ticket + Wiki pages analyzed]

---

## Executive Summary
- **Total Issues Found**: [Count]
- **Contradictions**: [Count]  · **Gaps**: [Count]  · **Ambiguities**: [Count]
- **Severity**: [High / Medium / Low]
- **Recommendation**: [Can proceed with clarifications / Needs major rework]

## 1. Contradictions
[None found OR C[N] entries]

## 2. Gaps
[None found OR G[N] entries]

## 3. Ambiguities
[None found OR A[N] entries]

## 4. Cross-Reference Analysis
[Findings OR `Skipped — only one source available (<name>); no cross-reference possible.`]

## 5. Positive Findings
[Well-documented areas / strengths]

## 6. Risk Assessment
**High Risk** (blocks implementation): [Issue ID — why blocking]
**Medium Risk** (impacts quality): [Issue ID — impact]
**Low Risk** (minor clarification): [Issue ID — minor impact]

## 7. Next Steps
1. Generate clarification questions (Phase 3)
2. Total questions expected: [Estimate based on issues found]
3. Recommended: Review with [Stakeholder role] before proceeding

## Analysis Metadata
- **Ticket Fields Analyzed**: [List key fields]
- **Wiki Pages Analyzed**: [Count and titles]
- **Analysis Duration**: [Time spent]
- **Manual Review**: [Areas requiring human judgment]
```

</analysis_document_contract>

**Zero-issues handling.** If total issues = 0, every finding section carries `No issues found`, set `Total questions expected: 0`, and replace the `Recommended: ...` line with `Proceed directly to Phase 4 — no clarification needed (per Phase 2 zero-issues outcome).` The document is still produced so downstream phases have a verifiable artifact.

**Finding-quality grounding** (applies to every Contradiction / Gap / Ambiguity entry):

| ❌ Vague | ✅ Specific |
|---|---|
| `Some details missing.` | `User authentication method not specified — the ticket mentions "secure login" but does not name OAuth, SAML, or basic auth; needed for Phase 4 requirements.` |

Name the specific concept that's missing or conflicting, quote the source text, explain why the gap blocks the next phase.

</create_analysis_document>

<update_state step="2.4">
1. Update `plans/testgen-{TICKET-KEY}/testgen-state.md` with Phase 2 complete and metrics (contradictions, gaps, ambiguities counts, risk level)
2. **Zero-issues branch:** if total issues = 0 (no contradictions, no gaps, no ambiguities), tell the user: "Phase 2 complete. No issues found — recommend skipping Phase 3 (Question Generation) and advancing to Phase 4 (Requirements Document)." Mark Phase 3 as `SKIPPED — no issues from Phase 2` in `testgen-state.md` if the user agrees, then proceed to Phase 4.
3. **Issues-found branch:** Tell user: "Phase 2 complete. Found [X] contradictions, [Y] gaps, [Z] ambiguities." Show high-risk issues requiring urgent clarification. Ask: "Ready to proceed to Phase 3 (Question Generation)?"
4. **STOP and wait for explicit user confirmation** before the parent flow advances to Phase 3. Do NOT auto-proceed on inferred approval or silence; treat ambiguous responses as "not confirmed" and re-ask. (Applies only on the issues-found branch — the zero-issues branch in sub-step 2 has its own user-agrees gate.)
</update_state>

<validation_checklist>
- `analysis.md` created with all sections per `<analysis_document_contract>` (in order; empty finding sections carry `No issues found`)
- At least 1 issue identified OR explicit "No issues found" statement
- Each issue has clear type, verbatim source quotes with citation, and suggested question
- Each finding carries exactly one risk tier (High / Medium / Low); Risk Assessment section completed
- State file updated with Phase 2 complete; metrics updated
</validation_checklist>

<failure_handling>

- **gap_analysis produced no findings** (step 2.2 invoked the `qa-knowledge` `gap_analysis` mode but it could not run / returned nothing): stop Phase 2, record `Phase 2 blocked: qa-knowledge gap_analysis produced no findings` in `testgen-state.md`, ask the user to verify the skill loaded correctly. The phase **blocks** when the mode is unavailable; do NOT fabricate a partial analysis.md. (Entry shapes are owned inline by `<analysis_document_contract>`, but the mode supplies the analysed findings — a blank skeleton with no analysis is not acceptable.)
- **Skill execution failure** (`qa-knowledge` gap_analysis errors mid-run): re-invoke once with the same inputs; if still failing, stop, record the skill failure, and ask the user to verify input quality.
- **`analysis.md` unwritable** at the supplied path (permission denied, disk full): pause, report the filesystem error with the path; do not mark Phase 2 complete.

</failure_handling>

<pitfalls>
- Focus on implementation-blocking issues first
- Balance thoroughness with practicality — don't over-analyze minor details
</pitfalls>

</testgen_flow_gap_and_contradiction_analysis>
