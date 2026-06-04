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

Create `agents/testgen/{TICKET-KEY}/analysis.md` via four atomic sub-steps.

**Append contract (public, declared once):** `gap-and-contradiction-analysis` owns the document skeleton (its `<output_format>` is the contract — sections, numbering, and the `<!-- end-of-gap-and-contradiction-analysis -->` public append-anchor marker emitted as the last line). This phase appends two sections (Next Steps + Analysis Metadata) by splicing them **before** the anchor marker and re-emitting the marker as the last line. The phase keys on the public anchor, not on the skill's internal section names or numbering — the contract survives skeleton renumbering, renames, or additions.

**2.3.a — Run the skill (already done in step 2.2).** Step 2.2 already invoked `gap-and-contradiction-analysis`. Verify its output file exists at `agents/testgen/{TICKET-KEY}/analysis.md` and is non-empty.

**2.3.b — Verify the public append-anchor.** Grep the file for the literal line `<!-- end-of-gap-and-contradiction-analysis -->`. If absent: stop, report `Phase 2: gap-and-contradiction-analysis output missing public append-anchor marker — skill output may be malformed or from a pre-anchor version`, ask the user to inspect. Do NOT append onto a missing-anchor document.

**2.3.c — Splice the two appended sections before the anchor.** Insert the block below immediately before the `<!-- end-of-gap-and-contradiction-analysis -->` line, then re-emit the marker as the last line. Numbering: the section numbers below use the skill's current scheme (next numbers after the skill's last numbered section); they are presentation-only and may be renumbered if the skill's skeleton evolves — the anchor remains the splice point regardless.

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

**2.3.d — Zero-issues handling.** If total issues = 0 (the skill's sections carry `No issues found.` per its zero-issues rule), set `Total questions expected: 0` and replace the `Recommended: ...` line with `Proceed directly to Phase 4 — no clarification needed (per Phase 2 zero-issues outcome).` Anchor verification (2.3.b) still runs — zero-issues documents emit the marker like every other case.

**Final analysis.md heading shape** (self-contained — describes the joined skill-output + appended-sections result so the document contract is verifiable from this file alone):

| Order | Heading | Owner | Notes |
|---|---|---|---|
| 1 | `# Analysis - [Title]` | skill | Document header |
| 2 | `## Executive Summary` | skill | |
| 3 | `## 1. Contradictions` | skill | C[N] entries or `None found` |
| 4 | `## 2. Gaps` | skill | G[N] entries or `None found` |
| 5 | `## 3. Ambiguities` | skill | A[N] entries or `None found` |
| 6 | `## 4. Cross-Reference Analysis` | skill | |
| 7 | `## 5. Positive Findings` | skill | |
| 8 | `## 6. Risk Assessment` | skill | Last skill-owned section in current skeleton |
| 9 | `## Analysis Metadata` (skill's own) | skill | Sources Analyzed + Analysis Duration |
| 10 | `## 7. Next Steps` | **phase** (appended 2.3.c) | |
| 11 | `## Analysis Metadata` (phase-extended) | **phase** (appended 2.3.c) | Phase-specific fields (Jira / Confluence / Manual Review) |
| EOF | `<!-- end-of-gap-and-contradiction-analysis -->` | skill (re-emitted) | Public append-anchor, last line of file |

Skill skeleton evolution (renumbering, renames, added sections) is tolerated as long as the anchor remains the last line.

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
