# Vendor binding: Issue vendor (write)

**Canonical Issue Tracker example: Jira.** The worked key/URL shapes below illustrate Jira. For another Issue Tracker, preserve the role contract and adapt handles/URLs, requests/calls, and terminology to that system.

**Operations below are named by capability, not by a fixed tool name.** Resolve each through the configured Issue Tracker integration: **read current identity**, **add comment**, **transition** (requires **get transitions** first to resolve the target status name to a transition ID), **reassign** (sets the assignee to a caller-supplied account ID), **create issue** (requires **read create field options** first for the target project + issue type), and **link issues** (requires **read available link types** first). This binding is the write-capable counterpart to USE SKILL `data-collection`'s read-only issue binding, which explicitly forbids these write operations in its scope.

---

## Input parsing

Same identifier rules as the read-only binding: plain key (`PROJ-123`), or a browse URL parsed to its key segment. Ambiguous/missing/malformed → stop per failure path "input-unresolvable"; never guess or pick an arbitrary issue.

## Identity resolution

- **Read current identity**: call the integration's "who am I" / "get current user" capability (e.g. Jira's own "myself"-style endpoint) once per invocation, before the first write. Returns the account actually authenticated — this is a read, not a write. Record this value; never assume it or infer it from elsewhere.

## Write operations

- **Add comment**: post the exact body handed down by the caller (already redacted). The operation's response MUST include the new comment's ID — capture it and return it to the caller; this ID is the sole idempotency anchor the calling workflow persists (`last_agent_comment_id`).
- **Transition**: call **get transitions** first to list the transitions actually available on the current issue status. Resolve the caller's target transition name (e.g. "Ready for Implementation") to its transition ID from that result. If the name has no match, follow the failure path below — never invent, hardcode, or reuse a cached transition ID from a prior run, since transition IDs are workflow-specific and can differ per issue type/project.
- **Reassign**: set the issue's assignee to the caller-supplied account ID (never a display name — resolving/validating a name to an ID is the caller's responsibility; this binding does not look up users). The operation's response MUST reflect the new assignee — capture and report it. If the account ID is invalid, not found, or unassignable to this issue/project, follow the failure path below.
- **Create issue**: call **read create field options** for the target project key + issue type first, and confirm both that every field in the caller's payload sits on that project's create screen and that every select / cascading-select option value the caller supplied exists in *that project's* field context — an option present on the source issue is not automatically available in the target project. Then create with the verified payload: project, issue type, summary, description, plus any custom fields and an optional assignee account ID (never a display name — same rule as **Reassign**; this binding does not look up users). The response MUST include the new issue's key; derive the browse URL from that key. Capture both and hand them back to the caller before attempting anything else in the same run. If the response carries no key, treat it as a partial write per the failure path — never re-issue the create to "get a key", because the first one may have succeeded.
- **Link issues**: call **read available link types** first and resolve the caller's link type name (e.g. "Action item") against that result — link type IDs are instance-specific and MUST NOT be hardcoded or carried over from a prior run, exactly as with transition IDs. Then create the link with the caller's inward and outward keys in the caller's stated order; this binding never re-orders them, because direction is what the relationship means (inward = the issue that *is* the action item; outward = the issue it came *from*). The response MUST confirm the link — capture its ID and both endpoint keys and return them. Never re-issue a link on an ambiguous response; report the ambiguity instead.

## Redaction targets

This binding never redacts — it only refuses to post content that has not already passed `sensitive-data`. Fail-closed: if the caller cannot confirm the body was redacted, stop and report rather than posting. A created issue's **description** is the same class of content as a comment body: this binding never redacts it, and refuses to create when the caller cannot confirm the body already passed `sensitive-data`. Fail-closed, same as a comment.

## Failure paths

- **"Read current identity" transport/auth error** → retry once, then stop + report; never proceed to write with identity unresolved.
- **Comment-post transport error** → retry once, then stop + report; do not silently drop the write.
- **Target transition not found in "get transitions" result** → stop, report the available transitions by name, do not force a transition or approximate to the closest one.
- **Authorization failure** (401/403 or provider equivalent) → stop, report that the write was rejected and the connected account may lack write permission; never retry a write blindly on an auth failure.
- **Partial write** (e.g. comment posted but ID not returned) → stop and report the ambiguity explicitly; never assume success without a captured ID.
- **Reassign target invalid or unassignable** (account ID not found, or the issue's project doesn't allow that assignee) → stop, report the account ID and issue key, never fall back to a different assignee or leave assignment ambiguous.
- **Create rejected on field validation** (an option value absent from the target project's field context, a field not on that project's create screen, or a required field the caller did not supply) → stop, report the exact field and the exact value rejected. Retry only when the caller has already stated a degradation rule for that field, and then exactly once with that field omitted — never with a substituted value and never with a second guessed option.
- **Create transport error** → do NOT retry, unlike a comment post. A create is the one operation here with no delete, and a retry after an ambiguous transport failure is how a duplicate is born. Stop, report the ambiguity, and tell the caller to check the target project for an issue matching this payload before any further attempt.
- **Create succeeded, link failed** (link transport error, or the link operation never ran) → this is an expected, resumable state, not a hard failure. Report the created issue key and URL *first*, then the link failure, and say plainly that the issue exists and is unlinked. The caller persists the key and completes the link on its next run; nothing here retries the create, and nothing here creates a replacement.
- **Link target not found** (either endpoint key rejected as non-existent or invisible to the connected account) → stop, report both keys and which one was rejected. Never create the missing endpoint, never substitute a different issue, never drop the link silently.
- **Link type name not found in the "read available link types" result** → stop, report the available link type names, do not approximate to the closest-sounding phrase.

## Validation items (binding-specific, added to `jira-write`'s process)

- Comment ID captured and handed back to the caller on every successful "add comment" call.
- Transition ID resolved from a fresh "get transitions" call on every transition attempt, never reused across ticks.
- "Read current identity" ran once per invocation before the first write, and its result — not an assumed value — was recorded.
- No write attempted on unredacted content.
- Reassignment confirmed via the operation's response (new assignee reflected), never assumed from "no error returned".
- Create preceded by a "read create field options" call for the actual target project + issue type on every attempt, never a cached or assumed field context.
- Created issue key and URL captured and handed back before any follow-up operation, and reported even when the run later failed.
- No create retried after an ambiguous transport failure.
- Link type resolved from a fresh "read available link types" call, never a reused ID.
- Link written with the caller's inward/outward order preserved exactly, and both endpoints reported so the direction is checkable.
