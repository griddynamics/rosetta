# PostHog Analytics — Tech Specs

## 1. Purpose

Define WHAT must be tracked in PostHog from the Rosetta MCP server, and WHY each piece of data is captured. Specifications restore parity with the legacy `server.py` (tag `instructions-2026-03-04-4f75836`) and codify the contract used by all analytics emitters in the codebase.

## 2. Scope

In scope:
- Identity contract for PostHog (`distinct_id`).
- Event catalogue (tool call, `$pageview`, `$web_vitals`, error/exception, `feedback_submitted`).
- Required properties per event.
- Property derivation rules (e.g. `$screen_name`, `$title`, `performance_rating`).

Out of scope:
- PostHog server selection, project keys, key rotation.
- Frontend / docs site analytics.
- Funnels, dashboards, and retention queries (consumers of this contract).

## 3. Source of truth (verified)

- Legacy reference: `server.py` from tag `instructions-2026-03-04-4f75836`.
- Current implementation: `/Users/isolomatov/Sources/GAIN/rosetta/ims-mcp-server/ims_mcp/analytics/tracker.py`.
- Feedback emitter: `/Users/isolomatov/Sources/GAIN/rosetta/ims-mcp-server/ims_mcp/services/feedback.py`.

## 4. Identity contract

### 4.1 `distinct_id`

| Aspect | Specification |
|---|---|
| Format | `username` (string only) |
| Source | `get_authenticated_identity(call_ctx, ctx)` |
| Stability | Stable per authenticated user across sessions and repositories. |
| Why | A user contributes from many repositories; using `username@repository` would split a single human into N PostHog identities and break MAU/DAU, retention, and per-user funnels. |

### 4.2 Identity invariant

All PostHog `capture()` and `capture_exception()` calls in the codebase MUST use the same `distinct_id` derivation. Any divergence is a defect.

Verified emitters that MUST comply:
- `tracker.track_tool_call` — tool call event, `$pageview`, `$web_vitals` (compliant: tracker.py:212, 215, 230).
- `tracker.capture_error_to_posthog` — exception (compliant: tracker.py:140).
- `services.feedback.FeedbackService.submit` — `feedback_submitted` (NON-compliant: feedback.py:27 uses `f"{call_ctx.username}@{call_ctx.repository}"`).

Acceptance: a single user firing both tool calls and feedback events appears as ONE `distinct_id` in PostHog Persons.

## 5. Event catalogue

The server MUST emit the following events. Property tables list the minimum required set; additional tool-specific kwargs flow through (technical params stripped by `before_send_hook` per `TECHNICAL_PARAMS`).

### 5.1 Event: `{tool_name}` (the tool call itself)

| Property | Type | Source | Required | Why |
|---|---|---|---|---|
| `username` | string | authenticated identity | yes | Person grouping. |
| `repository` | string | `get_repository_from_context(ctx)` | yes | Per-repo segmentation. |
| `mcp_server` | string | `ANALYTICS_MCP_SERVER` | yes | Distinguishes Rosetta from other MCPs. |
| `mcp_tool` | string | `func.__name__` | yes | Tool-level breakdown. |
| `mcp_server_version` | string | `__version__` | yes | Version cohorts. |
| `$session_id` | string | `get_session_id(ctx)` | yes | PostHog session stitching. |
| `duration_ms` | number | wall clock around tool body | yes | Latency analysis. |
| `status` | enum `success`\|`error` | `result.startswith("Error:")` test | yes | Error rate. |
| `$browser` | string | `agent_name` from ctx | yes | Coding agent (Claude, Cursor, …) breakdown. |
| `$browser_version` | string | `agent_version` from ctx | yes | Agent version cohorts. |
| `$referring_domain` | string | `repository` | yes | PostHog Web Analytics treats this as referring source; we co-opt it for repo. |
| `$ip` | string | `get_client_ip()` | optional | Geo/IP context, only when proxy headers present. |
| `$screen_name` | string | derived (see 6.1) | optional | Used as page identifier in PostHog product surfaces. |
| `$title` | string | `screen_name or tool_name` | yes | PostHog UI title. |
| `error_type` | string | `"ErrorString"` | required if status=error | Error class. |
| `error_message` | string | `result[:200]` | required if status=error | Error sample. |
| (kwargs) | any | call kwargs minus `{ctx, config, call_ctx}` and minus `TECHNICAL_PARAMS` | passthrough | Tool-specific filters. |

### 5.2 Event: `$pageview`

Emitted alongside every tool call to populate PostHog Web Analytics (Pages, Paths).

| Property | Value |
|---|---|
| `$current_url` | `mcp://rosetta/{tool_name}{?q=screen_name}` |
| `$pathname` | `/{tool_name}` |
| `$host` | `mcp.rosetta` |
| (all properties from 5.1) | merged via `**props` |

### 5.3 Event: `$web_vitals`

Emitted alongside every tool call to populate PostHog Web Vitals dashboards.

| Property | Value |
|---|---|
| `$web_vitals_LCP_value` | `duration_ms` |
| `$web_vitals_LCP_event` | `"mcp-operation"` |
| `$current_url` | as in 5.2 |
| `$pathname` | as in 5.2 |
| `$host` | `"mcp.rosetta"` |
| `performance_rating` | enum `good` (<500 ms) \| `needs-improvement` (<2000 ms) \| `poor` (>=2000 ms) |
| (all properties from 5.1) | merged via `**props` |

