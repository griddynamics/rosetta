---
name: testgen-flow-test-case-export
description: Phase 6 of Test Generation - Export Test Cases
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# Test Generation Phase 6: Test Case Export

## Prerequisites

- Phase 5 MUST be complete
- `agents/testgen/{TICKET-KEY}/test-scenarios.md` exists with test cases
- User has reviewed and edited test cases
- **TestRail export path (B + A):** Either **guided** (TestRail MCP allowed per `mcp-capability-interaction.md` and `agents/mcp-capability.yaml`) or **questionnaire** (no TestRail MCP; user supplies IDs and performs or confirms manual import). Optional **`agents/user-instructions/mcp-guidance.md`** when guided.
- **Placeholder binding:** Before first guided **`{integration-action:*}`** call, ACQUIRE **`mcp-tool-resolution.md`**. For **`{agent-action:*}`** file steps, ACQUIRE **`agent-action-resolution.md`**. Canonical: **`instructions/r2/core/workflows/<basename>.md`** if KB alias fails.
- For **guided** runs: TestRail MCP configured and accessible; `project_id` and `suite_id` known (from guidance, state, or user).

## Objective

Export test cases from `test-scenarios.md` to TestRail.

- **Guided:** Use TestRail MCP to verify the project, resolve `section_id`, and create cases.
- **Questionnaire:** Do **not** run any **`{integration-action:testrail-*}`** call. Collect `project_id`, `suite_id`, and `section_id` from the user, write a **manual export pack** (copy-paste / CSV-friendly), and record completion when the user confirms import or pastes back TestRail case IDs.

If the interaction mode is unclear, resolve it in **Step 0** before any MCP call.

## TestRail Configuration

**Default Configuration**: detect using current ticket and user profile.
**Section Name**: [TICKET-KEY] (e.g., "PROJ-123")
**Web URL placeholders:** `{testrail-suite-view-url}`, `{testrail-case-view-url}`, and `{testrail-suite-cases-grouped-url}` stand in for full TestRail browser links (`https://` + host + `index.php?` paths + ids). Compose from `{TestRail instance host}`, `suite_id`, case id, and section grouping as in Step 1Q or `mcp-guidance.md`.

### Guided TestRail and workspace file actions (placeholders)

| Token | Intent |
|-------|--------|
| `{integration-action:testrail-get-project}` | Verify TestRail project access by `project_id` |
| `{integration-action:testrail-get-cases}` | List cases in a project/suite (optional dedup before add) |
| `{integration-action:testrail-add-case}` | Create a test case in a `section_id` with title, priority, type, refs, separated steps |
| `{agent-action:read-file}` | Read a workspace file (host-specific file tool) |
| `{agent-action:write-file}` | Create or overwrite a workspace file |
| `{agent-action:patch-file}` | Apply targeted edits to a workspace file (includes search-and-replace style edits) |

Resolve **`{integration-action:…}`** using **`mcp-tool-resolution.md`** (guided only). Resolve **`{agent-action:…}`** using **`agent-action-resolution.md`**.

## Requirements

### Step 0: Resolve TestRail MCP interaction (B + A)

1. ACQUIRE **`mcp-capability-interaction.md`** FROM KB. ACQUIRE **`mcp-tool-resolution.md`** before any **`{integration-action:*}`** MCP call (when **guided**). ACQUIRE **`agent-action-resolution.md`** before any **`{agent-action:*}`** workspace step. If KB alias fails, use **`instructions/r2/core/workflows/<basename>.md`**.
2. Read **`agents/mcp-capability.yaml`** if present; apply **user override** from the current task text (same rules as Phase 1).
3. Derive **`TestRail export: guided | questionnaire`**:
   - **`mcp.mode: absent`** → questionnaire.
   - **`mcp.mode: capable`** and **`mcp.testrail: false`** (when the key is present) → questionnaire.
   - **`mcp.mode: capable`** and (`testrail` omitted or `true`) → guided.
   - Missing YAML: use **user override** if any; else **one** short question (“Use TestRail MCP for export?”). **No** → questionnaire; **Yes** → guided and recommend adding `agents/mcp-capability.yaml`.
