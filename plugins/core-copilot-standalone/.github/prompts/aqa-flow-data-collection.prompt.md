---
name: aqa-flow-data-collection
description: Phase 1 of AQA workflow - Data Collection 
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# Phase 1: Data Collection

## Objective

Gather everything needed for later phases: either from **TestRail and Confluence** (**integrated AQA**) or from **user-supplied artifacts** (**minimal-input / agent-led**). Always record the chosen **execution mode** in the test plan and state file.

## Prerequisites

- User intent is clear enough to start Phase 1 (IDs, URLs, or a plain-language automation goal).
- **Integrated AQA path**: For **guided** MCP interaction (see Task 0b), TestRail MCP and Atlassian (Confluence) MCP must be usable when you run Path A MCP steps. For **questionnaire** interaction, do **not** call those MCPs; collect the same facts via user answers and paste into the test plan.
- **Minimal-input path**: No MCP requirement for TestRail/Confluence; Task 0b **does not apply** to Path B for those integrations. If something on the checklist is missing, **ask** — do not guess.

## MCP capability reference

Resolve **guided vs questionnaire** per **`mcp-capability-interaction.md`** (ACQUIRE FROM KB). Config file: **`agents/mcp-capability.yaml`** (copy from `instructions/r2/core/templates/mcp-capability.example.yaml` in Rosetta repo). Optional guidance: **`agents/user-instructions/mcp-guidance.md`**.

## Phase Tasks

### Task 0: Confirm execution mode

**Actions**:
1. Check whether the **current task text** (or a prior user message in the same session the user instructs you to treat as binding) already names the mode **explicitly**, using any of these (case-insensitive): `integrated`, `minimal-input`, `minimal input`, `Integrated AQA`, or `minimal-input / agent-led`. The token must be **user-authored** in that message (not something you paraphrase or infer). If yes, set the mode to `integrated` or `minimal-input` accordingly and **skip steps 2–3**; go directly to **Path A** or **Path B** matching that mode.
2. If **not** explicit: **Do not infer** mode from clues such as missing TestRail IDs, presence of HTML attachments, “sandbox,” “no MCP,” or vague phrases like “I don’t have TestRail yet.” **Forbidden:** choosing `minimal-input` because TestRail was omitted, the repo looks small, or the user only supplied local HTML—those are **not** mode labels. Informal phrases (“lightweight,” “without TestRail,” “bring my own selectors”) **do not** count as explicit; they still require steps 2–3. **Ask once** with both options, for example:
   - **Integrated AQA**: "We pull the official case and docs from TestRail/Confluence and follow the full chain."
   - **Minimal-input / agent-led**: "You provide URLs, page source or a selector map, scenario and expectations; we still run phases 2–8 in order but Phase 1 records your package instead of MCP pulls."
3. **STOP** and **WAIT** until the user replies with a clear **integrated** or **minimal-input** (or the spelled labels in step 1). If the reply is still ambiguous, ask **one** narrowing question that still requires those labels; **do not** choose a path without those words from the user.
4. **Hard gate — before Path A or Path B:** Do **not** create or update `agents/plans/aqa-*.md`, do **not** write `**AQA execution mode**` in any artifact, and do **not** mark Phase 1 complete in `agents/aqa-state.md` until step **1** matched or step **3** completed. If you already started Path A/B without satisfying Task 0, **stop**, discard partial mode lines, run steps 2–3, then continue.
5. Ensure the Phase 1 test plan created in Path A or Path B includes `**AQA execution mode**` and that `agents/aqa-state.md` reflects the mode when Phase 1 is marked complete (see **Update State File** below).

**Expected Output**: Mode is either read from **explicit user keywords** (step 1) or obtained only after **mandatory** ask-and-wait (steps 2–3); then proceed with **Path A** or **Path B** (not both).

---

### Task 0b: Resolve MCP interaction (Path A only)

**Skip this entire task for Path B (minimal-input).**

