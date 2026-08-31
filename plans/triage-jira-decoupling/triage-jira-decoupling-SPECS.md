<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# Tech Spec — decouple triage-flow / jira-write / data-collection from live Jira connectivity (WHAT)

Companion: `triage-jira-decoupling-PLAN.md` (HOW/sessions). Background: `discovery-notes.md`. Scope: rosetta repo only — `tools-harness-intake/triage.yml` is a consumer of this contract, not edited here.

</CRITICAL>

## FR-1 — Delete the MCP-based Jira connection

- Delete `.mcp.json` (its only entry is `jira-service-account`).
- Delete `agents/jira-mcp-auth-header.sh`.
- Delete the `agents/jira-triage.secrets.json` entry from `.gitignore` (currently line 114) — no longer referenced by anything.
- Keep `agents/jira-triage.config.json`; edit per FR-6.

## FR-2 — Input file contract (replaces live reads)

One caller-supplied JSON file per invocation, path `<artifacts_dir>/<TICKET-KEY>/ticket-snapshot.json` (caller writes it before invoking Claude; this repo only consumes it). Required shape:

```
{
  "ticket_key": string,
  "reason": string,
  "summary": string,
  "description": string,
  "url": string,
  "status": string,
  "custom_fields": { "TSSM: Tool": string, "TSSM: Project": string, ... },
  "assignee_account_id": string | null,
  "comments": [ { "id": string, "author_account_id": string, "body": string, "created": string } ]
}
```

**Additive, not a replacement**: `data-collection` is shared by other workflows (aqa-flow, testgen-flow, qa-knowledge, requirements-authoring, ...) that still need its live-integration resolution — do not remove or gate that path. Add one new branch to `SKILL.md`'s resolution step (step 1): when the caller supplies a pre-fetched snapshot file path for a role, parse and normalize from that file instead of issuing a live call for that role, this invocation only; absent that input, behavior is unchanged. `references/issue-vendor-binding.md` gains an addendum: "when sourced from a caller-supplied snapshot file (shape below), map fields as follows" — alongside its existing live-call field map, not instead of it. Output shape (normalized snapshot, `sensitive-data` redaction pass) is identical either way. Missing required field (`ticket_key`, `comments` array itself — empty array is valid, absent key is not) → stop and report the named missing field; never proceed on partial data, never silently default.

`triage-flow.md` is the only caller that supplies this input today — it passes `ticket-snapshot.json`'s path to `data-collection`'s Issue Tracker role, triggering the new file-sourced branch.

`triage-flow.md` phase 1 (intake): drop the live JQL search. Replace with a local check — verify the snapshot's `status`/`custom_fields`/`assignee_account_id` satisfy the config's `jql` criteria (parsed as documented constraints, not executed as a query). Mismatch → same stop-and-report behavior as today's "zero matches." This check is defense-in-depth only: the real caller's trigger (Jira Automation webhook) already gates eligibility upstream (see discovery-notes.md); this flow must not assume that and must still refuse an ineligible snapshot.

## FR-3 — Output artifact contract (replaces live writes)

`jira-write` never performs a network operation. Per requested write, it composes the request, runs the unchanged content-level `dangerous-actions` gate (FR-4), then writes one JSON file: `<artifacts_dir>/<TICKET-KEY>/jira-writes/<NNN>-<op>.json`, `op ∈ {add_comment, transition, reassign, create_issue, link_issues}`:

```
{
  "op": string,
  "target_issue_key": string,
  "payload": { ... op-specific, same fields the caller supplies today ... },
  "composed_at": ISO8601
}
```

Reports the artifact's path back to the caller — **never** a comment ID, transition result, created key, or link ID; none exist until a future execution step (out of scope here) runs the write and reports back. `<operations>` table in `jira-write/SKILL.md` is rewritten: every row's "resolves to" column becomes "composed into `<NNN>-<op>.json`," not "operation."

**Field/option/link-type validation regression (residual risk, not solved here):** `read create field options` and `read available link types` were live pre-checks. `jira-write` can no longer run them. The compose step trusts the caller-declared payload as-is. Document this reduced guarantee explicitly in the skill's `<pitfalls>` — the eventual (out-of-scope) execution step MUST re-validate before sending, since this skill no longer can.