4. Record in `agents/testgen/{TICKET-KEY}/testgen-state.md` (Phase 6):
   - `TestRail export: guided | questionnaire`
   - `MCP interaction source:` (`agents/mcp-capability.yaml` | user override | default question`)
5. If **guided** and **`agents/user-instructions/mcp-guidance.md`** exists, read it before the first **`{integration-action:testrail-*}`** call.

### Step 1: Verify TestRail connection (guided only)

**If `TestRail export` is `questionnaire`:** Run **Step 1Q** instead of this step.

#### Step 1Q: Questionnaire — no MCP verification

1. Ask **numbered** questions: `project_id`, `suite_id` (for links and documentation), and confirm the user will import cases manually or paste back IDs after import.
2. **STOP** and **WAIT**.
3. Skip to **Step 2** (section_id flow is unchanged; user may already know `section_id`).

**Guided path — test connection** using (replace `project_id` with value from guidance/state/user; **do not** hard-code example IDs unless the user confirmed them):

```text
Action: {integration-action:testrail-get-project}
Parameters:
  project_id: <project_id>
```

If fails, tell user:
```
❌ TestRail connection failed. Please verify:
1. TestRail MCP is configured
2. Credentials are correct
3. Project ID exists and you have access
```

### Step 2: Create Section in TestRail

**IMPORTANT**: TestRail MCP does not have section creation function.

**Ask user for section_id**:
```
📁 TestRail Section Setup Required

To export test cases, I need a section_id from TestRail.

**Option A: Use existing section**
If you already have a section, provide the section_id.
You can find it in the URL when viewing a section (e.g., group_id=94686 or section_id=94686)

**Option B: Create new section**
1. Go to: {testrail-suite-view-url}
2. Click "Add Section" 
3. Name it: [TICKET-KEY] (e.g., "PROJ-456")
4. After creating, find the section_id in the URL or section details

Please provide: "section_id is XXXXX" or just the number

I'll wait for your confirmation.
```

**If user provides section_id directly**:
- Use that section_id
- Proceed with export

**Parse section_id from user response**:
- "section_id is 94686" → Use 94686
- "group_id=94686" → Use 94686
- "94686" → Use 94686
- Just a number → Use as section_id

### Step 3: Parse Test Cases from Markdown

**Read**: `agents/testgen/{TICKET-KEY}/test-scenarios.md`

**Parse each test case** (TC-001, TC-002, etc.):

```python
# Expected structure per test case:
{
    "id": "TC-001",
    "title": "User Login with Valid Credentials (Happy Path)",
    "type": "Happy Path",
    "priority": "P0",
    "preconditions": ["User account exists", "User is not logged in"],
    "steps": [
        {"step": 1, "content": "Navigate to login page", "expected": "Login page displayed"},
        {"step": 2, "content": "Enter valid email", "expected": "Email field populated"},
        {"step": 3, "content": "Enter valid password", "expected": "Password field masked"},
        {"step": 4, "content": "Click Login button", "expected": "User redirected to dashboard"}
    ],
    "test_data": [
        {"Email": "user@example.com", "Password": "Test1234!", "Expected Page": "Dashboard"}
    ],
    "related_requirements": ["US-1", "FR-1"],
    "notes": "Primary authentication flow"
}
```

**Parsing Rules**:
- Title: Text after "### TC-XXX: "
- Priority: Map P0→1, P1→2, P2→3, P3→4 (TestRail priority_id)
- Type: Map to TestRail type_id (typically: 1=Other, 2=Functional, 3=Regression, etc.)
- Steps: Parse numbered steps and their expected results
- Test Data: Parse table into structured format
- Preconditions: Convert to text block
- Traceability: Extract requirement IDs for refs field

### Step 4: Map to TestRail Format

**For each test case**, create TestRail format:

```python
# Build preconditions text (Test Data FIRST, then preconditions)
preconditions_text = build_preconditions(
    test_data=parsed_test.get("test_data"),
    preconditions=parsed_test.get("preconditions")
)

testrail_case = {
    "section_id": section_id,  # From Step 2
    "title": parsed_test["title"],
    "priority_id": map_priority(parsed_test["priority"]),  # P0=4, P1=3, P2=2, P3=1
    "type_id": map_type(parsed_test["type"]),  # Happy Path=1, Negative=7, etc.
    "refs": parsed_test["related_requirements"][0] if any else None,  # Jira ticket
    "custom_preconds": preconditions_text,  # Preconditions with Test Data FIRST
    "custom_steps_separated": [
        {
            "content": step["content"],
            "expected": step["expected"]
        }
        for step in parsed_test["steps"]
    ]
}
```

**Note**: If TestRail MCP doesn't support `custom_preconds` field directly:
- Prepend preconditions to the FIRST step's content:
```python
if preconditions_text:
    steps[0]["content"] = preconditions_text + "\n\n--- STEPS ---\n\n" + steps[0]["content"]
```

**Priority Mapping**:
| Our Priority | TestRail priority_id | TestRail Name |
|--------------|---------------------|---------------|
| P0 (Critical) | 4 | Critical |
| P1 (High) | 3 | High |
| P2 (Medium) | 2 | Medium |
| P3 (Low) | 1 | Low |

**Type Mapping** (verify with your TestRail config):
| Our Type | TestRail type_id | TestRail Name |
|----------|------------------|---------------|
| Happy Path | 1 | Functional |
| Negative | 7 | Negative |
| Edge Case | 6 | Boundary |
| Integration | 8 | Integration |
| Performance | 9 | Performance |
| Security | 10 | Security |

**Handle Preconditions with Test Data** (IMPORTANT ORDER):

When building the preconditions text for TestRail, use this structure:

```
1. TEST DATA (first - if exists)
2. Execution note (if parameterized)
3. Original preconditions
```

**Format for Preconditions field**:

```python
preconditions_text = ""

# 1. Test Data FIRST (if parameterized test)
if test_data_table:
    preconditions_text += "=== TEST DATA ===\n"
    preconditions_text += "Execute this test case for EACH row in the table below:\n\n"
    preconditions_text += format_table(test_data_table)  # Markdown table
    preconditions_text += "\n\n"

# 2. Original Preconditions
if preconditions:
    preconditions_text += "=== PRECONDITIONS ===\n"
    for p in preconditions:
        preconditions_text += f"- {p}\n"
```

**Example Output in TestRail Preconditions field**:

```
=== TEST DATA ===
Execute this test case for EACH row in the table below:

| Role    | Email              | Expected Result     |
|---------|--------------------|--------------------|
| Admin   | admin@test.com     | Access Granted     |
| Manager | manager@test.com   | Access Granted     |
| Viewer  | viewer@test.com    | Access Denied      |

=== PRECONDITIONS ===
- User is logged in
- User has valid session
- Feature flag is enabled
```

**Why this order**:
- Tester sees Test Data FIRST
- Immediately understands: "I need to run this 3 times"
- Then sees setup requirements
- Then proceeds to steps

**For non-parameterized tests** (no Test Data):
- Just include original preconditions normally
- No "Execute for EACH row" note

### Step 5: Add Test Cases to TestRail (guided only)

**If `TestRail export` is `questionnaire`:** Run **Step 5Q** only; **do not** run **`{integration-action:testrail-add-case}`**.

#### Step 5Q: Manual export pack (no MCP)

1. After **Step 4** mapping, write **`agents/testgen/{TICKET-KEY}/testrail-manual-export.md`** containing:
   - User-supplied `project_id`, `suite_id`, `section_id` (if known)
   - One block per test case: title, priority, type, refs, preconditions text, and steps (content + expected) in plain text or markdown tables suitable for copy-paste into TestRail.
2. Optionally add **`agents/testgen/{TICKET-KEY}/testrail-import-hints.csv`** (title, priority, type, refs, preconditions, steps_json) if the team uses CSV import.
3. **STOP** and **WAIT**: ask the user to confirm either (a) they created cases manually / imported the pack, or (b) they paste back a mapping `TC-001 → C12345` (or URLs).
4. **After the user replies**, execute **Step 6** to merge IDs into `test-scenarios.md`. Until then you may leave placeholders (e.g. `Pending`) only if the workflow must save intermediate files; do **not** mark Phase 6 complete in state until Step 6 reflects the user’s answer.

**Optional (guided only) — list existing cases before add:** If duplicate titles, re-exports, or unclear existing coverage are a concern, run **`{integration-action:testrail-get-cases}`** once against the target `project_id` / `suite_id` (and use section or other filters when your MCP supports them) to compare with parsed markdown. **Not required** for a first-time export or when the user accepts duplicates.

```text
Action: {integration-action:testrail-get-cases}
Parameters:
  project_id: <project_id>
  suite_id: <suite_id>
```

**Guided path — for each mapped test case**:

```text
Action: {integration-action:testrail-add-case}
Parameters:
  section_id: <section_id>
  title: <from testrail_case>
  priority_id: <from testrail_case>
  type_id: <from testrail_case>
  refs: <from testrail_case>
  custom_steps_separated: <from testrail_case>
Outcome: capture returned case id for results tracking
```

**Track results**:
```python
results = {
    "created": [],     # {"tc_id": "TC-001", "testrail_id": 12345}
    "failed": [],      # {"tc_id": "TC-002", "error": "..."}
    "skipped": []      # {"tc_id": "TC-003", "reason": "..."}
}
```

**Rate limiting**:
- Add small delay between API calls if needed (0.5s)
- TestRail may have API rate limits

**Error handling**:
- If single test case fails, log error and continue
- Don't stop entire export for one failure
- Report all failures at end

### Step 6: Update Test Scenarios Document

**Update**: `agents/testgen/{TICKET-KEY}/test-scenarios.md`

For **questionnaire** exports, use user-pasted IDs when available; otherwise keep **`TestRail ID`**: `Manual (see testrail-manual-export.md)`** until the user confirms. Use real `project` / `suite` / base URL values from Step 1Q or guidance — **do not** invent instance hostnames.

**Add TestRail IDs to each test case**:

```markdown
### TC-001: User Login with Valid Credentials (Happy Path)
**TestRail ID**: C12345 ✅
**TestRail Link**: {testrail-case-view-url}
**Related Requirement**: US-1, FR-1
...
```

**Add export summary at top**:

```markdown
# Test Cases - [TICKET-KEY]

**Generated**: [DateTime]
**Phase**: 5 - Test Case Generation
**Status**: EXPORTED TO TESTRAIL ✅

## TestRail Export Summary

**Exported**: [DateTime]
**Project**: {project_id}
**Suite**: {suite_id}
**Section**: [TICKET-KEY] (ID: [section_id])
**Total Exported**: [X] test cases
**TestRail Link**: {testrail-suite-cases-grouped-url}

| TC ID | TestRail ID | Status |
|-------|-------------|--------|
| TC-001 | C12345 | ✅ Created |
| TC-002 | C12346 | ✅ Created |
| TC-003 | - | ❌ Failed |

---
```

### Step 7: Update State File

**Update**: `agents/testgen/{TICKET-KEY}/testgen-state.md`

```markdown
## Phase Completion Status

- [x] Phase 1: Data Collection - Completed [Date]
- [x] Phase 2: Gap Analysis - Completed [Date]
- [x] Phase 3: Question Generation - Completed [Date]
- [x] Phase 4: Requirements Generation - Completed [Date]
- [x] Phase 5: Test Cases - Completed [Date]
- [x] Phase 6: TestRail Export - Completed [DateTime]

## Metrics

[...]
- Test Cases Exported: [Count]
- TestRail Section: [section_id]
- Export Failures: [Count]
[...]

## Phase Details

[...]

### Phase 6: TestRail Export
- **Completed**: [DateTime]
- **Project ID**: {project_id}
- **Suite ID**: {suite_id}
- **Section ID**: [section_id]
- **Section Name**: [TICKET-KEY]
- **Test Cases Created**: [Count]
- **Test Cases Failed**: [Count]
- **TestRail Link**: [URL]
- **Status**: COMPLETE ✅
```

## Validation

Before completing Phase 6, verify:

**Guided path:**
- ✅ TestRail connection successful (`{integration-action:testrail-get-project}` or equivalent)
- ✅ Section exists in TestRail (or user provided valid `section_id`)
- ✅ All test cases parsed from markdown
- ✅ At least 80% of test cases exported successfully via MCP (or failures documented)
- ✅ `test-scenarios.md` updated with TestRail IDs
- ✅ State file updated with Phase 6 complete
- ✅ TestRail link provided to user

**Questionnaire path:**
- ✅ Step 0 recorded `TestRail export: questionnaire` and source line
- ✅ User confirmed `project_id` / `suite_id` / `section_id` as needed
- ✅ `testrail-manual-export.md` (and optional CSV) written
- ✅ User confirmed manual import or pasted ID mapping
- ✅ `test-scenarios.md` updated with IDs or explicit “manual / pending” notes
- ✅ State file updated with Phase 6 complete

## Tools Used

- **Guided:** `{integration-action:testrail-get-project}` — verify connection; `{integration-action:testrail-get-cases}` — optional dedup; `{integration-action:testrail-add-case}` — create test cases
- **Questionnaire:** `{agent-action:read-file}` / `{agent-action:write-file}` / `{agent-action:patch-file}` only — build `testrail-manual-export.md` and update docs; **no** `{integration-action:testrail-*}` calls
- `{agent-action:read-file}` — read `test-scenarios.md`
- `{agent-action:write-file}` / `{agent-action:patch-file}` — update files

## Common Issues

**Issue**: TestRail authentication failed  
**Solution**: Verify MCP credentials, check TestRail API key

**Issue**: Section not found  
**Solution**: User creates section manually in TestRail UI

**Issue**: Invalid priority_id  
**Solution**: Verify priority mapping matches TestRail config

**Issue**: Invalid type_id  
**Solution**: Get valid type_ids from TestRail admin or use default (1)

**Issue**: custom_steps_separated format rejected  
**Solution**: Check TestRail field configuration, may need different format

**Issue**: Rate limit exceeded  
**Solution**: Add delay between API calls, batch requests

**Issue**: Risk of duplicate titles or unclear existing coverage  
**Solution**: Optionally run **`{integration-action:testrail-get-cases}`** (Step 5 optional block) before **`{integration-action:testrail-add-case}`** — optional discovery of existing cases, not a mandatory gate.

**Issue**: Test case already exists  
**Solution**: Create anyway (TestRail allows duplicates), note in report

## Next Phase

After Phase 6 completion:
```
🎉 REQUIREMENTS ANALYSIS & TESTRAIL EXPORT COMPLETE!

All 6 phases finished successfully:
✅ Phase 1: Data Collection ([X] sources)
✅ Phase 2: Gap Analysis ([Y] issues found)
✅ Phase 3: User Clarifications ([Z] questions answered)
✅ Phase 4: Requirements ([N] user stories, [M] requirements)
✅ Phase 5: Test Cases ([Q] test cases)
✅ Phase 6: TestRail Export ([R] cases exported)

**TestRail Section**: [TICKET-KEY]
**TestRail Link**: {testrail-suite-view-url}

**Deliverables**:
📄 requirements.md - Use for implementation
📄 test-scenarios.md - Test cases with TestRail links
🔗 TestRail - Test cases ready for execution

**Next Steps**:
1. Review test cases in TestRail
2. Create test runs from the section
3. Execute tests and log results
4. Link test results to Jira ticket
```

## Notes

- TestRail MCP currently lacks section creation - user must create manually
- Test case IDs in TestRail are prefixed with "C" (e.g., C12345)
- `{suite_id}` comes from the user, `mcp-guidance.md`, or the suite view URL on their instance
- `{project_id}` comes from the user, `mcp-guidance.md`, or the TestRail project settings
- Parameterized test data is included in step content or expected results
- Re-running export creates duplicate test cases (by design, to preserve history)
- Consider creating test run after export for immediate execution

