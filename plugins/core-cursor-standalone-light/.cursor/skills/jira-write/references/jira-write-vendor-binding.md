# Vendor binding: Issue vendor (write)

**Canonical Issue Tracker example: Jira.** The worked key/URL shapes below illustrate Jira. For another Issue Tracker, preserve the role contract and adapt handles/URLs, requests/calls, and terminology to that system.

**Operations below are named by capability, not by a fixed tool name.** Resolve each through the configured Issue Tracker integration: **read current identity**, **add comment**, **transition** (requires **get transitions** first to resolve the target status name to a transition ID), **reassign** (sets the assignee to a caller-supplied account ID). This binding is the write-capable counterpart to `data-collection`'s `issue-vendor-binding.md`, which explicitly forbids these write operations in its read-only scope.

---

## Input parsing

Same identifier rules as the read-only binding: plain key (`PROJ-123`), or a browse URL parsed to its key segment. Ambiguous/missing/malformed → stop per failure path "input-unresolvable"; never guess or pick an arbitrary issue.

## Identity resolution

- **Read current identity**: call the integration's "who am I" / "get current user" capability (e.g. Jira's own "myself"-style endpoint) once per invocation, before the first write. Returns the account actually authenticated — this is a read, not a write. Record this value; never assume it or infer it from elsewhere.

## Write operations

- **Add comment**: post the exact body handed down by the caller (already redacted). The operation's response MUST include the new comment's ID — capture it and return it to the caller; this ID is the sole idempotency anchor the calling workflow persists (`last_agent_comment_id`).
- **Transition**: call **get transitions** first to list the transitions actually available on the current issue status. Resolve the caller's target transition name (e.g. "Ready for Implementation") to its transition ID from that result. If the name has no match, follow the failure path below — never invent, hardcode, or reuse a cached transition ID from a prior run, since transition IDs are workflow-specific and can differ per issue type/project.
- **Reassign**: set the issue's assignee to the caller-supplied account ID (never a display name — resolving/validating a name to an ID is the caller's responsibility; this binding does not look up users). The operation's response MUST reflect the new assignee — capture and report it. If the account ID is invalid, not found, or unassignable to this issue/project, follow the failure path below.

## Redaction targets

This binding never redacts — it only refuses to post content that has not already passed `sensitive-data`. Fail-closed: if the caller cannot confirm the body was redacted, stop and report rather than posting.

## Failure paths

- **"Read current identity" transport/auth error** → retry once, then stop + report; never proceed to write with identity unresolved.
- **Comment-post transport error** → retry once, then stop + report; do not silently drop the write.
- **Target transition not found in "get transitions" result** → stop, report the available transitions by name, do not force a transition or approximate to the closest one.
- **Authorization failure** (401/403 or provider equivalent) → stop, report that the write was rejected and the connected account may lack write permission; never retry a write blindly on an auth failure.
- **Partial write** (e.g. comment posted but ID not returned) → stop and report the ambiguity explicitly; never assume success without a captured ID.
- **Reassign target invalid or unassignable** (account ID not found, or the issue's project doesn't allow that assignee) → stop, report the account ID and issue key, never fall back to a different assignee or leave assignment ambiguous.

## Validation items (binding-specific, added to `jira-write`'s process)

- Comment ID captured and handed back to the caller on every successful "add comment" call.
- Transition ID resolved from a fresh "get transitions" call on every transition attempt, never reused across ticks.
- "Read current identity" ran once per invocation before the first write, and its result — not an assumed value — was recorded.
- No write attempted on unredacted content.
- Reassignment confirmed via the operation's response (new assignee reflected), never assumed from "no error returned".
