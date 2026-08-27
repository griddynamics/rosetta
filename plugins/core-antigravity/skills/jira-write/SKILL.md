---
name: jira-write
description: "To post an issue-tracker comment, transition an issue, or reassign an issue after content-level safety checks. Write-capable counterpart to data-collection's read-only issue binding."
---

<jira_write>

<role>

Write-capable counterpart to `data-collection`'s read-only issue vendor binding. Composes exactly what the caller already decided to write, gates it, writes it, reports what happened — never decides content itself.

</role>

<when_to_use_skill>

Load when a workflow phase has already produced the exact comment body or target transition name and needs it posted to the configured Issue Tracker. Not for deciding what to write, not for reading issue content (USE SKILL `data-collection` for that).

</when_to_use_skill>

<core_concepts>

- Write ops are named by capability, resolved to whatever Issue Tracker integration is configured — never hardcode a specific tool name or session-specific server ID into this skill; the operations table below names capabilities, not literal tool identifiers.
- Never assume the writing identity equals the requester's identity, or vice versa. Whichever Jira account is actually connected performs the write; resolve and record that real identity, never an assumed one.
- Identity is a session/connection-level fact (which account the configured Issue Tracker integration is authenticated as) — not something this skill or any file in this deployment configures or changes. To act as a different account, reconnect the integration under that account's credentials; nothing here needs to change as a result.
- Compose → gate → write → report. This skill never invents comment text or picks a transition on its own; the caller supplies both.

</core_concepts>

<dangerous_actions_gate>

MUST USE SKILL `dangerous-actions` before any write: assess blast radius (is this specific comment/transition/reassignment safe to make — a live, shared Jira ticket is exactly the "touches a shared/live system" class it exists to catch), consider the opposite (what if this comment/transition/reassignment is wrong), consider safer alternatives.

`POC-SCOPE-OVERRIDE:` this build skips step 5 of `dangerous-actions` ("MUST REQUIRE EXPLICIT user approval") and `hitl`'s "dangerous actions ALWAYS require explicit approval" rule, for these three write operations only. `post comment`, `transition issue`, and `reassign issue` are all unattended/autonomous by design (per the approved implementation brief): the requester is the same person driving this build, any bad write is manually revertible, and downstream stages (spec approval, plan approval, commit approval) keep a human in the loop before anything reaches code. The content-level blast-radius check (steps 1-4) still runs — this override removes only the human-confirmation step. To restore human confirmation: delete this paragraph, re-enable step 5 in the calling phase (`triage-flow-publish-questions.md`, `triage-flow-assess.md`), and flip `confirmation_gate_override.writes_require_human_confirmation` to `true` in the deployment config file.

</dangerous_actions_gate>

<operations>

| Capability | Resolves to (configured Issue Tracker integration) |
|---|---|
| read current identity | "who am I" / "get current user" operation (e.g. the integration's own "myself"-style endpoint); run once per invocation, before the first write |
| post comment | "add comment" operation; returns the new comment's ID — MUST be captured, it is the idempotency anchor for the calling flow |
| transition issue | "transition issue" operation; MUST be called only with a transition ID already resolved via "read available transitions" — never guess or hardcode an ID |
| read available transitions | "get transitions" operation; run before every transition attempt |
| reassign issue | "update issue" / "assign issue" operation, setting the assignee field to the caller-supplied account ID; MUST be called only with an account ID already known (from config or caller), never resolved by guessing a display name |
| read comments | do not duplicate — reuse `data-collection`'s existing issue retrieval, which already reads comments |

</operations>

<process>

1. Receive from caller: target issue key, and either (a) the exact comment body (already redacted per `sensitive-data`), (b) the target transition's human-readable name, or (c) the target reassignee's exact account ID.
2. Resolve the real connected identity via "read current identity" (once per invocation, not once per write); record it — never assume it.
3. USE SKILL `dangerous-actions` for the content-level check (see gate above).
4. For a comment: call the configured "add comment" operation with the exact body given; capture the returned comment ID; return it to the caller.
5. For a transition: call "get transitions" first; resolve the target name to a transition ID from that result; if no match, follow the failure path below (do not force or guess); otherwise call "transition issue" with the resolved ID.
6. For a reassignment: call the configured "assign issue" operation with the caller-supplied target account ID; confirm the operation's response reflects the new assignee before reporting success.
7. Report exactly what was written (comment ID, transition ID + resulting status, or reassignment target account ID) plus the resolved identity from step 2 — never claim success on an unconfirmed write.

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

</pitfalls>

<resources>

- Reference `references/jira-write-vendor-binding.md` for the Jira-specific input parsing, failure paths, and validation items.

</resources>

</jira_write>
