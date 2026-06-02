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

Create `agents/testgen/{TICKET-KEY}/analysis.md` in **two passes** — execute Pass 1 first, then Pass 2. Each pass is atomic and the order is fixed.

---

### Pass 1 — Skill-owned sections (authoritative template lives in the skill)

Sections 1–6 (Contradictions, Gaps, Ambiguities, Cross-Reference Analysis, Positive Findings, Risk Assessment) are produced by `gap-and-contradiction-analysis` per its `<output_format>`. This phase does NOT duplicate that template — refer to the skill for section structure, per-finding entry shape, and risk-tier conventions.

---

### Pass 2 — Testgen-specific append-only delta

Append **exactly two sections** to the END of the file produced by Pass 1, in this order:

1. **`## 7. Next Steps`** — three-bullet block about Phase 3 routing
2. **`## Analysis Metadata`** — bullet list of analysis provenance fields

Both sections together are shown verbatim in the fenced block below. The fence is the **complete append-only target** — copy everything between the fence markers verbatim (then fill the `[bracketed]` slots from the analysis). The fence is a **delta on top of the skill's output**, NOT the whole document template; do not duplicate sections 1–6 here.

**Append-only block (Pass 2 — COMPLETE verbatim target, both sections):**

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

**End of Pass 2 append-only block.** Nothing else is appended in Pass 2. If you find yourself adding a section here, it belongs to Pass 1's skill-owned set and is misplaced.

---

### Modifiers (apply to the document assembled by Pass 1 + Pass 2)

These are **not** additional sections to append — they are rules that modify how Pass 1's findings and Pass 2's append-only block are filled in.

**Modifier 1 — Zero-issues rule** (applies to Pass 1 + Pass 2 together):

- Pass 1 side: still produce sections 1–6 with explicit `No issues found.` text in each per the skill's `<output_format>` zero-issues rule. Do NOT omit empty sections.
- Pass 2 side: the append-only block is still appended; inside it, set `Total questions expected: 0` and replace the `Recommended: ...` line with `Proceed directly to Phase 4 — no clarification needed (per Phase 2 zero-issues outcome).`

**Modifier 2 — Finding-quality grounding** (applies to every entry inside Pass 1's sections 1–3 — Contradictions / Gaps / Ambiguities):

One positive / one negative pair kept inline so the rule survives even when the skill is not loaded; the skill's `<analysis_guidelines>` "Be Specific" rule remains authoritative.

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
