# TestRail EXPORT Binding -- qa-knowledge (scenario_design)

Holds connection verification, field mappings, MCP tool signatures, the destructive-write confirmation gate, and post-export ID handling.

Bindings are already in context: authored case-set source path, `project_id`, `suite_id`, `section_id`, workflow-state path, and any per-instance priority/type override tables. Missing `project_id` / `suite_id` / case-set path → the export cannot run; stop and report `testing testrail-export: required input missing — <name>`. Do NOT pick defaults for these -- the safety gate against exporting to the wrong project depends on them being explicit. Collect `section_id` from the user at step 2 if not pre-supplied.

---

## Process

1. **Verify connection** -- call `mcp_testrail_get_project(project_id)`. On failure, tell the user to verify MCP config, credentials, and project access.
2. **Get `section_id` from user** (TestRail MCP cannot create sections -- user must provide an existing `section_id` or create one in the TestRail UI first). Parse flexibly: accept `section_id is XXXXX`, `group_id=XXXXX`, or a bare number. Prompt template below.
3. **Apply priority mapping** -- **precedence: parent TMS config first, defaults last** (per-case overrides + instance-specific tables from project config win). Defaults (only when no parent mapping supplied):
   - P0 → `priority_id: 4` (Critical) · P1 → `3` (High) · P2 → `2` (Medium) · P3 → `1` (Low)
4. **Apply type mapping** -- same precedence. Defaults:
   - Happy Path → `type_id: 1` (Functional) · Negative → `7` · Edge Case → `6` (Boundary) · Integration → `8` · Performance → `9` · Security → `10`
5. **Format steps** -- use `custom_steps_separated`; each entry has `content` (action) and `expected` (outcome). If rejected, fall back to plain text.
6. **Build preconditions** -- `custom_preconds`: TEST DATA first (with execution-count note for parameterized cases), then original preconditions. If `custom_preconds` unsupported, prepend to the first step `content` with a `\n\n--- STEPS ---\n\n` separator.
7. **Pre-export safety check + dedup pre-scan (GATE -- required before any write):**
   - **Sensitive-value scan** -- re-read every title, step `content`, step `expected`, and the preconditions block; apply `sensitive-data` redaction first.
   - **Dedup pre-scan** -- call `mcp_testrail_get_cases(project_id, suite_id)`; build the overlap set (exact title match) and record the overlap count. **If this call fails (network / permission / API error): do NOT export -- stop and report `testrail-export: dedup pre-scan failed — <reason>` to the phase. The phase decides: retry, skip the scan with explicit user acknowledgment of duplicate risk (then surface `Existing matching titles: unknown — pre-scan unavailable` in the gate), or cancel.**
   - **Confirmation gate (user-facing):**
     ```
     Planned export: <N> test cases to TestRail project <project_id>, section <section_id>.
     Existing cases in target suite that match planned titles: <overlap_count>.
     ⚠ TestRail does NOT deduplicate by title — re-running creates duplicate cases (by design; preserves history). The <overlap_count> matching titles WILL become duplicates if exported again.
     Proceed?  (a) export all <N>  (b) export only the <N - overlap_count> non-matching titles  (c) cancel
     ```
   - **Obtain an explicit `a` / `b` / `c` through the HITL gate (USE SKILL `hitl`)** before any write -- that gate governs approval vocabulary, ambiguity handling, and re-ask/cancel semantics; do not re-derive them here. This is a destructive external write: never infer approval (cancellation is the safe default -- see Operational rules).
   - On `c`: stop, record the cancellation in the workflow state, do not call `mcp_testrail_add_case` even once.
8. **Export each approved case** -- `mcp_testrail_add_case(section_id, title, priority_id, type_id, refs, custom_steps_separated)` for the approved set (`a` = full list; `b` = non-overlapping subset). ~0.5s delay between calls; back off further on 429. On individual failure: log error, continue. Record each created case's C-prefixed ID with its title.
9. **Post-export** -- TestRail case IDs are C-prefixed (e.g., `C12345`); use this format in document updates and links, and write the IDs back to the source artifact in a defined shape:
   - **Source-artifact write-back:** append a `## TestRail Export` table to the case-set artifact -- columns `Case Title | TestRail ID | URL | Status (created / failed / skipped) | Error (if any)`, one row per planned case.
   - **Workflow-state record** (written to the phase-supplied workflow-state path, parseable by the calling phase): `exported: <created>/<N>` · `overlap_count: <n | unknown>` · `user_choice: a|b|c` · `target: project_id/suite_id/section_id` · `timestamp`.

---

## Section-ID user prompt template (step 2)

```
TestRail Section Setup Required

To export test cases, I need a section_id from TestRail.

Option A: Use existing section — provide the section_id.
  Find it in the URL when viewing a section (e.g., group_id=94686 or section_id=94686)

Option B: Create new section
  1. Go to: [TestRail suite URL]
  2. Click "Add Section"
  3. Name it: [TICKET-KEY]
  4. After creating, find the section_id in the URL or section details

Please provide: "section_id is XXXXX" or just the number
```

## Preconditions format (step 6)

Order: TEST DATA first (tester sees execution count immediately), then preconditions.

For parameterized tests (has a Test Data table):

```
=== TEST DATA ===
Execute this test case for EACH row in the table below:

| Parameter | Value 1 | Value 2 |
|-----------|---------|---------|
| [Param]   | [Val]   | [Val]   |

=== PRECONDITIONS ===
- [Precondition 1]
```

For non-parameterized tests: include only the `=== PRECONDITIONS ===` section.

## Default-ID rationale + audit risk

TestRail `priority_id` / `type_id` are NOT enums -- they are foreign keys into per-instance lookup tables (`Administration → Customizations`). Two installations can map the same IDs to different labels; the API accepts any integer without semantic validation. The defaults in steps 3-4 are a fresh install's out-of-the-box values. On a customized instance, exporting against the defaults produces **silently mis-labeled cases** -- the API succeeds, the case appears, but its priority/type label is wrong. Mitigation: parent TMS config takes precedence; the validation "values match target project configuration per step 3 + 4 precedence" is the audit anchor that catches this in review.

## Operational rules

- Cancellation is safe -- aborting at the gate produces no writes; preferred over best-guess export.
- Rate limit: ~0.5s between `mcp_testrail_add_case` calls is the floor; back off further on 429.
- Removing a destructive-write safeguard (dedup pre-scan, confirmation gate, redaction) is forbidden -- degrade content, never the gate.
- **Redact** via `sensitive-data` before any write.

## Pre-write validation greps

- `mcp_testrail_get_project` succeeded (step 1); `section_id` confirmed (step 2).
- `priority_id` / `type_id` match the target project config per step 3 + 4 precedence (parent config first, defaults last).
- **Step 7 GATE passed** -- sensitive-value scan + dedup pre-scan (`mcp_testrail_get_cases` called, overlap count shown) + explicit `a`/`b`/`c` recorded in workflow state. No `mcp_testrail_add_case` without all three.
- Exported set matches the step-7 user choice; each created case returns a TestRail ID; source artifact updated with C-prefixed IDs and links.

---

## Swapping to another TMS vendor

To fork this binding for another TMS (Zephyr / Xray / qTest / Polarion): READ SKILL FILE `references/vendor-fork-guide.md`, copy this file to `references/<vendor>-export.md`, and rebind only the vendor-specific items per that guide's Rebind table -- keeping the process shape, the destructive-write confirmation gate, and the redaction discipline verbatim.
