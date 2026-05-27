# Test Cases - CTORNDGAIN-1494

**Generated**: 2026-05-25 18:22
**Phase**: 5 - Test Case Generation
**Jira Ticket**: CTORNDGAIN-1494 — [QA] Validate GitNexus Integration
**Status**: READY FOR REVIEW
**Format**: TestRail-compatible

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-25 | AI Agent | Generated from validated requirements (Phases 0-4) |
| 1.1 | 2026-05-27 | AI Agent | PR #92 review fixes: removed gain.json tests (TC-009, TC-011, TC-012), added MCP config verification, broadened GitNexus tool checks, added local/plugin mode tests (TC-021, TC-022), specified supported AI tools |

---

## Executive Summary

**Total Test Cases**: 19
**Merged/Optimized**: 26 → 19 (reduced by 27%)
**Coverage**:
- User Stories: 6 / 6 covered (US-5 removed — `gain.json` integration not implemented)
- Functional Requirements: 8 / 8 covered (FR-5 removed — `gain.json` integration not implemented)
- Non-Functional Requirements: 4 / 4 covered

**Priority Breakdown**:
- P0 (Critical): 7
- P1 (High): 5
- P2 (Medium): 6
- P3 (Low): 1

**Test Types**:
- Happy Path: 9
- Negative Tests: 4
- Edge Cases: 3
- Integration Tests: 3

**Parameterized Test Cases**: 2 (tests with multiple parameter sets)

---

## Glossary

| Term | Meaning |
|------|---------|
| **PROJECT** | The actual test repository. All test cases are project-agnostic |
| **GitNexus** | Code-graph intelligence tool. Builds a semantic knowledge graph from source code |
| **MCP** | Model Context Protocol — connects AI agents to external tools via STDIO transport |
| **`.gitnexus/`** | Local directory containing the code index. Not committed to git |
| **init-workspace-flow** | Rosetta's 9-phase workspace initialization workflow |
| **PostToolUse hook** | Auto-installed hook that triggers graph refresh after agent edits a file |
| **CONTEXT.md** | Documentation file telling AI agents what tools/skills are available |
| **Debounce** | Mechanism that coalesces rapid events into a single action after a delay (5 seconds) |

---

## Test Execution Notes for QA

### Recommended execution order

Run test cases in this order to build up the required preconditions naturally:

1. **TC-015, TC-016** — Static code review (no setup needed)
2. **TC-001** — First init with opt-in (sets up everything)
3. **TC-007** — Cold install end-to-end (alternative to TC-001, tests full flow)
4. **TC-002** — MCP auto-start verification
5. **TC-003** — Graph query verification
6. **TC-013** — CONTEXT.md self-discovery
7. **TC-014** — `--skip-agents-md` verification
8. **TC-004** — Hook trigger + graph update
9. **TC-005** — Async non-blocking
10. **TC-010** — Debounce coalescing
11. **TC-019** — Rename flow
12. **TC-020** — detect_changes flow
13. **TC-006** — Failure isolation (kills GitNexus — do last among runtime tests)
14. **TC-017, TC-018** — CLI status and clean commands
15. **TC-021** — Local mode: index updates only after commits
16. **TC-022** — Plugin mode: index updates immediately after code modifications
17. **TC-008** — Opt-in decline (needs clean state)

### Rosetta mode execution

Each test case must also be validated in both Rosetta operating modes:

- **Local mode**: Rosetta runs locally via init-workspace-flow. GitNexus index updates only after git commits.
- **Plugin mode**: Rosetta runs as an IDE plugin. GitNexus index updates immediately after any code modifications.

See TC-021 and TC-022 for dedicated mode-specific test cases.

## Environment Requirements