### 5.4 Event: exception (via `capture_exception`)

Emitted when the tool wrapper catches an unhandled exception.

| Property | Value |
|---|---|
| `tool_name` | `func.__name__` |
| `error_type` | `type(exc).__name__` |
| `error_message` | `str(exc)[:200]` |
| `status` | `"error"` |
| `username`, `repository`, `duration_ms`, `mcp_server`, `mcp_server_version`, `$session_id`, `$browser`, `$browser_version` | from context dict |
| `$ip` | optional (when proxy headers present) |

### 5.5 Event: `feedback_submitted`

Emitted by `FeedbackService.submit`.

| Property | Value |
|---|---|
| `request_mode` | string from caller |
| `username` | `call_ctx.username` |
| `repository` | `call_ctx.repository` |
| `mcp_server` | `ANALYTICS_MCP_SERVER` |
| `mcp_server_version` | `__version__` |
| `$session_id` | `get_session_id()` |
| (feedback payload) | `**feedback` spread |

## 6. Derivation rules

### 6.1 `$screen_name`

First match wins, value truncated/joined as specified:

1. `kwargs["query"]` → `str(value)[:100]`
2. `kwargs["title"]` → `str(value)[:100]`
3. `kwargs["document_id"]` → `str(value)`
4. `kwargs["document_ids"]` (list) → `", ".join(str(i) for i in ids[:5])`
5. `kwargs["tags"]` (list) → `", ".join(str(t) for t in tags[:5])`
6. `kwargs["filters"]` (dict) → `", ".join(f"{k}={v}" for k, v in items[:3])`
7. otherwise → unset (and `$title` falls back to `tool_name`).

### 6.2 `$title`

`$title = $screen_name or tool_name` (always set).

### 6.3 `performance_rating`

Web Vitals LCP-style buckets:
- `good` if `duration_ms < 500`
- `needs-improvement` if `500 <= duration_ms < 2000`
- `poor` otherwise.

### 6.4 Property hygiene

`before_send_hook` strips keys in `TECHNICAL_PARAMS` from outgoing event properties. Any new technical kwargs MUST be added there, not filtered ad hoc.

## 7. Compliance matrix (current state)

Legend: DONE — verified in working tree; GAP — missing or incorrect.

| Spec section | Status | Evidence |
|---|---|---|
| 4.1 distinct_id = `username` (tool call) | DONE | tracker.py:212 |
| 4.1 distinct_id = `username` (`$pageview`) | DONE | tracker.py:215 |
| 4.1 distinct_id = `username` (`$web_vitals`) | DONE | tracker.py:230 |
| 4.1 distinct_id = `username` (exception) | DONE | tracker.py:140 |
| 4.1 distinct_id = `username` (feedback) | GAP | feedback.py:27 uses `f"{username}@{repository}"` |
| 5.1 `$browser` / `$browser_version` | DONE | tracker.py:181-182, 256-257 |
| 5.1 `$referring_domain` = repository | DONE | tracker.py:183 |
| 5.1 `$ip` from proxy headers | DONE | tracker.py:170, 184 |
| 5.1 `error_type` / `error_message` on soft error | DONE | tracker.py:187-189 |
| 5.1 `$screen_name` derivation | DONE | tracker.py:190-210 |
| 5.1 `$title` fallback | DONE | tracker.py:211 |
| 5.2 `$pageview` event | DONE | tracker.py:213-223 |
| 5.3 `$web_vitals` event with `performance_rating` | DONE | tracker.py:224-241 |
| 5.4 exception event with `$browser` etc. | DONE | tracker.py:246-260 |
| 5.5 `feedback_submitted` properties | DONE | feedback.py:18-26 |

## 8. Acceptance criteria

A1. For a synthesized user `u` calling tool `t` and submitting feedback, exactly ONE `distinct_id == "u"` appears in PostHog Persons across all 5 events.

A2. `$pageview` and `$web_vitals` are emitted for every successful and soft-error tool call (not for exception path — matches legacy behavior).

A3. `performance_rating` is one of `good | needs-improvement | poor` for every `$web_vitals` event.

A4. `$browser` and `$browser_version` are populated whenever `ctx` carries agent info; absent values do not break capture.

A5. Soft errors (result starting with `"Error:"`) carry `status=error`, `error_type="ErrorString"`, `error_message=result[:200]`; exceptions carry `error_type=type(exc).__name__`.

A6. `before_send_hook` strips every key in `TECHNICAL_PARAMS` from outgoing properties.

## 9. Open questions / decisions captured

- D1. We deliberately co-opt `$referring_domain` to carry `repository` so PostHog Web Analytics groups traffic by repo without a custom dashboard.
- D2. `$current_url` uses the synthetic scheme `mcp://rosetta/{tool_name}` to leverage PostHog Pages without colliding with real web traffic.
- D3. `distinct_id` is `username` only (NOT `username@repository`); identity must NOT be tenant-scoped, otherwise per-user metrics fragment.
