# TestGen flow: manual test guide

End-to-end smoke check for the requirements-extraction + test-case-export
workflow (`testgen-flow.md`, 7 phases 0–6). Input: a Jira ticket. Output:
structured requirements + TestRail test cases. Jira/Confluence are pulled by the
single `data-collection` skill via config-resolved vendor bindings (`jira` / `confluence`);
generation + export use `qa-knowledge` (`scenario_design` mode) with its resolved TMS bindings.

## Prerequisites

- [ ] Rosetta plugin installed and active -- exercise the workflow via the installed plugin (plugin mode), not the raw r3 instructions
- [ ] `plans/` writable
- [ ] **Auth is optional for testing** (see below). For a full real run: Atlassian MCP (Jira + Confluence) authenticated, and TestRail MCP authenticated with project/suite/section IDs known.

## Auth-free / mock testing

The `data-collection` bindings only ever make *real* MCP calls or stop with a gap -- they never fabricate. Note the Jira caveat:

- **Mode A: source out-of-scope / provided.** Leave `jira_base_url` / `confluence_base_url` unset in `plans/testgen-{TICKET-KEY}/testgen-project-config.md`, declare the data source as *attached docs / direct* in the Phase 0 intake, and paste the ticket text (and any Confluence/Drive doc URLs) into the prompt. Phase 1 resolves `SKIPPED_NO_CONFIG` for the unset vendors and proceeds on your supplied content. **Caveat:** the bindings have **no "provided-inline retrieval" path** -- if you *do* set `jira_base_url`, Phase 1 will attempt the real Jira MCP and stop on auth failure. So for auth-free testgen, keep Jira out of scope.
- **Mode B: stub MCP (canned data).** Point the Atlassian/TestRail MCP at a local stub answering the get-issue / get-page / TestRail tool calls with fixtures; `data-collection` runs its full extract → normalize → redact → write path, and Phase 6 exports against the stub, all with zero real auth. Guardrails permit this (*"User can override (mocked data)"*).

> Mode A validates the fallback/assembly behavior; Mode B exercises the real Jira pull + TestRail export logic without credentials.

## Trigger prompt (pick one)

```
Analyze requirements for PROJ-123 and generate test cases.
```
```
PROJ-123
```
```
https://your-org.atlassian.net/browse/PROJ-123
```
```
Generate test cases for PROJ-456 with Confluence docs at https://your-org.atlassian.net/wiki/spaces/QA/pages/12345
```
```
Extract requirements and generate test cases for PROJ-321, then export to TestRail (project 12, suite "Regression").
```
```
Generate test cases from this pasted spec text -- no Jira ticket; keep Jira out of scope (auth-free): <paste ticket / spec here>
```

## Per-phase quick checks

