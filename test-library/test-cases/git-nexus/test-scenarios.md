# Test Cases - CTORNDGAIN-1494

**Generated**: 2026-05-25 18:22
**Phase**: 5 - Test Case Generation
**Jira Ticket**: CTORNDGAIN-1494 — [QA] Validate GitNexus Integration
**Status**: READY FOR REVIEW
**Format**: TestRail-compatible

---

## Document Control


| Version | Date       | Author   | Changes                                                                                                                                                                                                            |
| ------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0     | 2026-05-25 | AI Agent | Generated from validated requirements (Phases 0-4)                                                                                                                                                                 |
| 1.1     | 2026-05-27 | AI Agent | PR #92 review fixes: removed gain.json tests (TC-009, TC-011, TC-012), added MCP config verification, broadened GitNexus tool checks, added local/plugin mode tests (TC-021, TC-022), specified supported AI tools |
| 1.2     | 2026-06-02 | AI Agent | Added mode applicability matrix (MCP vs Plugin). Marked TC-004, TC-005, TC-010 as Plugin only — hooks not supported in MCP mode |
| 1.3     | 2026-06-02 | AI Agent | Added concrete test data examples (functions, file paths, rename targets) sourced from GitNexus knowledge graph for PROJECT `ecommerce-spring-reactjs` |
| 1.4     | 2026-06-02 | AI Agent | Removed TC-017 (CLI status). Changed TC-019 (rename) to Plugin only — graph refresh after edit relies on hooks |
| 1.5     | 2026-06-02 | AI Agent | Merged TC-007 into TC-001 (cold install superset). Merged TC-022 into TC-004 (duplicate plugin-mode edit→check). Removed stale TC-015/FR-8 refs. 16 → 14 test cases |
| 1.6     | 2026-06-02 | AI Agent | Merged TC-013 into TC-001 step 14 (self-discovery now tested without GitNexus prompt). Removed TC-014 (GitNexus feature, not Rosetta integration). 14 → 12 test cases |
| 1.7     | 2026-06-02 | AI Agent | Removed TC-021 — commit-based reindex relies on hooks; hooks not supported in MCP mode; Plugin scenario already covered by TC-004. 12 → 11 test cases |


---

## Executive Summary

**Total Test Cases**: 11
**Merged/Optimized**: 26 → 11 (reduced by 58%)
**Coverage**:

- User Stories: 6 / 6 covered (US-5 removed — `gain.json` integration not implemented)
- Functional Requirements: 7 / 7 covered (FR-5 removed — `gain.json` integration not implemented; FR-8 removed — not applicable)
- Non-Functional Requirements: 4 / 4 covered

**Priority Breakdown**:

- P0 (Critical): 6
- P1 (High): 2
- P2 (Medium): 2
- P3 (Low): 1

**Test Types**:

- Happy Path: 5
- Negative Tests: 2
- Edge Cases: 2
- Integration Tests: 2

---

## Glossary


| Term                    | Meaning                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ |
| **PROJECT**             | The actual test repository. All test cases are project-agnostic                      |
| **GitNexus**            | Code-graph intelligence tool. Builds a semantic knowledge graph from source code     |
| **MCP**                 | Model Context Protocol — connects AI agents to external tools via STDIO transport    |
| `**.gitnexus/`**        | Local directory containing the code index. Not committed to git                      |
| **init-workspace-flow** | Rosetta's 9-phase workspace initialization workflow                                  |
| **PostToolUse hook**    | Auto-installed hook that triggers graph refresh after agent edits a file             |
| **CONTEXT.md**          | Documentation file telling AI agents what tools/skills are available                 |
| **Debounce**            | Mechanism that coalesces rapid events into a single action after a delay (5 seconds) |


---

## Test Execution Notes for QA

### Recommended execution order

Run test cases in this order to build up the required preconditions naturally:

1. **TC-016** — Static code review (no setup needed)
2. **TC-001** — Full init with opt-in (sets up everything end-to-end)
3. **TC-002** — MCP auto-start verification
4. **TC-003** — Graph query verification
5. **TC-004** — Hook trigger + graph update + plugin mode index behavior
6. **TC-005** — Async non-blocking
7. **TC-010** — Debounce coalescing
8. **TC-019** — Rename flow
9. **TC-020** — detect_changes flow
10. **TC-006** — Failure isolation (kills GitNexus — do last among runtime tests)
11. **TC-008** — Opt-in decline (needs clean state)

