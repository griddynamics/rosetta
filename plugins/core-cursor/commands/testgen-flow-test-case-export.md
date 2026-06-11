---
name: testgen-flow-test-case-export
description: "Phase 6 Test Case Export of testgen-flow"
alwaysApply: false
user-invocable: false
baseSchema: docs/schemas/phase.md
---

# Test Generation Phase 6: Test Case Export

## Prerequisites

- Phase 5 MUST be complete
- `agents/testgen/{TICKET-KEY}/test-scenarios.md` exists with test cases
- User has reviewed and edited test cases
- TestRail MCP configured and accessible
- TestRail project_id and suite_id known

## Objective

Export test cases from test-scenarios.md to TestRail using MCP, creating a new section (folder) for the Jira ticket and adding all test cases.
If MCP is not available, ask user how to proceed and provide possible options.

## TestRail Configuration

**Default Configuration**: detect using current ticket and user profile.
**Section Name**: [TICKET-KEY] (e.g., "PROJ-123")

## Requirements

### Step 1: Verify TestRail Connection

**Test connection** using:
```python
mcp_testrail_get_project(project_id=69)
```

If fails, tell user:
```
❌ TestRail connection failed. Please verify:
1. TestRail MCP is configured
2. Credentials are correct
3. Project ID 69 exists and you have access
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
1. Go to: https://griddynamics.testrail.io/index.php?/suites/view/3300
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

### Step 5: Add Test Cases to TestRail

**For each mapped test case**:

```python
result = mcp_testrail_add_case(
    section_id=section_id,
    title=testrail_case["title"],
    priority_id=testrail_case["priority_id"],
    type_id=testrail_case["type_id"],
    refs=testrail_case["refs"],
    custom_steps_separated=testrail_case["custom_steps_separated"]
)
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

**Add TestRail IDs to each test case**:

```markdown
### TC-001: User Login with Valid Credentials (Happy Path)
**TestRail ID**: C12345 ✅
**TestRail Link**: https://griddynamics.testrail.io/index.php?/cases/view/12345
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
**Project**: 69
**Suite**: 3300
**Section**: [TICKET-KEY] (ID: [section_id])
**Total Exported**: [X] test cases
**TestRail Link**: https://griddynamics.testrail.io/index.php?/suites/view/3300&group_by=cases:section_id

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
- **Project ID**: 69
- **Suite ID**: 3300
- **Section ID**: [section_id]
- **Section Name**: [TICKET-KEY]
- **Test Cases Created**: [Count]
- **Test Cases Failed**: [Count]
- **TestRail Link**: [URL]
- **Status**: COMPLETE ✅
```

## Validation

Before completing Phase 6, verify:
- ✅ TestRail connection successful
- ✅ Section exists in TestRail
- ✅ All test cases parsed from markdown
- ✅ At least 80% of test cases exported successfully
- ✅ test-scenarios.md updated with TestRail IDs
- ✅ State file updated with Phase 6 complete
- ✅ TestRail link provided to user

## Tools Used

- `mcp_testrail_get_project(project_id)` - Verify connection
- `mcp_testrail_get_cases(project_id, suite_id)` - Check existing cases
- `mcp_testrail_add_case(section_id, title, ...)` - Create test cases
- `read_file()` - Read test-scenarios.md
- `write()` / `search_replace()` - Update files

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
**TestRail Link**: https://griddynamics.testrail.io/index.php?/suites/view/3300

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
- Suite ID 3300 is from user's TestRail URL
- Project ID 69 is user's default project
- Parameterized test data is included in step content or expected results
- Re-running export creates duplicate test cases (by design, to preserve history)
- Consider creating test run after export for immediate execution