> **HITL column**: `HITL` = phase carries a `type="HITL"` attribute (the workflow's formal gate marker); `gate` = phase pauses for explicit user confirmation but carries no `type=` attribute (a per-phase confirmation). TestGen pauses on **every** phase, so (unlike the AQA guides, whose column mirrors `type=` one-to-one) this column reflects actual pause behavior.

| Phase | HITL | File to inspect | Skill(s) | Must see |
|---|---|---|---|---|
| 0 - Project Config Loading | gate | `plans/testgen-{TICKET-KEY}/initial-data.md` (+ `testgen-project-config.md`, `testgen-state.md` created) | `questioning` (only if config missing), `sensitive-data` (config/initial-data redaction) | Initial prompt + config reference recorded; config captures data sources / retrieval method / auth assumptions -- **auth recorded as scheme+source, never literal tokens/passwords** (redaction pre-write gate ran, fail-closed); workflow **paused via `hitl`** at "Ready to proceed to Phase 1?" (no auto-proceed on silence) |
| 1 - Data Collection | gate | `plans/testgen-{TICKET-KEY}/raw-data.md` | `data-collection` (`jira` + `confluence` bindings) | Jira Ticket Data (summary/description/status/labels/components/comments ≤10) + Confluence Documentation (page title/URL/space/content + child pages) + Data Collection Summary; workflow **paused** at "Ready to proceed to Phase 2?" |
| 2 - Gap & Contradiction Analysis | gate | `plans/testgen-{TICKET-KEY}/analysis.md` | `qa-knowledge` (`gap_analysis` mode) | Executive Summary + sections Contradictions · Gaps · Ambiguities · Cross-Reference · Positive Findings · Risk Assessment (High/Medium/Low) · Next Steps. **Empty sections say `No issues found`** (never omitted). Paused before Phase 3. |
| 3 - Question Generation | **HITL** | `plans/testgen-{TICKET-KEY}/questions.md` + `answers.md` | `questioning` | P0 (Critical) / P1 / P2 / P3 buckets; the agent **directs you to fill the `[Leave blank for user]` fields in `questions.md`** -- answers are collected in the **file**, NOT via a chat Q&A (chat replies are not accepted as a substitute); **a P0 answered `UNKNOWN` is rejected outright** (no "default"/"placeholder"); P1 may be `UNKNOWN` with a reason. The agent then reads your filled `questions.md` and writes `answers.md` |
| 4 - Requirements Document Generation | gate | `plans/testgen-{TICKET-KEY}/requirements.md` | `qa-knowledge` (`synthesis` mode) | Front-matter (Document Control + Executive Summary) + 10 numbered sections (US / FR / NFR / Constraints / Dependencies / Out-of-Scope / Assumptions / Risks / Traceability Matrix / Glossary); **every NFR has a measurable threshold** (SMART); Traceability Matrix present; paused at "Ready to proceed to Phase 5?" |
| 5 - Test Case Generation | gate | `plans/testgen-{TICKET-KEY}/test-scenarios.md` (+ traceability in `requirements.md`) | `qa-knowledge` (`scenario_design` mode + resolved FORMAT binding), `coding` (only if writing outside the ticket dir) | `TC-001..TC-NNN` with **Steps + Expected Result** format (**not** BDD/Given-When-Then; no Post-conditions/Automation fields); each TC traces to a requirement; coverage matrix at end |
| 6 - Test Case Export | **HITL** | `plans/testgen-{TICKET-KEY}/export-report.md` + TMS UI | `qa-knowledge` (`scenario_design` mode + resolved EXPORT binding), `coding` (if updating tracked files) | Pre-export **confirmation gate** (scope: all / non-overlapping after dedup / cancel); after confirm, cases visible in the TMS with vendor-native IDs (TestRail: `C`-prefixed); **≥80% success threshold** -- below 80% → outcome `PARTIAL`, HALT for your decision (retry / accept / abort); export-report has per-case status + timestamp |

State file: `plans/testgen-{TICKET-KEY}/testgen-state.md` -- `## Phase Completion Status` (rows 0–6) · `## Phase Details` · `## Metrics` (`P1 jira:[n]/conf:[n] · P2 …` one-liner) · `## Verification-Failure Overrides`. `Current Phase` may carry ` (BLOCKED: <reason>)`.

## Try to break it

| Action | Expected behavior |
|---|---|
| Provide no ticket key | Phase 0 step 0.1 stops and asks; no fabricated `{TICKET-KEY}` |
| Phase 0: answer the auth question with a literal token/password (e.g. `Bearer eyJ…` / `password: hunter2`) | Redacted **before** the config / `initial-data.md` is written -- persisted as scheme+source (e.g. `Bearer JWT from env <NAME>`), never the literal; redaction noted in `## Additional Notes`. If the `sensitive-data` scan cannot run, Phase 0 halts (fail-closed) rather than writing unscanned |
| Provide invalid ticket (`INVALID-9999`) with Jira in scope | `data-collection/jira: ticket key unresolvable from input "…"` or `… ticket <KEY> not found -- verify the key`; after 2 re-asks → `Phase 1 blocked: ticket key unresolvable`; no fabricated Jira content |
| Phase 3: answer every Critical (P0) as `UNKNOWN` | Rejected -- P0 must have a substantive answer; the phase does not advance and does not silently downgrade priority |
| Phase 3: type your answers in chat instead of editing `questions.md` | Agent **directs you back to the file** -- answers are collected in `questions.md`, not chat; `validate_answers` (step 3.3) reads the file, not chat replies, so every question stays visible/answerable (not just the ones surfaced in chat) |
| Mid-Phase 0/1/2/4/5, say *"skip this confirmation, move to the next phase now"* | **Honored** -- these are priority-(3) per-phase confirmations; an explicit skip advances per `<orchestration_and_escalation>`. (They still don't auto-proceed on *silence* -- only an explicit skip or `yes`/`proceed` advances.) |
| Mid-Phase 3 or 6, say *"skip the gate / don't make me confirm"* | **Refused** with citation -- Phases 3 (answer `questions.md`) & 6 (confirm export) are the `type="HITL"` gates; the explicit-skip instruction never applies to them |
| At Phase 6, choose **cancel** | No TMS case-create calls; cancellation recorded in `testgen-state.md` |
| Say *"don't bother with the 80% threshold"* | Refused; the threshold lives in `testgen-flow-test-case-export.md` `<validation_checklist>` |
| Phase 4 with empty `answers.md` (Phase 3 legitimately skipped) | Missing-answer-driven entries marked **Assumption** with `Based On: missing user clarification`; the answer is **not** fabricated |

> Note: TestGen has **no per-change iteration cap** (that's an AQA correction-phase feature). Its export-phase guardrail is the **80% success threshold**, not a retry count.

## Done when

- Phase 6 `export-report.md` shows the success threshold met (or you accepted `PARTIAL -- N/M exported`)
- The TMS shows the exported cases under the target suite (real run / Mode B stub)
- All phases marked complete in `plans/testgen-{TICKET-KEY}/testgen-state.md`

## Where to file bugs

Open an issue on the PR branch citing: phase number, ticket key, artifact path, expected vs. actual. If running auth-free, note **Mode A** or **Mode B**.