## FR-4 — `dangerous_actions_gate` rewording

Gate purpose narrows from "is this write safe to make" to "is this composed request safe to hand to an executor" — same content-level check (blast radius, opposite-case, safer alternatives), same `create issue` exception (duplicate-prevention evidence still REQUIRED from the caller at compose time, since the executor won't re-derive it and a duplicate key is still permanent once executed). Reword away from "these writes are... manually revertible" framing since this skill no longer performs the write — the reversibility claim belongs to whatever executes the artifact, not to this compose step. Keep `POC-SCOPE-OVERRIDE` skip-human-confirmation language, adjusted to describe skipping confirmation on the *compose*, not the write.

## FR-5 — Identity handling

Drop live "read current identity" entirely — nothing in-session can resolve it without a connection. `jira-write`'s `<identity_note>` is rewritten: identity is a static fact of whichever account the eventual executor's Jira secret authenticates as; this skill does not know it, does not need it to compose a request, and must not fabricate or assume one. Remove the "read current identity" row from `<operations>` and step 2 of `<process>`.

## FR-6 — `agents/jira-triage.config.json` edits

- `jql`: reword note — "documented eligibility criteria this flow checks locally against the input snapshot (FR-2); the calling Action SHOULD also enforce it upstream (defense in depth) before dispatch — this flow no longer executes it as a live query."
- `orchestrator_model_policy.required_tier`: `opus` → `sonnet` (matches triage.yml's actual `--model sonnet`). `on_violation: DEMAND_USER_SWITCH_MODEL` is meaningless in unattended CI (no human present) — change to `STOP_AND_REPORT`.
- `confirmation_gate_override`, `tool_issue_target`: unchanged, still accurate.

## FR-7 — `triage-flow.md` phase and state-file updates

- Phase 1 (intake): per FR-2 — reads snapshot file, local eligibility check, no live search/fetch.
- Phase 4 (publish_questions), phase 5 (assess), phase 6 (create_tool_issue): `jira-write` calls now return artifact paths, not IDs/keys/link IDs. State-file fields (`last_agent_comment_id`, `assessment_comment_id`, `tool_issue_key`, `tool_issue_url`, `link_id`) are recorded as `"pending — see <artifact path>"` at tick-end, not real values — this flow has no way to know the real values until a future tick's input snapshot reflects the executed result (e.g. the posted comment shows up in `comments[]` on the next invocation).
- `<idempotency>` section: unchanged in *logic* (compare newest comment ID to `last_agent_comment_id`) — but note the comparison now runs against the file-supplied `comments[]`, and `last_agent_comment_id` being `"pending"` on a resumed tick before the real ID is ever confirmed is an expected, valid state (not corruption) — a resumed tick with a still-`pending` id and no *new* comment author reads as "nothing new," same as today.
- `<subagent_policy>`, `<state_and_resumption>`, `<validation_checklist>`: strip every remaining "MCP tool"/"live" assumption; no logic change beyond FR-2/FR-3's artifact-vs-live substitution.
- `<out_of_scope>` gains one line: "Executing the composed `jira-writes/*.json` artifacts against real Jira, and feeding their results back into the next tick's input snapshot — a future Action-side step, cross-repo, not built here."

## Acceptance

- `git grep -i "mcp\|jira-service-account"` outside `.git`/`plans/` returns nothing under `.mcp.json`, `agents/jira-mcp-auth-header.sh` (files gone).
- `jira-write/SKILL.md` and its vendor-binding reference contain no "call the configured Issue Tracker integration" live-operation language — every write op description ends at "compose → gate → write artifact."
- `data-collection`'s issue-vendor-binding Jira read path parses the FR-2 file shape; no live search/fetch call remains in that binding.
- `triage-flow.md` phase 1/4/5/6 text is consistent with FR-2/FR-3/FR-7; no phase claims a captured ID/key it cannot actually have.
- `jira-triage.config.json`'s `orchestrator_model_policy.required_tier` = `sonnet`.
