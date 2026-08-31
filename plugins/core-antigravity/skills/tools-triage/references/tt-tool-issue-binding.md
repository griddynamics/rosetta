<tool_issue_binding>

Compose the create-issue artifact for the corresponding Story in the target project, then the link artifact binding it back to the source ticket as an action item — **two separate composes, never one combined operation**, and neither performs a live write. The final action for a ticket that has just completed triage.

Everything in the new issue is copied, or lightly restated, from artifacts the earlier stages already produced — **this stage decides no content**. It is its own stage rather than part of the assessment because it composes the only irreversible write here: the binding has no delete, so a duplicate create artifact executed later is permanent, and it needs its own idempotency check.

It never comments on, reassigns, or transitions the source ticket. The link is the only mark it leaves there, once composable.

<resume_cases>

Read `## Tool Issue` from the state file and branch on exactly two fields, each recorded when present as `"pending — see <artifact path>"` rather than a real value:

- **Case A** — `tool_issue_key` absent → run everything below: probe, compose the description, compose the create artifact, then attempt the link.
- **Case B** — `tool_issue_key` present, `link_id` absent → **skip the probe, the description, and the create entirely** (never recompose a second create artifact, however a prior report reads) and resume at the link attempt.
- **Case C** — both present → this ticket is done as far as this work can take it. Report a no-op so the caller logs the invocation without rewriting `## Tool Issue`. Read nothing else, compose nothing at all.

Absent means missing or empty. **A field carrying a value — even the pending sentinel — is trusted and never re-derived or re-composed.** Do not "check whether the composed artifact still looks right": recomposing a create risks a second permanent issue once both are executed, and verifying is not this stage's job.

</resume_cases>

<link_probe>

Case A only. Check the already-redacted `ticket_details` text carried in state — no new read; there is no live connection to issue the check any other way — for the source ticket's existing issue links.

- This build's free-text input carries no guaranteed issue-links content, so **this probe will typically find nothing** to adopt unless the caller happens to mention an existing link. That is a known limitation of the current input, not a bug in this step; requiring the caller to always state existing links is out of scope.
- A link of the configured type already pointing from the source ticket to an issue in the target project → **adopt it**: record that issue's key and URL and the link's ID, and skip straight to the report. A prior run completed this work via a since-executed artifact and its state entry was lost.
- **This is a backstop for a lost state file, not the primary check** — the resume cases are. It detects only a fully-completed, already-executed prior run; it cannot see a create artifact composed but never executed, because there is nothing live to find in that state. That residual case is covered by the report-on-receipt rule below and by case B's deferred link attempt.
- **Probe read fails → stop and report.** Do not compose a create artifact on an unverified probe. A failed probe is unknown, not clear, and the next invocation can try again — whereas a duplicate create artifact, once executed, cannot be undone.

</link_probe>

<description>

Read the finalized requirements document — all `<req>` units `Approved`. Write the description as **exactly three parts, nothing else**:

1. **One or two sentences** naming what the feature is, in plain language, derived only from the source ticket's Summary and the `<req>` unit titles. No new facts, no scope the requirements do not carry, no restating the assessment's levels.
2. **A flat list of the requirement statements** — one line per `<req>` unit, that unit's title or statement verbatim. No acceptance criteria, no rationale, no elaboration, no per-unit commentary. A long statement is still copied, not summarized.
3. **One back-reference line**, `Source ticket: <ticket_key>`. It is what a human uses to trace the pair if the link write never lands.

Carry it into the payload as plain text, one item per line. Never hand-author rich-document markup (ADF or equivalent) — format conversion belongs to the execution step.

If an executor ever reports back that a created issue's description came through empty or mangled, that is a formatting defect on an issue that already exists by the time anyone can observe it. This stage cannot detect it at compose time, since it never sees the result of a create it composed. **Never compose a second create artifact over it.**

This is the stage's only composed content; everything else is copied. Aim at what a planning agent needs to recognize the item, not a re-derivation of the requirements document.

</description>

<target_constants>

Fixed settings for this build — hardcoded here, not read from any config, because this build has none. **Constants for this deployment: do not invent or vary them.**

- `project_key: TOOL`
- `issue_type: Story`
- `carry_fields: TSSM: Tool, TSSM: Project`
- `link_type: Action item`
- `link_inward: new_issue` — the created `TOOL` ticket is the inward issue, rendering "`<new TOOL ticket>` is action item from `<source ticket>`".

</target_constants>

<create_payload>

Assemble from the redacted `ticket_details` text plus the composed description:

- **Summary** — the source ticket's Summary, verbatim. Missing or empty → **stop and report**; never synthesize a title.
- **`TSSM: Tool`** — the source value. It is a cascading option: carry the parent and, when present, its child. **Never invent a child for a parent that has none, never drop a child that exists.**
- **`TSSM: Project`** — the source value as-is.
- **Assignee** — the source ticket's assignee account ID. **Only an exact account ID is usable**: a display name, a masked or redacted value, and `None -- unassigned` all count as absent. Never resolve a name to an ID, and never fall back to the connected write identity.
- **Description** — as composed above.

