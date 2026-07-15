---
name: testgen-flow-project-config-loading
description: "Phase 0 Project Config Loading of testgen-flow"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<testgen_flow_project_config_loading>

<description_and_purpose>
Find or create the project config file, obtain project-specific data retrieval configuration from user, and initialize the ticket output directory.
</description_and_purpose>

<workflow_context>
- Phase 0 of 7 in `testgen-flow`
- Input: user request with an Issue Tracker ticket key/URL (Jira `PROJ-123` is the canonical example)
- Output: `initial-data.md`, project config file, initialized state
- Prerequisite: user provided an Issue Tracker ticket key or URL
</workflow_context>

<phase_steps>
1. Parse initial user input for ticket key
2. Setup output directory
3. Load or create project config
4. Obtain project info from user (if config is new)
5. Create initial-data file
6. Update state file
</phase_steps>

<parse_input step="0.1">
1. Extract the Issue Tracker ticket key or URL from the user prompt (REQUIRED) — Jira shapes are the canonical examples; adapt parsing to the resolved tracker.
2. Accept formats:
   - **Ticket only:** `PROJ-123`, a full ticket URL, or `Analyze requirements for PROJ-123`.
   - **Ticket + Wiki:** the ticket key/URL plus one or more Wiki page URLs, e.g. `Analyze PROJ-123, docs: https://<wiki>/pages/123`.
   - **Ticket + other documentation URLs** (e.g. Google Drive): the ticket plus any documentation links the project config lists as data sources.
3. Any non-ticket links pasted here are captured verbatim into `initial-data.md` and carried into Phase 1 data collection, resolved there per the project config's data sources. A recognizable provider URL is valid provider evidence.
</parse_input>

<setup_directory step="0.2">
1. Create `plans/testgen-{TICKET-KEY}/` (full per-ticket layout in `<output_directory>` below).
2. Initialize `testgen-state.md` from `<state_file_template>` below. At init the Phase 0 row is `[ ] Phase 0: Project Config Loading - In progress` (all others Not started); step 0.6 flips it to `[x] ... Completed` only after the config and initial-data files exist.
</setup_directory>

