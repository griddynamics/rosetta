# PostHog Missing Stats — Implementation Plan

## 1. Goal

Close the remaining gap between the legacy `server.py` PostHog contract and the current `v3` implementation, as defined in `posthog-missing-stats-SPECS.md`. All other items from the original parity audit are already implemented; only the `distinct_id` inconsistency in `FeedbackService` remains.

## 2. Already DONE (no further work)

These items WERE missing in earlier `v3` snapshots and have been added in the current working tree. They are listed for traceability — DO NOT reimplement.

| # | Item | Evidence |
|---|---|---|
| 1 | `$referring_domain = repository` | tracker.py:183 |
| 2 | `$screen_name` derivation from kwargs | tracker.py:190-210 |
| 3 | `$title = screen_name or tool_name` | tracker.py:211 |
| 4 | `error_type="ErrorString"` / `error_message=result[:200]` for soft errors | tracker.py:187-189 |
| 5 | `$pageview` event with `$current_url`, `$pathname`, `$host` | tracker.py:213-223 |
| 6 | `$web_vitals` event with `performance_rating` buckets | tracker.py:224-241 |
| 7 | `$browser` / `$browser_version` in main and exception paths | tracker.py:181-182, 256-257 |
| 8 | `$ip` from proxy headers (X-Forwarded-For / X-Real-IP) | tracker.py:58-76, 170, 184 |
| 9 | `distinct_id = username` for tool call, `$pageview`, `$web_vitals`, exception | tracker.py:140, 212, 215, 230 |

## 3. REMAINING work

### Task R1 — Align feedback `distinct_id` with the rest of the codebase

| Field | Value |
|---|---|
| File | `/Users/isolomatov/Sources/GAIN/rosetta/ims-mcp-server/ims_mcp/services/feedback.py` |
| Current (line 27) | `distinct_id = f"{call_ctx.username}@{call_ctx.repository}"` |
| Target | `distinct_id = call_ctx.username` |
| Spec section | SPECS §4.1, §4.2 |
| Risk | Low. Single-line semantic change. PostHog will recognize the user under the canonical `username` identity going forward. Historical feedback events under the old composite ID remain in PostHog and can be merged via PostHog Persons "Merge identities" if desired (out of scope here). |
| Why | A user submitting feedback from repo A and tool calls from repo B currently appears as two different PostHog Persons. After the fix all events from the same authenticated user collapse onto one identity, restoring per-user funnels and retention. |

Acceptance:
- `feedback.py` line setting `distinct_id` matches `tracker.py:212` semantics (just `username`).
- No other PostHog `capture` / `capture_exception` calls in the repo use a composite `username@repository` distinct_id.

### Task R2 — Verification (no code change, validation only)

1. Grep the repo for `distinct_id` to confirm only `username` (or equivalent) is used everywhere.

   Expected matches: `tracker.py` (4 sites), `feedback.py` (1 site after fix). No `@` in any `distinct_id` expression.

2. Grep for `"@"` near `username` / `repository` to catch any lurking composite identities (none expected).

3. Manual smoke check (optional, requires a non-disabled PostHog key):
   - Fire one tool call and one feedback submission as the same user.
   - In PostHog, confirm both events land under the same Person.

## 4. Out of scope

- Backfilling or merging historical PostHog identities created with the old composite `username@repository` distinct_id. This is a PostHog dashboard operation, not a code change.
- Adding new events or properties beyond the legacy parity contract.
- Frontend / docs analytics.
- Refactoring `tracker.py` (e.g., extracting a shared `build_props` helper). Optional; not required by this plan.

## 5. Sequencing & checkpoints

1. Apply R1 (single-line edit in `feedback.py`).
2. Run R2 verification (grep + read).
3. Run existing test suite for `ims-mcp-server` (no test changes expected; if any test pinned the composite distinct_id, update it to assert the canonical `username` per SPECS §4.1).
4. HITL approval before merging.

## 6. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| A test asserts the old `username@repository` distinct_id and starts failing. | Low | Update the assertion to match SPECS §4.1; reference this plan in the commit message. |
| Historical PostHog dashboards segmented by the old composite ID look discontinuous. | Medium | Document the cutover date; offer a one-time PostHog identity merge as a follow-up. |
| Other future emitters reintroduce the composite pattern. | Low | SPECS §4.2 invariant + R2 grep can be added to CI as a lightweight guard later (out of scope here). |

## 7. Traceability

| Plan task | Spec section | Acceptance criterion |
|---|---|---|
| R1 | §4.1, §4.2, §5.5 | A1 |
| R2 | §4.2 | A1 |