**Degradation rule.** Summary missing → stop, compose nothing. Any other field missing at source → omit that one field, compose the create artifact anyway, and record the omission as a gap in `field_gaps`. **Never substitute a nearby option value.** Reason, stated once: none of these fields is required by the target project, each is a one-click human fix afterward, and blocking the only durable deliverable on a metadata classification is worse than shipping it with a named gap. Summary is the exception because it is the issue's identity, and a mis-titled issue cannot be deleted.

**Gate, then compose**, per APPLY SKILL FILE `references/tt-write-artifacts.md`. Blast radius here includes a brand-new cross-project issue that keeps its key forever once created. The duplicate-prevention evidence that contract requires at compose time is **the resume case that fired plus the probe result** — refuse to compose without it.

**Report-on-receipt.** Report the artifact's path — **never a created issue key, URL, or created-at timestamp**; none of those exist until an executor runs the artifact. The moment the artifact is written, its path becomes this stage's most important output: if the link attempt then finds nothing composable, or room runs short, or anything else goes wrong, the artifact path still goes into the report ahead of everything else. **An unreported artifact path is a composed create nobody can find or resume from.**

</create_payload>

<link_attempt>

Cases A and B. **The link cannot be composed until a real target-project issue key is known.** The payload's `inward_key` must be an exact key, and no real key exists until an executor has actually run the create artifact and that result has been fed back into a later invocation's `ticket_details` input.

1. Check whether this invocation's `ticket_details` text, or state, names a real, confirmed key for the issue created from the artifact recorded under `tool_issue_key`. **In this build no such feedback path is wired up, so this check will not find one on any invocation — that is expected, not an error.**
2. **Real key found** → a SEPARATE `dangerous-actions` pass, never shared with the create's, bounded to "does this edge connect the two keys named, in the direction named". Then the next `NNN`, and compose the `link_issues` artifact per the templates. Capture the artifact's path — never a link ID; none exists until executed.
3. **Real key not found** (the expected case) → stop this step and report the create artifact's path alongside a note that the link remains uncomposable pending a confirmed key. **An expected resumable state, not a hard failure**: the next invocation reads `tool_issue_key` present and `link_id` absent, re-enters case B, and re-checks for a confirmed key without recomposing the create.
4. **Never answer an uncomposable link by composing a second create artifact.**

</link_attempt>

<report>

For `## Tool Issue`: the create artifact's path (for `tool_issue_key`, `tool_issue_url`, `tool_issue_created_at`, each recorded as `"pending — see <create-artifact-path>"`), the link artifact's path when one was composed (for `link_id`) or its absence with the reason, and every field gap from the degradation rule. Report no `resolved_acting_identity` — no identity is resolved here.

**A partial report is a valid report.** Create composed and link not yet composable → report the three create fields as pending, pointing at the create artifact, with `link_id` absent and the reason ("no confirmed key yet"). This is the one report here whose incomplete outcome still carries state that MUST be persisted; reporting the outcome without the create artifact's path is the exact bug this stage's two-step shape exists to prevent.

Both fields recorded, even as pending sentinels → report that flow status is now `COMPLETE`: both artifacts are composed and awaiting execution, never that the Issue Tracker has actually been updated.

</report>

<validation_checklist>

- At most one create-issue artifact per source ticket across all invocations, and the report names which check prevented a second one — the recorded sentinel, or the probe result.
- `tool_issue_key` recorded as the pending sentinel on every invocation where a create artifact was composed, including those whose link could not yet be composed.
- The reported or attempted link names both endpoints, so the direction is checkable and not merely asserted by an artifact path.
- Every field omitted from the create payload is named in the recorded gaps — an omission with no gap entry is indistinguishable from a field nobody meant to set.
- The description's requirement lines match the finalized requirements document's statements word for word; a reader can diff them.
- Case B ran with no create compose at all; case C ran with no compose call at all.
- No output claims a captured created key, URL, created-at timestamp, or link ID.

</validation_checklist>

<pitfalls>

- Treating an uncomposable link as a reason to re-run the whole stage, or to recompose the create — the create half is done and permanent once executed; only the link composition is outstanding.
- Recomposing a create because the recorded pending sentinel "looks stale", or because a real issue could not be confirmed to exist yet. A recorded sentinel is trusted exactly like a recorded key.
- Filling an unresolvable assignee with the connected write identity, so the new issue appears assigned to the agent's own account.
- Writing acceptance criteria, rationale, or the assessment's risk levels into the description.
- Commenting on either ticket. The link is the only signal left on the source ticket, once composable.
- Running on an invocation where the assessment did not run, on the assumption that the requirements "look done".
- Fabricating, guessing, or inferring a target-project issue key to unblock the link.
- Treating the missing live field/option validation as something extra care here can close — it is a documented, residual regression moved downstream.
- Composing a create without stating which duplicate-prevention check ran and what it found.

</pitfalls>

</tool_issue_binding>
