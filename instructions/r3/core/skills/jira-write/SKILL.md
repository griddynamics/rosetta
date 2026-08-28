---
name: jira-write
description: "To post, transition, reassign, create, or link issue-tracker issues after content-level safety checks; write counterpart to data-collection."
license: Apache-2.0
user-invocable: false
baseSchema: docs/schemas/skill.md
tags: []
---

<jira_write>

<role>

Write-capable counterpart to `data-collection`'s read-only issue vendor binding. Composes exactly what the caller already decided to write, gates it, writes it, reports what happened — never decides content itself.

</role>

<when_to_use_skill>

Load when a workflow phase has already produced the exact comment body or target transition name and needs it posted to the configured Issue Tracker. Not for deciding what to write, not for reading issue content (USE SKILL `data-collection` for that). Also load when a phase has already assembled a complete new-issue payload, or already decided which two issues to link and in which direction.

</when_to_use_skill>

<core_concepts>

- Write ops are named by capability, resolved to whatever Issue Tracker integration is configured — never hardcode a specific tool name or session-specific server ID into this skill; the operations table below names capabilities, not literal tool identifiers.
- Never assume the writing identity equals the requester's identity, or vice versa. Whichever Issue Tracker account is actually connected performs the write; resolve and record that real identity, never an assumed one.
- Identity is a session/connection-level fact (which account the configured Issue Tracker integration is authenticated as) — not something this skill or any file in this deployment configures or changes. To act as a different account, reconnect the integration under that account's credentials; nothing here needs to change as a result.
- Compose → gate → write → report. This skill never invents comment text or picks a transition on its own; the caller supplies both.

</core_concepts>

<dangerous_actions_gate>

MUST USE SKILL `dangerous-actions` before any write: assess blast radius (is this specific comment/transition/reassignment safe to make — a live, shared Issue Tracker ticket is exactly the "touches a shared/live system" class it exists to catch), consider the opposite (what if this comment/transition/reassignment is wrong), consider safer alternatives.

`POC-SCOPE-OVERRIDE:` this build skips step 5 of `dangerous-actions` ("MUST REQUIRE EXPLICIT user approval") and `hitl`'s "dangerous actions ALWAYS require explicit approval" rule, for these five write operations only. `post comment`, `transition issue`, `reassign issue`, `create issue`, and `link issues` are all unattended/autonomous by design (per the approved implementation brief): the requester is the same person driving this build, downstream stages (spec approval, plan approval, commit approval) keep a human in the loop before anything reaches code, and every one of these writes is manually revertible — with one named exception, below. This build additionally performs its own content-level risk check, mirroring `dangerous-actions` steps 1-4 (blast radius, never touch higher environments, consider the opposite, consider safer alternatives) — a check this build chose to keep, not one `dangerous-actions` licenses running standalone. This override removes only the human-confirmation step (step 5). **This flag is skill-wide, not per-operation**: `triage-flow` itself only ever calls `post comment`, `create issue`, and `link issues` — `transition issue` and `reassign issue` are unused by this build — but any future caller of `jira-write` under the same `confirmation_gate_override` inherits the identical unattended bypass for those two operations as well; scoping the override per-operation is deferred, not implemented. To restore human confirmation: delete this paragraph, re-enable step 5 in the calling phases (`triage-flow-publish-questions.md`, `triage-flow-assess.md`, `triage-flow-create-tool-issue.md`), and flip `confirmation_gate_override.writes_require_human_confirmation` to `true` in the deployment config file.

`create issue` is the exception: it is not manually revertible. This binding has no delete, so a wrongly-created issue can only be closed or marked obsolete by a human and keeps its key forever. Its blast-radius check therefore carries an extra requirement the override does not lift: the caller MUST state, as part of the request, which duplicate-prevention check it ran and what that check found. A `create issue` request arriving without that evidence is refused — the absence of a "this already exists" signal is not the same as a check that looked and found nothing.

Gate cadence for a create-then-link pair: this gate runs once per invocation of this skill, on the same "once per invocation, not once per write" basis as the identity resolve in `<process>` step 2. A caller that creates an issue and then links it invokes this skill twice and passes the gate twice — there is no per-operation exemption. The link's own pass is bounded rather than a repeat of the first: its whole blast radius is "does this edge connect the two keys the caller named, in the direction the caller named." Its only permitted outcomes are proceed, or stop and report an issue-created-but-unlinked state to the caller — never a silent skip, since declining a link on an issue that already exists strands it, which is worse than the link.

</dangerous_actions_gate>

<operations>

