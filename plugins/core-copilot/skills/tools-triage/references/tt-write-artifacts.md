<write_artifacts>

Output contract for every Issue Tracker write this work ever composes — comments, the target-project issue, and its link. There is no live connection anywhere, and there will not be one until a separate, out-of-scope executor is built. Every composing stage applies this contract directly.

<contract>

- **No live write, ever.** Every write decided here is composed into one JSON artifact at `<artifacts_dir>/<TICKET-KEY>/jira-writes/<NNN>-<op>.json`, `op ∈ {add_comment, create_issue, link_issues}`. This build never transitions and never reassigns. Shapes: READ SKILL FILE `assets/tt-write-artifact-templates.md`.
- **`NNN` sequencing.** The next unused three-digit sequence number in that ticket's `jira-writes` directory, zero-padded, starting at `001`: list the directory (create it when absent), take the highest existing number, use the next one. **Never reuse or guess a number.** A create composed earlier in the same invocation has already claimed one, so a link composed after it takes the next consecutive number.
- **Every artifact contains exactly** `op`, `target_issue_key`, `payload` (op-specific, the same fields the composing stage already has in hand), and `composed_at` (ISO8601).
- **Report the artifact path — never a live result.** The composing stage reports the path; the caller records the corresponding state field as `"pending — see <artifact path>"`. Never a real comment ID, transition result, created key, or link ID: none of those exist until an executor runs the artifact and reports back.

</contract>

<gate>

**Gate before compose, every time.** USE SKILL `dangerous-actions` immediately before composing any artifact: assess blast radius (a live, shared Issue Tracker ticket is exactly the "touches a shared/live system" class this gate exists to catch, even though composing an artifact here never itself touches it), consider the opposite (what if this composed request is wrong), consider safer alternatives. The gate asks "is this composed request safe to hand to a future executor", not "is this write safe to make" — this work never makes the write itself.

**Gate cadence.** Once per composed artifact. A create followed by a link runs it twice, never a shared pass. The link's own pass is bounded to "does this composed edge connect the two keys named, in the direction named"; its only outcomes are compose the link, or stop and report an issue-created-but-unlinked state — never a silent skip.

`POC-SCOPE-OVERRIDE:` this build skips `dangerous-actions` step 5 ("MUST REQUIRE EXPLICIT user approval") and `hitl`'s "dangerous actions ALWAYS require explicit approval" rule, for all three compose operations — unattended and autonomous **at compose time** by design, matching this work's overall unattended-CI posture. This override only ever governs whether an artifact gets composed and written to disk; it says nothing about whether executing that artifact later is safe or reversible — that judgment belongs to the future execution step, never to this compose step. To restore human confirmation: remove this `POC-SCOPE-OVERRIDE` paragraph and re-enable `dangerous-actions` step 5 in the composing stages. There is no config flag to flip — the override is this prose.

**`create_issue` is the one exception the override does not touch.** Composing its artifact does not make the eventual write safe or revertible: there is no delete, and a wrongly-created issue keeps its key forever once an executor runs it. The composing stage MUST therefore state, as part of its own compose, which duplicate-prevention check it ran and what it found. That evidence is REQUIRED at compose time and is never deferrable — it will not exist in any later context, and an executor cannot re-derive it. **A `create_issue` compose arriving without that evidence is refused.**

</gate>

<no_identity>

**No identity resolution, ever.** There is no live connection, and which account eventually executes a composed artifact is a static fact of whatever credential the execution step authenticates as — not of this work. Never fabricate, guess, or assume an identity value anywhere in a composed artifact or in the state file's `## Identity` section. No compose step reports a `resolved_acting_identity`.

</no_identity>

<questions_comment>

Composing the open-questions comment, reached only when open questions remain:

1. Read the open questions from the current requirements document. It is non-empty by construction — the completion check routes here only on that branch — so this stage never re-checks emptiness itself.
2. Compose a comment listing **only the questions still open**. Never re-ask a question the requester already answered in a prior iteration.
3. Gate, determine `NNN`, compose the `add_comment` artifact, write it, and capture the path.
4. Report that path for `last_agent_comment_id`, recorded as `"pending — see <artifact path>"`.
5. **This compose is the invocation's terminal action** — nothing runs after it.

</questions_comment>

<documented_regression>

Composing `create_issue` / `link_issues` trusts the caller-declared payload as-is. There is no live connection to pre-validate a custom-field option value or a link-type name against real Issue Tracker state before writing the artifact. An invalid value will compose successfully and will not surface until an executor attempts the real write. **The execution step MUST re-validate before sending.** This is a documented, residual regression — moved downstream, not solved here, and not closable by extra care at compose time.

</documented_regression>

<validation_checklist>

- Each composed artifact went through its own `dangerous-actions` pass, immediately before that compose.
- Every artifact carries all four required keys and lives at the sequenced path; no number was reused or guessed.
- Every reported output is an artifact path; no output names a comment ID, created key, URL, or link ID.
- Any `create_issue` artifact is accompanied by a compose-time statement of the duplicate-prevention check and its result.
- The questions comment re-asks nothing already resolved, and nothing ran after it in that invocation.

</validation_checklist>

<pitfalls>

- Composing a comment that re-lists questions the requester already answered.
- Reporting a real comment ID instead of the `"pending — see <artifact path>"` sentinel.
- Reporting or assuming a `resolved_acting_identity` from a compose step.
- Running one `dangerous-actions` pass and treating it as covering both halves of a create-then-link pair.
- Reading the override as permission to skip the gate itself. The gate always runs; only the human-confirmation step is skipped.
- Treating the missing live field/option validation as something extra care at compose time can close.

</pitfalls>

</write_artifacts>