| Requirement | How to verify |
|---|---|
| Node.js installed (v18+) | Run `node --version` in terminal |
| `npx` available | Run `npx --version` in terminal |
| Git installed | Run `git --version` in terminal |
| PROJECT is a git repository with source code | Run `git status` in PROJECT root |
| Rosetta v3 is configured (v3 branch with PR #84 merged) | Check `instructions/r3/core/` directory exists |
| AI agent tool installed with MCP support | Open the agent tool, check MCP settings are accessible |

### Clean state checklist (before test run)

1. Remove `.gitnexus/` directory from PROJECT: `rm -rf .gitnexus/`
2. Remove GitNexus MCP entry from global agent config (if exists)
3. Remove any previously generated `CONTEXT.md` GitNexus section
4. Verify no `gitnexus` process is running: `ps aux | grep gitnexus`
5. Remove `/docs` folder 

---

## Priority 0 Test Cases (Critical)

---

### TC-001: GitNexus opt-in during init-workspace-flow Phase 6 — user accepts (Happy Path)

**Related Requirement**: FR-1, FR-2, US-1
**Type**: Happy Path
**Priority**: P0

**Preconditions**:
- PROJECT is a git repository with source code files
- No `.gitnexus/` directory exists in PROJECT
- No `docs` folder
- Rosetta v3 is configured
- Node.js and `npx` are available

**Steps**:
1. Open AI agent tool on PROJECT
2. Start a new agent chat session
3. Trigger init-workspace-flow on PROJECT
4. Wait for phases 1-5 to complete
5. When Phase 6 asks "Install GitNexus for enhanced code-graph navigation? (recommended)" — answer **Yes**
6. Observe the agent executing GitNexus setup commands
7. Wait for Phase 6 to complete

**Expected Results**:
- After step 5: Agent runs `npx gitnexus@latest analyze --skip-agents-md`
- After step 5: Agent runs `npx gitnexus@latest setup`
- After step 6: Both commands complete without errors
- After step 7: `.gitnexus/` directory exists in PROJECT (verify with `ls -la .gitnexus/`). Phase 6 logged as "installed" in state file
- After step 7: GitNexus is added to MCP config. Running `/mcp` shows `gitnexus · ✔ connected`

**Traceability**:
- **User Story**: US-1 (GitNexus opt-in)
- **Acceptance Criterion**: AC1, AC2
- **Functional Requirement**: FR-1, FR-2

**Notes**: This is the foundation test — most subsequent test cases depend on this passing first.

---

### TC-002: GitNexus MCP auto-starts and reports healthy connection (Happy Path)

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
8. Observe whether the tool call succeeds

**Expected Results**:
- After step 4: GitNexus appears in the MCP server list
- After step 5: Status shows GitNexus as connected/active
- After step 8: Any GitNexus tool (e.g., `query`, `context`, `impact`, `detect_changes`, `rename`, or `cypher`) returns results without errors. This confirms healthy handshake (Assumption A-1)

**Traceability**:
- **User Story**: US-1
- **Acceptance Criterion**: AC4
- **Functional Requirement**: FR-1

**Notes**: Validates that after opt-in, GitNexus auto-starts on subsequent sessions without re-prompting.

---

### TC-003: Initial graph build produces queryable knowledge graph (Happy Path)

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
6. Review the query response
7. Ask: "Use GitNexus context tool to get details about [same function]"
8. Review the context response
9. Ask: "Use GitNexus impact tool to show what depends on [same function] upstream"
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

### TC-004: File edit triggers PostToolUse hook and graph reflects changes (Happy Path)

**Related Requirement**: FR-3, US-3, NFR-1
**Type**: Happy Path
**Priority**: P0

**Preconditions**:
- TC-002 passed (GitNexus MCP is connected)
- PROJECT has a source file with a known function in the index

**Steps**:
1. Open a new agent chat session on PROJECT
2. Verify a known function exists in the graph: "Use GitNexus context for [known function]"
3. Confirm the function appears with its relationships
4. Ask the agent to add a new function to the same file: "Add a new function called `testHookFunction` to [file path] that calls [known function]"
5. Wait 10 seconds (debounce window is 5 seconds + processing time)
6. Check debug logs or agent tool hook UI for evidence the PostToolUse hook fired
7. Ask: "Use GitNexus context for `testHookFunction`"
8. Observe whether the new function appears in the graph

**Expected Results**:
- After step 3: Known function exists in the graph
- After step 4: Agent successfully edits the file
- After step 6: Debug logs or hook UI show that the PostToolUse hook fired after the file edit
- After step 7-8: `testHookFunction` appears in the graph with its relationship to [known function]. No editor restart was needed (Assumption A-2)

**Traceability**:
- **User Story**: US-3
- **Acceptance Criterion**: AC1, AC3, AC5
- **Functional Requirement**: FR-3
- **Non-Functional Requirement**: NFR-1

**Notes**: Combines Test Areas 4 and 6 (hook trigger + refresh reflects changes) into one flow.

---

### TC-005: Async refresh does not block the agent (Happy Path)

**Related Requirement**: FR-3, US-3, NFR-1
**Type**: Happy Path
**Priority**: P0

**Preconditions**:
- TC-002 passed (GitNexus MCP is connected)

**Steps**:
1. Open a new agent chat session on PROJECT
2. Ask the agent to make a large edit: "Add 5 new functions to [file path]: `funcA`, `funcB`, `funcC`, `funcD`, `funcE`, each with a simple return statement"
3. Immediately after the edit completes (within 2-3 seconds, before debounce fires), ask the agent: "Read the file [another file in PROJECT] and explain what it does"
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

### TC-006: GitNexus failure does not break Rosetta core tools (Negative)

**Related Requirement**: FR-4, US-4, NFR-2
**Type**: Negative
**Priority**: P0

**Preconditions**:
- TC-002 passed (GitNexus MCP is connected and working)

**Steps**:
1. Open a new agent chat session on PROJECT
2. Verify GitNexus works: "Use GitNexus query to search for [a known function]"
3. Confirm the query returns results
4. Open terminal and find the GitNexus process: `ps aux | grep gitnexus`
5. Kill the GitNexus process: `kill -9 [PID]`
6. In the same agent chat, ask the agent to perform a Rosetta core task: "Read the file [file path] and explain it"
7. Observe whether the agent completes the task normally
8. Ask the agent: "Use GitNexus query to search for [same function]"
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

### TC-007: Cold install from zero — full end-to-end (Happy Path)

**Related Requirement**: FR-1, FR-2, FR-6, US-7
**Type**: Integration
**Priority**: P0

**Preconditions**:
- PROJECT is a git repo with source code
- No `.gitnexus/` directory exists
- No `docs` folder
- No GitNexus MCP config in global agent settings
- No previous Rosetta init has been run (or state has been cleaned)
- Node.js and `npx` are available

**Steps**:
1. Verify clean state: `ls .gitnexus/` returns error, no GitNexus MCP config exists
2. Open AI agent tool on PROJECT
3. Start a new agent chat session
4. Trigger init-workspace-flow on PROJECT
5. When Phase 6 asks about GitNexus — answer **Yes**
6. Wait for all phases to complete (through Phase 9 — Verification)
7. Verify `.gitnexus/` exists: `ls -la .gitnexus/`
8. Open `CONTEXT.md` and search for "GitNexus"
9. Start a NEW agent chat session (as recommended by Phase 9)
10. Ask the new agent: "Use GitNexus query to search for [a known function in PROJECT]"

**Expected Results**:
- After step 5: Agent executes `npx gitnexus@latest analyze --skip-agents-md` and `npx gitnexus@latest setup`
- After step 6: Phase 9 verification passes
- After step 7: `.gitnexus/` directory exists with index files
- After step 8: CONTEXT.md contains "GitNexus is installed. USE SKILL `gitnexus-tools`... USE SKILL `gitnexus-cli`..."
- After step 10: Query returns results — entire flow works end-to-end from zero with no manual steps beyond answering "Yes"

**Traceability**:
- **User Story**: US-7
- **Acceptance Criterion**: AC1, AC2, AC3
- **Functional Requirement**: FR-1, FR-2, FR-6

**Notes**: Most comprehensive test. Validates the full documented install path from a clean checkout.

---

## Priority 1 Test Cases (High)

---

### TC-008: GitNexus opt-in during init — user declines (Negative)

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

**Expected Results**:
- After step 3: Agent logs GitNexus as "skipped" in state, moves to Phase 7
- After step 5: `.gitnexus/` directory does NOT exist
- After step 6: NONE of the GitNexus strings appear in CONTEXT.md

**Traceability**:
- **User Story**: US-1 (AC3), US-6 (AC3)
- **Functional Requirement**: FR-6

**Notes**: Validates the opt-in nature — declining leaves zero trace.

---

### TC-010: Debounce coalescing — rapid edits produce single refresh (Edge Case)

**Related Requirement**: FR-3, US-3, NFR-4
**Type**: Edge Case
**Priority**: P1

**Preconditions**:
- TC-002 passed (GitNexus MCP is connected)
- PostToolUse hook is installed

**Steps**:
1. Open a new agent chat session on PROJECT
2. Ask the agent to make rapid sequential edits to 3 different files: "Add a comment `// debounce-test-1` to [file_1], then `// debounce-test-2` to [file_2], then `// debounce-test-3` to [file_3]"
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

### TC-013: CONTEXT.md enables agent self-discovery of GitNexus (Integration)

**Related Requirement**: FR-6, US-6
**Type**: Integration
**Priority**: P1

**Preconditions**:
- TC-007 passed (init-workspace-flow completed, CONTEXT.md contains GitNexus section)
- GitNexus MCP is connected

**Steps**:
1. Open AI agent tool on PROJECT
2. Start a new agent chat session — do NOT mention "GitNexus" in your prompt
3. Ask the agent a task that benefits from code graph intelligence: "What functions call [a known function in PROJECT] and what would break if I changed it?"
4. Observe whether the agent discovers and uses GitNexus tools on its own
5. Check if the agent's response includes graph-level data (callers, blast radius, processes) rather than just basic file grep

**Expected Results**:
- After step 4: The agent reads CONTEXT.md, discovers the `gitnexus-tools` and `gitnexus-cli` skill references, and autonomously decides to use GitNexus MCP tools
- After step 5: Response includes code graph data from GitNexus (not just text search results)

**Traceability**:
- **User Story**: US-6
- **Acceptance Criterion**: AC2
- **Functional Requirement**: FR-6

**Notes**: The key validation is that the agent uses GitNexus without the user mentioning it. If the agent only uses basic file search, the CONTEXT.md instructions may be insufficient — log as a defect.

---

### TC-014: `--skip-agents-md` preserves Rosetta-managed files (Negative)

**Related Requirement**: FR-7, US-1
**Type**: Negative
**Priority**: P1

**Preconditions**:
- PROJECT has Rosetta-managed `AGENTS.md` and/or `CLAUDE.md` files
- No `.gitnexus/` directory exists (or clean it first)

**Steps**:
1. Record the content hash and modification timestamp of `AGENTS.md`: run `md5 AGENTS.md` (or `md5sum`) and `stat AGENTS.md`
2. If `CLAUDE.md` exists, record its hash and timestamp as well
3. Run `npx gitnexus@latest analyze --skip-agents-md` in PROJECT root
4. Wait for indexing to complete
5. Record the content hash and modification timestamp of `AGENTS.md` again
6. If `CLAUDE.md` exists, record its hash and timestamp again
7. Compare values from step 1-2 with step 5-6

**Expected Results**:
- After step 4: Indexing completes with exit code 0
- After step 7: `AGENTS.md` content hash and timestamp are UNCHANGED. `CLAUDE.md` content hash and timestamp are UNCHANGED. GitNexus did NOT modify these files

**Traceability**:
- **Functional Requirement**: FR-7

---

## Priority 2 Test Cases (Medium)

---

### TC-016: Phase numbering is consistent across all workflow files (Edge Case)

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
| File | Expected text |
|------|--------------|
| `init-workspace-flow-context.md` | "Phase 1 of 9" |
| `init-workspace-flow-shells.md` | "Phase 2 of 9" |
| `init-workspace-flow-discovery.md` | "Phase 3 of 9" |
| `init-workspace-flow-rules.md` | "Phase 4 of 9" |
| `init-workspace-flow-patterns.md` | "Phase 5 of 9" |
| `init-workspace-flow-documentation.md` | "Phase 7 of 9" |
| `init-workspace-flow-questions.md` | "Phase 8 of 9" |
| `init-workspace-flow-verification.md` | "Phase 9 of 9" |

**Traceability**:
- **Functional Requirement**: FR-9

**Notes**: Static code review test.

---

### TC-017: `npx gitnexus@latest status` reports correct index state (Happy Path)

**Related Requirement**: FR-2
**Type**: Happy Path
**Priority**: P2

**Preconditions**:
- Execute this test case 2 times with different states (see Test Data)

**Steps**:
1. Set up the state as described in Test Data
2. Run `npx gitnexus@latest status` in PROJECT root
3. Observe the output

**Expected Results**:
- After step 3: Output matches the expected result for each state

**Test Data**:
| State | Setup | Expected output |
|-------|-------|----------------|
| No index | Remove `.gitnexus/` directory | Reports "not indexed" or equivalent |
| Valid index | Run `npx gitnexus@latest analyze --skip-agents-md` first | Reports: repo name, last updated timestamp, symbol count > 0, relationship count > 0 |

**Traceability**:
- **Functional Requirement**: FR-2

---

### TC-019: Rename symbol via GitNexus updates graph correctly (Integration)

**Related Requirement**: FR-3, US-2, US-3
**Type**: Integration
**Priority**: P2

**Preconditions**:
- TC-002 passed (GitNexus MCP is connected)
- PROJECT has a function that appears in the graph and is called by other functions

**Steps**:
1. Open a new agent chat session on PROJECT
2. Ask: "Use GitNexus context for [a known function in PROJECT]"
3. Confirm the function exists in the graph, note its callers
4. Ask: "Use GitNexus rename tool with dry_run=true to rename [known function] to [new name]"
5. Review the dry run output — note the number of edits and files affected
6. If dry run looks correct, ask: "Use GitNexus rename tool with dry_run=false to apply the rename"
7. Wait 15 seconds for refresh
8. Ask: "Use GitNexus context for [new name]"
9. Ask: "Use GitNexus context for [old name]"

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

### TC-020: `detect_changes()` maps git diff to affected flows (Happy Path)

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

### TC-021: GitNexus in Rosetta local mode — index updates only after commits (Happy Path)

**Related Requirement**: FR-2, FR-3, US-2, US-3
**Type**: Happy Path
**Priority**: P2

**Preconditions**:
- Rosetta is running in **local mode** (via init-workspace-flow)
- TC-001 passed (GitNexus installed and MCP connected)
- PROJECT has source code files in the index

**Steps**:
1. Open a new agent chat session on PROJECT
2. Verify GitNexus is connected: ask "Use GitNexus query to search for [a known function in PROJECT]"
3. Confirm the query returns results — GitNexus installed successfully and indexed codebase
4. Add a new function `localModeTestFn` to a source file using the agent
5. Do NOT commit the change
6. Wait 15 seconds (debounce + processing time)
7. Ask: "Use GitNexus context for `localModeTestFn`"
8. Observe whether the new function appears in the graph
9. Commit the change: `git add . && git commit -m "test: local mode index update"`
10. Wait 15 seconds for index to update
11. Ask: "Use GitNexus context for `localModeTestFn`"
12. Observe whether the new function now appears in the graph

**Expected Results**:
- After step 3: GitNexus tools are functional — confirms successful installation and indexing
- After step 7-8: `localModeTestFn` does NOT appear in the graph (index not yet updated — uncommitted changes are not reflected in local mode)
- After step 11-12: `localModeTestFn` appears in the graph with its relationships (index updated after commit)

**Traceability**:
- **User Story**: US-2, US-3
- **Functional Requirement**: FR-2, FR-3

**Notes**: After test, revert the commit to preserve PROJECT state: `git revert HEAD --no-edit`

---

### TC-022: GitNexus in Rosetta plugin mode — index updates immediately after modifications (Happy Path)

**Related Requirement**: FR-2, FR-3, US-2, US-3
**Type**: Happy Path
**Priority**: P2

**Preconditions**:
- Rosetta is running in **plugin mode** (IDE plugin)
- GitNexus is installed and MCP connected
- PROJECT has source code files in the index

**Steps**:
1. Open a new agent chat session on PROJECT
2. Verify GitNexus is connected: ask "Use GitNexus query to search for [a known function in PROJECT]"
3. Confirm the query returns results — GitNexus installed successfully and indexed codebase
4. Add a new function `pluginModeTestFn` to a source file using the agent
5. Do NOT commit the change
6. Wait 15 seconds (debounce + processing time)
7. Ask: "Use GitNexus context for `pluginModeTestFn`"
8. Observe whether the new function appears in the graph

**Expected Results**:
- After step 3: GitNexus tools are functional — confirms successful installation and indexing
- After step 7-8: `pluginModeTestFn` appears in the graph with its relationships (index updated immediately after code modification, no commit required)

**Traceability**:
- **User Story**: US-2, US-3
- **Functional Requirement**: FR-2, FR-3

**Notes**: This is the key behavioral difference from local mode (TC-021). In plugin mode, the index reflects code changes in real time without waiting for a commit. After test, revert the change to preserve PROJECT state.

---

## Coverage Matrix

| Requirement ID | Test Case IDs | Count | Status |
|---|---|---|---|
| FR-1 (MCP lifecycle) | TC-001, TC-002 | 2 | Covered |
| FR-2 (Graph build) | TC-003, TC-017, TC-018, TC-021, TC-022 | 5 | Covered |
| FR-3 (Hook refresh) | TC-004, TC-005, TC-010, TC-019, TC-020, TC-021, TC-022 | 7 | Covered |
| FR-4 (Failure isolation) | TC-006 | 1 | Covered |
| FR-6 (CONTEXT.md) | TC-008, TC-013 | 2 | Covered |
| FR-7 (`--skip-agents-md`) | TC-014 | 1 | Covered |
| FR-8 (Skill decomposition) | TC-015 | 1 | Covered |
| FR-9 (Phase reordering) | TC-016 | 1 | Covered |
| NFR-1 (Non-blocking) | TC-004, TC-005 | 2 | Covered |
| NFR-2 (Graceful degradation) | TC-006 | 1 | Covered |
| NFR-3 (Agent-agnostic) | TC-002 | 1 | Covered |
| NFR-4 (Debounce) | TC-010 | 1 | Covered |
| US-1 (Opt-in) | TC-001, TC-002, TC-008 | 3 | Covered |
| US-2 (Query graph) | TC-003, TC-019, TC-020, TC-021, TC-022 | 5 | Covered |
| US-3 (Auto refresh) | TC-004, TC-005, TC-010, TC-021, TC-022 | 5 | Covered |
| US-4 (Failure isolation) | TC-006 | 1 | Covered |
| US-6 (CONTEXT.md discovery) | TC-008, TC-013, TC-015 | 3 | Covered |
| US-7 (Cold install) | TC-007 | 1 | Covered |

---

## Test Area Traceability

| Test Area | Test Case IDs |
|---|---|
| 1. STDIO startup | TC-002 |
| 2. Initial graph build | TC-001, TC-003 |
| 3. File edit triggers hook | TC-004 |
| 4. Async refresh non-blocking | TC-005 |
| 5. Refresh reflects changes | TC-004 |
| 6. Debounce / coalescing | TC-010 |
| 7. Failure isolation | TC-006 |
| 8. CONTEXT.md discoverability | TC-008, TC-013 |
| 9. Cold reinstall / full build | TC-007 |
| 10. Multi-agent compatibility | All TCs (agent-agnostic by design) |
| 11. Local mode index behavior | TC-021 |
| 12. Plugin mode index behavior | TC-022 |

---

## Acceptance Criteria Traceability

| Acceptance Criterion | Validated by |
|---|---|
| AC-1: New contributor can clone, follow CONTEXT.md, have GitNexus running | TC-007 |
| AC-2: File edits reflected without restart | TC-004, TC-021, TC-022 |
| AC-3: GitNexus failure never blocks Rosetta | TC-006 |
| AC-5: CONTEXT.md sufficient for agent discovery | TC-013 |
| AC-6: Consistent across agents | All TCs (agent-agnostic by design — run full suite on each supported AI tool: Cursor, Windsurf, GitHub Copilot, Claude Code, OpenAI Codex) |

---