**Actions**:
1. ACQUIRE **mcp-capability-interaction.md** FROM KB (if not already loaded this phase).
2. Read **`agents/mcp-capability.yaml`** if it exists; apply **user override** rules from that fragment (task text beats file). If file missing and user has not overridden, ask **one** yes/no: “Use live MCP for TestRail/Confluence in this workspace?” — **WAIT**; treat **No** as questionnaire, **Yes** as guided for both integrations until a YAML file exists.
3. Derive **per integration** (TestRail vs Confluence) whether the source is **guided** (MCP allowed) or **questionnaire** (no MCP): if `mcp.mode` is `absent`, both are **questionnaire**; if `capable`, use `mcp.testrail` / `mcp.atlassian_confluence` when present (boolean); if a key is **omitted** under `capable`, default that integration to **guided**.
4. Record in the test plan and `agents/aqa-state.md` Phase 1 notes: `TestRail source: guided|questionnaire`, `Confluence source: guided|questionnaire`, plus `MCP interaction source:` (`agents/mcp-capability.yaml` | user override | default question`).
5. **Questionnaire leg:** For each integration still **questionnaire** and not yet documented in the plan, run **one** numbered questionnaire (combine TestRail + Confluence in a single message if both need data). **STOP** and **WAIT**. Merge answers under **User-provided (MCP absent) — TestRail** and/or **User-provided (MCP absent) — Confluence** in the working plan (or append to the plan draft before Task A3).
6. **Guided leg:** If **`agents/user-instructions/mcp-guidance.md`** exists and at least one integration is **guided**, read it before the first MCP call for a **guided** integration. Then continue to Task A1 / A2 and follow the **guided** branches there only.

**Expected Output**: TestRail and Confluence are each classified **guided** or **questionnaire**; questionnaire content is captured before MCP calls; no MCP call runs for a **questionnaire** integration.

---

### Path A — Integrated AQA (TestRail + Confluence)

**Prerequisite:** Task 0 already set execution mode to **integrated** (step 1 keyword match or step 3 user reply). Do not enter Path A without that.

### Task A1: Read TestRail Test Case

**Actions**:
- **If Task 0b resolved questionnaire for TestRail:** Ensure the test plan already contains **User-provided (MCP absent) — TestRail** content from Task 0b. If missing, **STOP**, ask numbered questions (case ID for traceability, title, steps, expected results, preconditions), **WAIT**, merge into the plan. **Do not** call `user-testrail-get_case`. Skip the guided-only steps below for TestRail.
- **If Task 0b resolved guided for TestRail:** Perform steps 1–4.

1. Ask user for TestRail test case ID if not provided
2. Use TestRail MCP to retrieve test case details:
   ```
   Use: user-testrail-get_case with case_id
   ```
3. Extract key information:
   - Test case ID and title
   - Test description
   - Preconditions
   - Test steps (step-by-step actions)
   - Expected results for each step
   - Overall test goal
   - Priority and test type
4. Document findings in test plan file

**Expected Output**: Complete understanding of what needs to be tested according to TestRail.

### Task A2: Read Confluence Documentation

**Actions**:
- **If Task 0b resolved questionnaire for Confluence:** Ensure the test plan contains **User-provided (MCP absent) — Confluence** content from Task 0b. If missing, **STOP**, ask numbered questions (URLs, pasted excerpts, or summaries the user authorizes), **WAIT**, merge into the plan. **Do not** call `user-mcp-atlassian-confluence_*`. Skip guided-only steps below for Confluence.
- **If Task 0b resolved guided for Confluence:** Perform steps 1–5.

1. Ask user for Confluence page ID/URL or search terms if not provided
2. Use Atlassian Confluence MCP to find related documentation:
   ```
   Use: user-mcp-atlassian-confluence_search with query
   Or: user-mcp-atlassian-confluence_get_page with page_id
   ```
3. Extract relevant information:
   - Feature description and purpose
   - Business context and user flows
   - Technical specifications
   - UI/UX requirements
   - Integration points
   - Known limitations or constraints
4. Cross-reference with TestRail test case
5. Document findings in test plan file

**Expected Output**: Business and technical context for the feature being tested.

### Task A3: Create initial test plan document (integrated)

**Actions**:
1. Create `agents/plans/aqa-<test-name>.md` file with:
   - **AQA execution mode**: `integrated`
   - Test case reference (TestRail ID and link)
   - Feature name and description
   - Test goal
   - Expected results summary
   - Confluence references
   - Initial understanding of test scope
2. Structure document for additions in subsequent phases

**Template**:
```markdown
# AQA Test Plan - <Test Name>

**Created**: [DateTime]
**AQA execution mode**: integrated
**TestRail Case**: [ID/URL]
**Feature**: [Feature Name]
**Status**: Phase 1 Complete

## Test Case Information

### Source
- TestRail Case: [ID]
- Confluence: [Page URLs]

### Test Goal
[What is being tested and why]

### Preconditions
[List preconditions from TestRail]

### Test Steps
1. [Step 1]
   - Expected: [Result]
2. [Step 2]
   - Expected: [Result]
...

### Expected Overall Result
[Final expected outcome]

## Feature Context

### Business Purpose
[From Confluence - why this feature exists]

### Technical Details
[From Confluence - how it works]

### User Flow
[From Confluence - user journey]

## Notes
- [Any observations or questions]

---
## Phase 2: Requirements Clarification
[To be filled in Phase 2]

## Phase 3: Code Analysis
[To be filled in Phase 3]

## Phase 4: Selector Identification
[To be filled in Phase 4]

## Phase 5: Selector Implementation
[To be filled in Phase 5]

## Phase 6: Test Implementation
[To be filled in Phase 6]
```

---

### Path B — Minimal-input / agent-led

**Prerequisite:** Task 0 already set execution mode to **minimal-input** (step 1 keyword match or step 3 user reply). Do not enter Path B because TestRail was missing or files were attached—only because the user chose **minimal-input** in text.

### Task B1: Offer agent-led implementation and required artifacts

**Actions**:
1. Tell the user clearly that the agent **can** implement the test **without** TestRail/Confluence **if** they provide enough grounded detail — but the agent **must not** invent pages, selectors, or flows.
2. List what you still need at minimum (see Task B2 checklist). **WAIT** until the user either supplies items or explicitly defers an item to Phase 2 (then note "open in Phase 2" in the plan).

**Expected Output**: User understands the tradeoff and what to supply (or what is deferred to Phase 2 with explicit consent).

### Task B2: Collect minimal-input package

**Actions**:
1. Capture the following in the test plan (fill or mark *deferred to Phase 2* with user agreement):
   - **Scenario / goal**: What behavior the automated test must prove (plain language).
   - **Entry / URLs**: Starting URL(s) or navigation path to reach the UI under test.
   - **UI grounding** (at least one required before ending Phase 1 unless user explicitly defers to Phase 2): e.g. saved page source or DOM snapshot paths, a **selector map** (purpose → locator), pointers to existing Page Objects in the repo, and/or frontend file paths the agent will use in Phase 3.
   - **Preconditions and test data**: Accounts, feature flags, seed data — or *unknown — Phase 2*.
   - **Optional**: TestRail/Confluence IDs "for traceability only" without MCP — record as references, not as substitute for missing UI grounding.
2. **Do not** mark Phase 1 complete if UI grounding and scenario goal are both missing and the user has not agreed to defer.

**Expected Output**: Minimal-input checklist documented in the test plan.

### Task B3: Create initial test plan document (minimal-input)

**Actions**:
1. Create `agents/plans/aqa-<test-name>.md` using the template below (adapt section headings if the scenario is small).
2. For TestRail/Confluence fields, use `N/A` or optional reference links — do not pretend MCP data exists.

**Template**:
```markdown
# AQA Test Plan - <Test Name>

**Created**: [DateTime]
**AQA execution mode**: minimal-input
**TestRail Case**: [N/A or ID for traceability only]
**Confluence**: [N/A or links for traceability only]
**Feature**: [Feature Name]
**Status**: Phase 1 Complete

## Minimal-input package

### Scenario / goal
[What the test must validate]

### Entry and navigation
- URLs: [...]
- Steps to reach the UI: [...]

### UI grounding
- Page source / DOM snapshots: [paths or attach instructions]
- Selector map or locators: [...]
- Repo pointers (Page Objects / components): [...]

### Preconditions and test data
[Or: deferred to Phase 2 — user confirmed]

### Notes and open questions
- [...]

## Test Case Information (synthetic)

### Test Steps (draft)
1. [Step — can be refined in Phase 2]
...

### Expected Overall Result
[Draft — refined in Phase 2]

---
## Phase 2: Requirements Clarification
[To be filled in Phase 2]

## Phase 3: Code Analysis
[To be filled in Phase 3]

## Phase 4: Selector Identification
[To be filled in Phase 4]

## Phase 5: Selector Implementation
[To be filled in Phase 5]

## Phase 6: Test Implementation
[To be filled in Phase 6]
```

## Completion Criteria

**All modes**
- [ ] Task 0 complete: execution mode is **either** named by explicit user keywords (`integrated` / `minimal-input` / spelled equivalents) **or** obtained after the mandatory ask-and-wait; mode recorded in test plan and state
- [ ] Test plan file `agents/plans/aqa-<test-name>.md` created
- [ ] Test goal clearly understood (or explicitly deferred to Phase 2 with user consent)
- [ ] `agents/aqa-state.md` updated with Phase 1 completion

**Integrated AQA only**
- [ ] TestRail test case retrieved and documented
- [ ] Confluence documentation retrieved and documented
- [ ] Expected results from sources documented

**Minimal-input only**
- [ ] Minimal-input checklist captured in the test plan
- [ ] UI grounding present or explicitly deferred to Phase 2 with user approval

## Update State File

After completing Phase 1, update `agents/aqa-state.md`:

```markdown
### Phase 1: Data Collection
- Completed: [DateTime]
- Execution mode: [integrated | minimal-input]
- TestRail Case: [ID/URL or N/A]
- Confluence Pages: [URLs or N/A]
- Minimal-input checklist: [brief summary or N/A]
- Test Goal: [Brief description]
- Expected Result: [Brief description]
- Test Plan File: agents/plans/aqa-<test-name>.md
```

Mark Phase 1 as completed and Phase 2 as current.

## Next Phase

Proceed to **Phase 2: Requirements Clarification** by executing:
```
ACQUIRE aqa-phase2-md FROM KB
```

## Important Notes

- **No Assumptions**: If data is incomplete for the chosen mode, note it in the test plan and ask — never guess selectors or flows.
- **Ask Questions**: If user hasn't provided IDs/URLs (integrated) or checklist items (minimal-input), ask for them.
- **Document Everything**: Capture all details even if they seem minor.
- **Integrated path only**: Cross-reference TestRail and Confluence information for alignment.
- **Minimal-input path**: Prefer an explicit **selector map** or page source over vague descriptions; deferrals must be user-visible in the plan.
- **Task 0**: Never infer execution mode from context; only explicit keywords or a user reply after the mandatory question count.