<load_project_config step="0.3">
1. Search for `testgen-project-config.md` at `plans/testgen-{TICKET-KEY}/testgen-project-config.md` (per-ticket, inside this ticket's feature plan folder — one copy per run, **not** a shared project-wide file, so parallel sessions and commits never collide).
2. **Branches (exhaustive):**
   - **File exists AND non-empty:** skip to step 0.5.
   - **File missing OR exists but empty:** proceed to step 0.4 (do NOT create an empty placeholder file — step 0.4 will write the populated file).
</load_project_config>

<obtain_project_info step="0.4">

Contiguous 1–5 sequence. The `<example_format_of_question>` block below is the verbatim question text used by step 2 — it is **not** a numbered step and the sequence does not restart after it.

1. **Pre-fill from `gain.json` (merge evidence; do not force one source):** read repository-root `gain.json`; use `sdlc.issue_tracker(_project)`, `sdlc.wiki(_project)`, and `sdlc.test_management(_project)` when populated, plus recognizable provider URLs from the prompt. Explicit user input wins for this run; a missing `gain.json` never blocks the phase. Name the prefilled providers in the question below so the user confirms rather than re-supplies them.
2. USE SKILL `questioning`. Ask the user about knowledge base and data retrieval setup using the question text in `<example_format_of_question>` below (adapt its canonical provider names to the prefilled ones).
3. Process the user's answer — confirm the default scheme OR capture their customization.
4. **Validate the answer provides sufficient information.** Minimum required fields:
   - **Data sources** (which of: Issue Tracker, Wiki, attached docs, other URLs — resolved providers recorded by name)
   - **Retrieval method** per source (MCP-based / direct URL / search-by-keywords)
   - **Auth assumptions** (MCP already configured / token in env / requires per-call OAuth)

   **Validation failure paths:**
   - If user said YES to default but the default cannot run in the environment (no MCP, no auth): re-prompt up to 2 times naming exactly which field(s) are absent. After 2 unsuccessful re-prompts, stop Phase 0, record `Phase 0 blocked: default unrunnable — missing <field>` in `testgen-state.md`, and ask the user to supply a complete answer before continuing.
   - If user said NO but did not name source / method / auth: re-prompt up to 2 times naming the missing fields explicitly. After 2 unsuccessful re-prompts, stop Phase 0, record `Phase 0 blocked: incomplete config answer` in `testgen-state.md`, and ask the user to supply a complete answer before continuing.
5. **Apply the `<safety_boundaries>` redaction-at-intake gate**, then save the validated configuration to `plans/testgen-{TICKET-KEY}/testgen-project-config.md` (path per step 0.3).

<example_format_of_question>
```markdown
According to test generation process rules, I require more details related to your project - How should I retrieve the information necessary for test case generation?
As a reference, I provide the default Data Retrieval scheme below:
** Default Setup **
- retrieve the Issue Tracker ticket fields (summary+description) — e.g. Jira
- retrieve provided Wiki documents, if any — e.g. Confluence
- search the Wiki for pages using keywords extracted from the ticket
- combine all the information as a basis for test case generation

Is the above accurate for your project?
Please answer YES or NO
- If your answer is NO then please provide details about data retrieval for your project.
- If you have links to any additional documentation or materials that need to be considered,
you can provide them here as well.
```
</example_format_of_question>

</obtain_project_info>

<create_initial_data step="0.5">
1. **Apply the `<safety_boundaries>` redaction-at-intake gate** (the user prompt + pasted links written here can carry credentials), then create `plans/testgen-{TICKET-KEY}/initial-data.md`:

```markdown
# Initial data - [TICKET-KEY]

**Initial user prompt:** [USER PROMPT]
**Project config file - USE AS REFERENCE FOR THE NEXT PHASE:** [PROJECT CONFIG FILENAME]
```
</create_initial_data>

<update_state step="0.6">
1. Update `plans/testgen-{TICKET-KEY}/testgen-state.md` with Phase 0 complete
2. Tell user: "Phase 0 complete. Project setup ready."
3. Ask: "Ready to proceed to Phase 1 (Data Collection)?"
4. Gate the advance to Phase 1 via USE SKILL `hitl` (the canonical approval/escalation home): require explicit user confirmation; do NOT auto-proceed on inferred approval or silence; treat ambiguous responses as "not confirmed" and re-ask.
</update_state>

<state_file_template>

`plans/testgen-{TICKET-KEY}/testgen-state.md` — created here in Phase 0, updated by every subsequent phase:

```markdown
# Test Generation State - <Ticket ID>

**Last Updated**: [DateTime]
**Current Phase**: [0-6 or COMPLETE; if a phase halts, append " (BLOCKED: <reason>)", e.g. "0 (BLOCKED: incomplete config answer)"]
**Ticket**: [Issue Tracker key, e.g. PROJ-123]
**Providers**: [resolved Issue Tracker / Wiki / TMS, or N/A per role]

## Phase Completion Status

- [ ] Phase 0: Project Config Loading - In progress
- [ ] Phase 1: Data Collection - Not started
- [ ] Phase 2: Gap Analysis - Not Started
- [ ] Phase 3: Question Generation - Not Started
- [ ] Phase 4: Requirements Generation - Not Started
- [ ] Phase 5: Test Scenarios - Not Started
- [ ] Phase 6: Test Case Export - Not Started

## Phase Details

### Phase 1
- Completed: [DateTime]
- Ticket: [KEY]
- Files Created: [List]
- Wiki Pages: [Count]
- Notes: [Any relevant notes]

[Add sections for each completed phase]

## Metrics

Completeness signal (one line; `—` until the phase runs; a thin `0`/`1` where more is expected → re-check the artifact):
`P1 ticket-fields:[n]/wiki:[n] · P2 contradictions:[n]/gaps:[n]/ambig:[n] · P3 questions:[n]/answered:[n] · P4 stories:[n]/FR:[n]/NFR:[n] · P5 scenarios:[n] · P6 exported:[n]/[n]`

## Verification-Failure Overrides

[Append a row each time the parent flow's verification-failure unilateral-start override fires. If never fired, write: `None — no overrides applied.`]

- **[ISO timestamp]** — User asserted phases complete: `[user's verbatim claim]`. Failing conditions: `[which preconditions were unmet — state row missing / output file absent / etc.]`. Phase started: `[earliest incomplete phase id]`.
```

</state_file_template>

<output_directory>

All phase outputs stored under `plans/testgen-{TICKET-KEY}/`:

```
plans/testgen-{TICKET-KEY}/
├── testgen-project-config.md  # Phase 0: project config (data sources, retrieval, auth) — one copy per ticket
├── testgen-state.md        # State tracking (updated each phase)
├── initial-data.md         # Phase 0: Initial user input + project config ref
├── raw-data.md             # Phase 1: Issue Tracker + Wiki data
├── analysis.md             # Phase 2: Gap analysis
├── questions.md            # Phase 3: Generated questions
├── answers.md              # Phase 3: User answers (HITL)
├── requirements.md         # Phase 4: Final requirements
├── test-scenarios.md       # Phase 5: Test cases
└── export-report.md        # Phase 6: TMS export receipt (IDs/URLs, per-case status, timestamp)
```

</output_directory>

<safety_boundaries>

`plans/testgen-{TICKET-KEY}/testgen-project-config.md` and `initial-data.md` (verbatim user prompt + pasted links) are **tracked** — PUBLIC by default; the **Auth assumptions** answer (step 0.4) and pasted URLs can carry credential-shaped values. Record auth as **scheme + source** (e.g. `Bearer JWT from env E2E_TOKEN`), never literal values.

**Redaction at intake (pre-write gate, fail-closed):** USE SKILL `sensitive-data` and run its scan against the config AND `initial-data.md` BEFORE writing — no scan (skill unavailable included) → STOP, never write unscanned. On a hit, replace the literal with mechanism+source and add to `## Additional Notes`: `Original answer included a literal <kind> — redacted; request mechanism+source from user if the env-var name is unknown.` Structure (endpoint paths, framework names, credential-free URLs, ticket/project keys) stays verbatim.

</safety_boundaries>

<validation_checklist>
- `plans/testgen-{TICKET-KEY}/` directory exists
- `plans/testgen-{TICKET-KEY}/testgen-project-config.md` (per-ticket, in the feature plan folder) exists with non-empty content covering data sources, retrieval method, and auth assumptions
- `plans/testgen-{TICKET-KEY}/initial-data.md` created with user prompt and config reference
- `plans/testgen-{TICKET-KEY}/testgen-state.md` created with Phase 0 marked complete
- Redaction pre-write gate ran — `sensitive-data` scan executed against the config + `initial-data.md` before write (fail-closed); no literal credential persisted; any redaction noted in `## Additional Notes`
</validation_checklist>

</testgen_flow_project_config_loading>