| Capability | Resolves to (configured Issue Tracker integration) |
|---|---|
| read current identity | "who am I" / "get current user" operation (e.g. the integration's own "myself"-style endpoint); run once per invocation, before the first write |
| post comment | "add comment" operation; returns the new comment's ID — MUST be captured, it is the idempotency anchor for the calling flow |
| transition issue | "transition issue" operation; MUST be called only with a transition ID already resolved via "read available transitions" — never guess or hardcode an ID |
| read available transitions | "get transitions" operation; run before every transition attempt |
| reassign issue | "update issue" / "assign issue" operation, setting the assignee field to the caller-supplied account ID; MUST be called only with an account ID already known (from config or caller), never resolved by guessing a display name |
| create issue | "create issue" operation, called with a payload the caller fully specified (project, issue type, summary, description, custom fields, optional assignee account ID); MUST be preceded by "read create field options" for that project + issue type in the same invocation; returns the new issue's key — MUST be captured and handed back the moment it returns, ahead of any follow-up write, because nothing in this binding can delete a created issue |
| read create field options | "get create metadata" / "issue type meta with fields" operation; run before every create, to confirm the target project accepts each field in the payload and that every select / cascading-select option value the caller supplied exists in *that project's* field context — an option available in the source issue's project is not automatically available in the target's |
| link issues | "create issue link" operation, called with a link type name already resolved via "read available link types", plus the caller's inward and outward issue keys in the caller's stated order; this skill never re-orders them — direction is what gives the relationship its meaning |
| read available link types | "get issue link types" operation; run before every link attempt to resolve the caller's link type name; link type IDs are instance-specific — never guess, hardcode, or reuse one cached from a prior run |
| read comments | do not duplicate — reuse `data-collection`'s existing issue retrieval, which already reads comments |

</operations>

<process>

1. Receive from caller: target issue key, and either (a) the exact comment body (already redacted per `sensitive-data`), (b) the target transition's human-readable name, (c) the target reassignee's exact account ID, (d) a complete create payload (project, issue type, summary, description, custom fields, optional assignee account ID) plus the caller's duplicate-prevention evidence and its stated degradation rule for optional fields, or (e) a link request (link type name, inward key, outward key).
2. Resolve the real connected identity via "read current identity" (once per invocation, not once per write); record it — never assume it.
3. USE SKILL `dangerous-actions` for the content-level check (see gate above — once per invocation, so a create-then-link pair passes it twice).
4. For a comment: call the configured "add comment" operation with the exact body given; capture the returned comment ID; return it to the caller.
5. For a transition: call "get transitions" first; resolve the target name to a transition ID from that result; if no match, follow the failure path below (do not force or guess); otherwise call "transition issue" with the resolved ID.
6. For a reassignment: call the configured "assign issue" operation with the caller-supplied target account ID; confirm the operation's response reflects the new assignee before reporting success.
7. For a create: call "read create field options" for the target project + issue type first; confirm every field in the payload is accepted there and every select / cascading option value exists in that project's field context. A value that is not available → apply the caller's stated degradation rule (omit, or stop) — never substitute a nearby value and never invent a cascading child. Then call "create issue" with the verified payload; capture the returned key, derive its browse URL, and return both to the caller as the first thing reported — including when a later operation in the same invocation fails.
8. For a link: call "read available link types" first and resolve the caller's link type name against that result; no match → follow the failure path (never approximate to a similar-sounding phrase). Then call "create issue link" with the resolved type and the caller's inward/outward keys in the caller's order; confirm the response reflects the link before reporting success.
9. Report exactly what was written (comment ID, transition ID + resulting status, reassignment target account ID, created issue key + URL, or link ID + both endpoint keys) plus the resolved identity from step 2 — never claim success on an unconfirmed write. On a failed create-then-link pair, report the created key first and the link failure second.

</process>

<identity_note>

Record the *resolved* Jira account identity (from step 2 of `<process>`, never an assumed one) into the caller's flow-state file's Identity section. Never write or assume `agent_identity == requester_identity`; the idempotency logic in the calling workflow already avoids this assumption by comparing comment IDs, not authors — do not reintroduce an author-based check here or anywhere downstream.

</identity_note>

<pitfalls>

- Posting a comment before it has passed `sensitive-data` redaction.
- Calling "transition issue" with a guessed or previously-cached transition ID instead of re-reading available transitions.
- Treating "no error returned" as "a human reviewed this" — no human review happens in this build; only the content-level gate did.
- Reintroducing an author-based idempotency check inside this skill or its caller.
- Skipping the identity resolve step and writing under whatever identity happens to be connected without recording it.
- Calling "assign issue" with a guessed or display-name-resolved account ID instead of the exact account ID supplied by config/caller.
- Creating an issue on the strength of "the caller did not say it already exists" instead of a stated duplicate-prevention result — there is no delete here and a duplicate key is permanent.
- Substituting a nearby option value, or dropping a cascading option's child, when the caller's exact value is missing from the target project's field context, instead of applying the caller's stated degradation rule.
- Reporting a failed create-then-link pair without the issue key the create already returned — the caller cannot resume what it was never told about.
- Reordering a link's inward/outward keys so the relationship phrase scans better; reversing them inverts the meaning.
- Retrying a create after an ambiguous transport failure, the way a comment post is retried — that is how two issues get created.

</pitfalls>

<resources>

- Reference `references/jira-write-vendor-binding.md` for the Jira-specific input parsing, failure paths, and validation items.

</resources>

</jira_write>