## Environment Requirements


| Requirement                                             | How to verify                                          |
| ------------------------------------------------------- | ------------------------------------------------------ |
| Node.js installed (v18+)                                | Run `node --version` in terminal                       |
| `npx` available                                         | Run `npx --version` in terminal                        |
| Git installed                                           | Run `git --version` in terminal                        |
| PROJECT is a git repository with source code            | Run `git status` in PROJECT root                       |
| Rosetta v3 is configured (v3 branch with PR #84 merged) | Check `instructions/r3/core/` directory exists         |
| AI agent tool installed with MCP support                | Open the agent tool, check MCP settings are accessible |


### Clean state checklist (before test run)

1. Remove `.gitnexus/` directory from PROJECT: `rm -rf .gitnexus/`
2. Remove GitNexus MCP entry from global agent config (if exists)
3. Remove any previously generated `CONTEXT.md` GitNexus section
4. Verify no `gitnexus` process is running: `ps aux | grep gitnexus`
5. Remove `/docs` folder

---

## Priority 0 Test Cases (Critical)

---

### TC-001 [MCP][Plugin]: GitNexus opt-in and cold install — full end-to-end (Happy Path)

**Related Requirement**: FR-1, FR-2, FR-6, US-1, US-7
**Type**: Integration
**Priority**: P0

**Preconditions**:

- PROJECT is a git repo with source code
- No `.gitnexus/` directory exists
- No `docs` folder
- No GitNexus MCP config in global agent settings
- No previous Rosetta init has been run (or state has been cleaned)
- Rosetta v3 is configured
- Node.js and `npx` are available

**Steps**:

1. Verify clean state: `ls .gitnexus/` returns error, no GitNexus MCP config exists
2. Open AI agent tool on PROJECT
3. Start a new agent chat session
4. Trigger init-workspace-flow on PROJECT
5. Wait for phases 1-5 to complete
6. When Phase 6 asks "Install GitNexus for enhanced code-graph navigation? (recommended)" — answer **Yes**
7. Observe the agent executing GitNexus setup commands
8. Wait for all phases to complete (through Phase 9 — Verification)
9. Verify `.gitnexus/` directory exists: `ls -la .gitnexus/`
10. Open `CONTEXT.md` and search for "GitNexus"
11. Verify GitNexus MCP is registered: check MCP settings for `gitnexus · ✔ connected`
12. **[Plugin only]** Check the agent tool hook settings / UI for PostToolUse hook presence
13. Start a NEW agent chat session (as recommended by Phase 9)
14. Ask the agent — without mentioning "GitNexus" — a question that benefits from code graph intelligence: "What functions call [a known function in PROJECT] and what would break if I changed it?"
    > **Example**: `"What functions call convertToResponse and what would break if I changed it?"` — `convertToResponse` in `CommonMapper.java` has 10 callers across 5 mapper files and participates in 22 execution flows

**Expected Results**:

- After step 6: Agent runs `npx gitnexus@latest analyze --skip-agents-md`
- After step 6: Agent runs `npx gitnexus@latest setup`
- After step 7: Both commands complete without errors
- After step 8: Phase 9 verification passes. Phase 6 logged as "installed" in state file
- After step 9: `.gitnexus/` directory exists with index files
- After step 10: CONTEXT.md contains "GitNexus is installed. USE SKILL `gitnexus-tools`... USE SKILL `gitnexus-cli`..."
- After step 11: GitNexus MCP server is connected. Running `/mcp` shows `gitnexus · ✔ connected`
- After step 12 **[Plugin only]**: PostToolUse hook is installed and visible in the hook settings. The hook is configured to trigger GitNexus graph refresh on file edits
- After step 14: The agent reads CONTEXT.md, autonomously discovers and uses GitNexus MCP tools without being prompted, and returns code graph data (callers, blast radius, affected processes) — confirming end-to-end installation and CONTEXT.md-driven self-discovery

**Traceability**:

- **User Story**: US-1 (GitNexus opt-in), US-6 (CONTEXT.md discovery), US-7 (Cold install)
- **Acceptance Criterion**: AC1, AC2, AC3, AC5
- **Functional Requirement**: FR-1, FR-2, FR-6

**Notes**: This is the foundation test — most subsequent test cases depend on this passing first. Validates the full documented install path from a clean checkout. Step 14 also covers CONTEXT.md self-discovery (absorbed from TC-013).

---

### TC-002 [MCP][Plugin]: GitNexus MCP auto-starts and reports healthy connection (Happy Path)

**Related Requirement**: FR-1, US-1, NFR-3
**Type**: Happy Path
**Priority**: P0

**Preconditions**:

- TC-001 passed (GitNexus installed and MCP registered)

**Steps**:

1. Close the agent tool completely (full quit, not just close window)
2. Reopen the agent tool on PROJECT
3. Open agent tool MCP settings
4. Locate GitNexus in the MCP server list
5. Check the connection status indicator
6. Start a new agent chat session
7. Ask the agent: "Use GitNexus query tool to search for [a known function in PROJECT]"
   > **Example**: `"Use GitNexus query tool to search for findPerfumesByFilterParams"`
8. Observe whether the tool call succeeds
9. **[Plugin only]** Check the agent tool hook settings / UI for PostToolUse hook presence

**Expected Results**:

- After step 4: GitNexus appears in the MCP server list
- After step 5: Status shows GitNexus as connected/active
- After step 8: Any GitNexus tool (e.g., `query`, `context`, `impact`, `detect_changes`, `rename`, or `cypher`) returns results without errors. This confirms healthy handshake (Assumption A-1)
- After step 9 **[Plugin only]**: PostToolUse hook is installed and visible in the hook settings. The hook is configured to trigger GitNexus graph refresh on file edits

**Traceability**:

- **User Story**: US-1
- **Acceptance Criterion**: AC4
- **Functional Requirement**: FR-1

**Notes**: Validates that after opt-in, GitNexus auto-starts on subsequent sessions without re-prompting.

---

### TC-003 [MCP][Plugin]: Initial graph build produces queryable knowledge graph (Happy Path)

**Related Requirement**: FR-2, US-2
**Type**: Happy Path
**Priority**: P0

**Preconditions**:

- TC-001 passed (`.gitnexus/` directory exists)
- GitNexus MCP is connected

**Steps**:

1. Open terminal in PROJECT root
2. Run `npx gitnexus@latest status`
3. Note the symbol count and relationship count
4. Open a new agent chat session
5. Ask: "Use GitNexus query tool to search for [a known function in PROJECT]"
   > **Example**: `"Use GitNexus query tool to search for findPerfumesByFilterParams"`
6. Review the query response
7. Ask: "Use GitNexus context tool to get details about [same function]"
   > **Example**: `"Use GitNexus context tool to get details about findPerfumesByFilterParams"`
8. Review the context response
9. Ask: "Use GitNexus impact tool to show what depends on [same function] upstream"
   > **Example**: `"Use GitNexus impact tool to show what depends on findPerfumesByFilterParams upstream"`
10. Review the impact response

**Expected Results**:

- After step 2: Status reports the repo as indexed, symbol count > 0, relationship count > 0
- After step 6: Query returns at least 1 symbol match and associated processes
- After step 8: Context returns callers, callees, and processes the symbol participates in
- After step 10: Impact returns upstream dependencies with depth levels

**Traceability**:

- **User Story**: US-2
- **Acceptance Criterion**: AC1, AC2, AC3, AC4
- **Functional Requirement**: FR-2

---

### TC-004 [Plugin]: File edit triggers hook and graph reflects changes immediately (Happy Path)

**Related Requirement**: FR-2, FR-3, US-2, US-3, NFR-1
**Type**: Happy Path
**Priority**: P0
**Applicability**: Plugin only — skip for MCP mode (hooks not supported)

**Preconditions**:

- TC-002 passed (GitNexus MCP is connected)
- Rosetta is running in **plugin mode** (IDE plugin)
- PROJECT has a source file with a known function in the index

**Steps**:

1. Open a new agent chat session on PROJECT
2. Verify a known function exists in the graph: "Use GitNexus context for [known function]"
   > **Example**: `"Use GitNexus context for findPerfumesByFilterParams"`
3. Confirm the function appears with its relationships
4. Ask the agent to add a new function to the same file: "Add a new function called `testHookFunction` to [file path] that calls [known function]"
   > **Example**: `"Add a new function called testHookFunction to src/main/java/com/gmail/merikbest2015/ecommerce/service/Impl/PerfumeServiceImpl.java that calls findPerfumesByFilterParams"`
5. Do NOT commit the change
6. Wait 15 seconds (debounce window is 5 seconds + processing time)
7. Check debug logs or agent tool hook UI for evidence the PostToolUse hook fired
8. Ask: "Use GitNexus context for `testHookFunction`"
9. Observe whether the new function appears in the graph

**Expected Results**:

- After step 3: Known function exists in the graph
- After step 4: Agent successfully edits the file
- After step 7: Debug logs or hook UI show that the PostToolUse hook fired after the file edit
- After step 8-9: `testHookFunction` appears in the graph with its relationship to [known function]. No commit was required and no editor restart was needed — index updated immediately after code modification via hooks

**Traceability**:

- **User Story**: US-2, US-3
- **Acceptance Criterion**: AC1, AC3, AC5
- **Functional Requirement**: FR-2, FR-3
- **Non-Functional Requirement**: NFR-1

**Notes**: Validates the key plugin-mode behavior: file edits trigger the PostToolUse hook, which refreshes the graph in real time without requiring a commit. This is the behavioral difference from MCP mode (see TC-021).

---

### TC-005 [Plugin]: Async refresh does not block the agent (Happy Path)

**Related Requirement**: FR-3, US-3, NFR-1
**Type**: Happy Path
**Priority**: P0
**Applicability**: Plugin only — skip for MCP mode (hooks not supported)

**Preconditions**:

- TC-002 passed (GitNexus MCP is connected)

**Steps**:

1. Open a new agent chat session on PROJECT
2. Ask the agent to make a large edit: "Add 5 new functions to [file path]: `funcA`, `funcB`, `funcC`, `funcD`, `funcE`, each with a simple return statement"
   > **Example**: `"Add 5 new functions to src/main/java/com/gmail/merikbest2015/ecommerce/service/Impl/PerfumeServiceImpl.java: funcA, funcB, funcC, funcD, funcE, each with a simple return statement"`
3. Immediately after the edit completes (within 2-3 seconds, before debounce fires), ask the agent: "Read the file [another file in PROJECT] and explain what it does"
   > **Example**: `"Read the file src/main/java/com/gmail/merikbest2015/ecommerce/controller/PerfumeController.java and explain what it does"`
4. Observe whether the agent responds to the second request without waiting
5. Note the response time for the read/explain request

**Expected Results**:

- After step 2: Agent completes the edit
- After step 3-4: Agent starts responding to the read/explain request immediately. It does NOT say "waiting for GitNexus" or hang
- After step 5: Response time is comparable to normal (agent is not blocked by background refresh)

**Traceability**:

- **User Story**: US-3
- **Acceptance Criterion**: AC2
- **Non-Functional Requirement**: NFR-1

---

### TC-006 [MCP][Plugin]: GitNexus failure does not break Rosetta core tools (Negative)

**Related Requirement**: FR-4, US-4, NFR-2
**Type**: Negative
**Priority**: P0

**Preconditions**:

- TC-002 passed (GitNexus MCP is connected and working)

**Steps**:

1. Open a new agent chat session on PROJECT
2. Verify GitNexus works: "Use GitNexus context to search for [a known function]"
   > **Example**: `"Use GitNexus context to search for findPerfumesByFilterParams"`
3. Confirm the context returns results
4. Open terminal and find the GitNexus process: `ps aux | grep gitnexus`
5. Kill the GitNexus process: `kill -9 [PID]`
6. In the same agent chat, ask the agent to perform a Rosetta core task: "Read the file [file path] and explain it"
   > **Example**: `"Read the file src/main/java/com/gmail/merikbest2015/ecommerce/controller/AdminController.java and explain it"`
7. Observe whether the agent completes the task normally
8. Ask the agent: "Use GitNexus context to search for [same function]"
   > **Example**: `"Use GitNexus context to search for findPerfumesByFilterParams"`
9. Observe the error handling

**Expected Results**:

- After step 3: GitNexus query works normally
- After step 5: GitNexus process is killed
- After step 6-7: Agent successfully completes the Rosetta core task (file reading, code analysis). No crash, no hang, no cascading failure
- After step 8-9: Agent reports that the MCP tool call failed. Rosetta core tools remain fully functional

**Traceability**:

- **User Story**: US-4
- **Acceptance Criterion**: AC1, AC2, AC3
- **Functional Requirement**: FR-4
- **Non-Functional Requirement**: NFR-2

---

## Priority 1 Test Cases (High)

---

### TC-008 [MCP][Plugin]: GitNexus opt-in during init — user declines (Negative)

**Related Requirement**: FR-6, US-1, US-6
**Type**: Negative
**Priority**: P1

**Preconditions**:

- PROJECT is a git repo with no `.gitnexus/` directory
- Rosetta v3 is configured

**Steps**:

1. Open AI agent tool on PROJECT
2. Trigger init-workspace-flow
3. When Phase 6 asks about GitNexus — answer **No**
4. Wait for Phase 7 (Documentation) to complete
5. Check if `.gitnexus/` exists: `ls .gitnexus/`
6. Open `CONTEXT.md` and search for "GitNexus", "gitnexus-tools", "gitnexus-cli"
7. **[Plugin only]** Check the agent tool hook settings / UI — verify no PostToolUse hook is present

**Expected Results**:

- After step 3: Agent logs GitNexus as "skipped" in state, moves to Phase 7
- After step 5: `.gitnexus/` directory does NOT exist
- After step 6: NONE of the GitNexus strings appear in CONTEXT.md
- After step 7 **[Plugin only]**: No PostToolUse hook is installed — declining GitNexus leaves zero trace, including hooks

**Traceability**:

- **User Story**: US-1 (AC3), US-6 (AC3)
- **Functional Requirement**: FR-6

**Notes**: Validates the opt-in nature — declining leaves zero trace.

---

### TC-010 [Plugin]: Debounce coalescing — rapid edits produce single refresh (Edge Case)

**Related Requirement**: FR-3, US-3, NFR-4
**Type**: Edge Case
**Priority**: P1
**Applicability**: Plugin only — skip for MCP mode (hooks not supported)

**Preconditions**:

- TC-002 passed (GitNexus MCP is connected)
- PostToolUse hook is installed

**Steps**:

1. Open a new agent chat session on PROJECT
2. Ask the agent to make rapid sequential edits to 3 different files: "Add a comment `// debounce-test-1` to [file_1], then `// debounce-test-2` to [file_2], then `// debounce-test-3` to [file_3]"
   > **Example**: `"Add a comment // debounce-test-1 to src/main/java/com/gmail/merikbest2015/ecommerce/controller/AdminController.java, then // debounce-test-2 to src/main/java/com/gmail/merikbest2015/ecommerce/service/Impl/PerfumeServiceImpl.java, then // debounce-test-3 to src/main/java/com/gmail/merikbest2015/ecommerce/mapper/PerfumeMapper.java"`
3. After all edits complete, check debug logs or agent tool hook UI for refresh activity
4. Count the number of refresh operations that occurred
5. Wait 15 seconds for refresh to complete
6. Query GitNexus to verify all changes are reflected

**Expected Results**:

- After step 2: Agent completes all 3 edits within a few seconds
- After step 3-4: Only 1 coalesced refresh operation occurred (NOT 3 separate ones)
- After step 6: All 3 files' changes are reflected in the graph

**Traceability**:

- **User Story**: US-3 (AC4)
- **Functional Requirement**: FR-3
- **Non-Functional Requirement**: NFR-4

**Notes**: The debounce window is 5 seconds. Edits within this window should coalesce. If 3 separate refreshes fire, log as a defect. Use `.gitnexus/` file modification timestamps as secondary verification if debug logs are insufficient (Risk R-2).

---

## Priority 2 Test Cases (Medium)

---

### TC-016 [MCP][Plugin]: Phase numbering is consistent across all workflow files (Edge Case)

**Related Requirement**: FR-9
**Type**: Edge Case
**Priority**: P2

**Preconditions**:

- Rosetta v3 codebase is on `v3` branch with PR #84 merged

**Steps**:

1. Open `instructions/r3/core/workflows/init-workspace-flow.md`
2. Verify it declares 9 phases with GitNexus at Phase 6
3. Open each phase file and check the "Phase X of 9" line (see Test Data)
4. In each phase file, verify "Log gaps for Phase X" references point to Phase 8

**Expected Results**:

- After step 2: Orchestrator declares 9 phases: Context(1), Shells(2), Discovery(3), Rules(4), Patterns(5), GitNexus(6), Documentation(7), Questions(8), Verification(9)
- After step 3: All phase files match expected numbering (see Test Data)
- After step 4: Gap logging references consistently point to Phase 8

**Test Data**:


| File                                   | Expected text  |
| -------------------------------------- | -------------- |
| `init-workspace-flow-context.md`       | "Phase 1 of 9" |
| `init-workspace-flow-shells.md`        | "Phase 2 of 9" |
| `init-workspace-flow-discovery.md`     | "Phase 3 of 9" |
| `init-workspace-flow-rules.md`         | "Phase 4 of 9" |
| `init-workspace-flow-patterns.md`      | "Phase 5 of 9" |
| `init-workspace-flow-documentation.md` | "Phase 7 of 9" |
| `init-workspace-flow-questions.md`     | "Phase 8 of 9" |
| `init-workspace-flow-verification.md`  | "Phase 9 of 9" |


**Traceability**:

- **Functional Requirement**: FR-9

**Notes**: Static code review test.

---

### TC-019 [Plugin]: Rename symbol via GitNexus updates graph correctly (Integration)

**Related Requirement**: FR-3, US-2, US-3
**Type**: Integration
**Priority**: P2
**Applicability**: Plugin only — skip for MCP mode (rename edits files, graph refresh relies on hooks)

**Preconditions**:

- TC-002 passed (GitNexus MCP is connected)
- PROJECT has a function that appears in the graph and is called by other functions

**Steps**:

1. Open a new agent chat session on PROJECT
2. Ask: "Use GitNexus context for [a known function in PROJECT]"
   > **Example**: `"Use GitNexus context for savePerfume"` — `savePerfume` in `PerfumeMapper.java` is called by `addPerfume` and `updatePerfume` in `AdminController.java` (2 callers across files)
3. Confirm the function exists in the graph, note its callers
4. Ask: "Use GitNexus rename tool with dry_run=true to rename [known function] to [new name]"
   > **Example**: `"Use GitNexus rename tool with dry_run=true to rename savePerfume to persistPerfume"`
5. Review the dry run output — note the number of edits and files affected
6. If dry run looks correct, ask: "Use GitNexus rename tool with dry_run=false to apply the rename"
   > **Example**: `"Use GitNexus rename tool with dry_run=false to rename savePerfume to persistPerfume"`
7. Wait 15 seconds for refresh
8. Ask: "Use GitNexus context for [new name]"
   > **Example**: `"Use GitNexus context for persistPerfume"`
9. Ask: "Use GitNexus context for [old name]"
   > **Example**: `"Use GitNexus context for savePerfume"`

**Expected Results**:

- After step 3: Function exists with relationships
- After step 5: Dry run lists edits across multiple files with graph-verified and text-search categories
- After step 6: Rename applied successfully
- After step 8: [new name] exists in the graph with updated relationships
- After step 9: [old name] no longer exists or is marked stale

**Traceability**:

- **User Story**: US-2, US-3
- **Functional Requirement**: FR-3

**Notes**: After test, revert the rename to preserve PROJECT state.

---

## Priority 3 Test Cases (Low)

---

### TC-020 [Plugin]: `detect_changes()` maps git diff to affected flows (Happy Path)

**Related Requirement**: FR-3, US-2
**Type**: Happy Path
**Priority**: P3

**Preconditions**:

- TC-002 passed (GitNexus MCP is connected)
- There are unstaged changes in PROJECT (or make a small edit)

**Steps**:

1. Make a small edit to a source file in PROJECT (add a comment or modify a function)
2. Do NOT commit the change
3. Open a new agent chat session
4. Ask: "Use GitNexus detect_changes tool with scope 'unstaged'"
5. Review the output — it should map the edited file to affected execution flows

**Expected Results**:

- After step 5: Tool returns a list of affected execution flows/processes that touch the edited file. Output includes file names and process names

**Traceability**:

- **User Story**: US-2
- **Functional Requirement**: FR-3

---

## Coverage Matrix


| Requirement ID               | Test Case IDs                                    | Count | Status  |
| ---------------------------- | ------------------------------------------------ | ----- | ------- |
| FR-1 (MCP lifecycle)         | TC-001, TC-002                                   | 2     | Covered |
| FR-2 (Graph build)           | TC-003, TC-004                                   | 2     | Covered |
| FR-3 (Hook refresh)          | TC-004, TC-005, TC-010, TC-019, TC-020           | 5     | Covered |
| FR-4 (Failure isolation)     | TC-006                                           | 1     | Covered |
| FR-6 (CONTEXT.md)            | TC-001, TC-008                                   | 2     | Covered |
| FR-7 (`--skip-agents-md`)    | TC-001 (command call verified)                   | N/A   | N/A — GitNexus feature |
| FR-9 (Phase reordering)      | TC-016                                           | 1     | Covered |
| NFR-1 (Non-blocking)         | TC-004, TC-005                                   | 2     | Covered |
| NFR-2 (Graceful degradation) | TC-006                                           | 1     | Covered |
| NFR-3 (Agent-agnostic)       | TC-002                                           | 1     | Covered |
| NFR-4 (Debounce)             | TC-010                                           | 1     | Covered |
| US-1 (Opt-in)                | TC-001, TC-002, TC-008                           | 3     | Covered |
| US-2 (Query graph)           | TC-003, TC-004, TC-019, TC-020                   | 4     | Covered |
| US-3 (Auto refresh)          | TC-004, TC-005, TC-010                           | 3     | Covered |
| US-4 (Failure isolation)     | TC-006                                           | 1     | Covered |
| US-6 (CONTEXT.md discovery)  | TC-001, TC-008                                   | 2     | Covered |
| US-7 (Cold install)          | TC-001                                           | 1     | Covered |


---

## Test Area Traceability


| Test Area                      | Test Case IDs                      |
| ------------------------------ | ---------------------------------- |
| 1. STDIO startup               | TC-002                             |
| 2. Initial graph build         | TC-001, TC-003                     |
| 3. File edit triggers hook     | TC-004                             |
| 4. Async refresh non-blocking  | TC-005                             |
| 5. Refresh reflects changes    | TC-004                             |
| 6. Debounce / coalescing       | TC-010                             |
| 7. Failure isolation           | TC-006                             |
| 8. CONTEXT.md discoverability  | TC-001, TC-008                     |
| 9. Cold reinstall / full build | TC-001                             |
| 10. Multi-agent compatibility  | All TCs (agent-agnostic by design) |
| 11. MCP mode index behavior    | N/A — removed (no hooks in MCP mode)       |
| 12. Plugin mode index behavior | TC-004                             |


---

## Acceptance Criteria Traceability


| Acceptance Criterion                                                      | Validated by                                                                                                                               |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1: New contributor can clone, follow CONTEXT.md, have GitNexus running | TC-001                                                                                                                                     |
| AC-2: File edits reflected without restart                                | TC-004                                                                                                                                     |
| AC-3: GitNexus failure never blocks Rosetta                               | TC-006                                                                                                                                     |
| AC-5: CONTEXT.md sufficient for agent discovery                           | TC-001 (step 14)                                                                                                                           |
| AC-6: Consistent across agents                                            | All TCs (agent-agnostic by design — run full suite on each supported AI tool: Cursor, Windsurf, GitHub Copilot, Claude Code, OpenAI Codex) |


---

