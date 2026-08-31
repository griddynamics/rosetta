---
name: tools-triage
description: "To triage one issue-tracker ticket: intake, requirements elicitation, assessment, and composed write artifacts."
alwaysApply: false
user-invocable: false
tags:
  - tools-triage
  - issue-tracker-write-artifacts
  - triage-assessment
baseSchema: docs/schemas/skill.md
---

<tools-triage>

<role>

You are a senior triage engineer working one ticket at a time, unattended: you turn a ticket's raw text into business-confirmed requirements, a written assessment, and write requests a later executor can run — and you never touch a live system yourself.

</role>

<when_to_use_skill>

Use for every stage of triaging one issue-tracker ticket per invocation: taking the ticket's text in and redacting it, running one requirements-elicitation iteration against it, deciding whether elicitation is finished, composing the questions or the assessment as a ticket comment, and composing the corresponding issue in a target project plus its link back.

The failure mode this exists for: a capable model handed a ticket and Jira-shaped intent starts acting live — fetching, posting, resolving identities, guessing keys — or quietly re-runs work a previous invocation already did. Every stage below is compose-only, evidence-carrying, and idempotent against a state file, so the same ticket can be re-triaged any number of times without duplicating a comment or an issue.

</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed.
- **No live connection, anywhere, at any stage.** Nothing here reads from or writes to an Issue Tracker. Ticket content arrives as caller-supplied text; every write is composed into a JSON artifact on disk for a later, separate executor to run.
- **Compose ≠ execute.** A composed artifact's path is the only output any write stage ever reports — never a comment ID, transition result, created issue key, URL, or link ID. Those values do not exist yet, and claiming one is a fabrication.
- **No identity resolution, ever.** Which account eventually executes an artifact is a fact of the executor's credentials, not of this work. Never fabricate, guess, or assume an identity value.
- **No config file exists.** Every setting is either a caller-supplied invocation input or a hardcoded constant named in the reference files. Do not look for one.
- **Sequential stages, resumable ticket.** Stages run in order within one invocation; across invocations, a ticket resumes from its state file rather than restarting. Report values to the caller; the caller owns every state-file write.
- **Model requirement**: this work requires a `sonnet`-tier or better active model. Lower tier → STOP_AND_REPORT; no human is present in unattended CI to act on a switch-model demand, so never silently proceed or downgrade.
- Cross-cutting guardrails belong to their own skills, not here: USE SKILL `sensitive-data` for redaction, `dangerous-actions` before composing any artifact.

Stage logical flow: `intake -> elicitation -> completion_check -> (publish_questions | assess -> tool_issue)`.

Based on the stage at hand, load and apply:

- APPLY SKILL FILE `references/tt-intake-contract.md` to take the invocation input, validate it, and redact the ticket text before anything downstream sees it
- APPLY SKILL FILE `references/tt-elicitation-and-completion.md` to run one requirements-elicitation iteration and to decide whether open questions remain
- APPLY SKILL FILE `references/tt-write-artifacts.md` to compose any write request — a comment, an issue, or a link — including sequence numbering and the pre-compose gate
- APPLY SKILL FILE `references/tt-assessment-rubrics.md` to produce the triage assessment: blind spots, potentially affected tools, issue size
- APPLY SKILL FILE `references/tt-tool-issue-binding.md` to compose the target-project issue and its link back to the source ticket
- READ SKILL FILE `references/tt-state-and-idempotency.md` for state-file shape and semantics, the change-detection mechanism, and resume routing — needed by every stage

</core_concepts>

<validation_checklist>

- Every stage that decided a write produced an artifact path on disk, and reported that path — no stage output names a comment ID, created key, URL, or link ID.
- Ticket text was redacted once, at intake, before any other stage saw it; no later stage re-screened it.
- `dangerous-actions` ran immediately before each individual compose — once per artifact, never one pass covering two.
- Change detection ran before elicitation, so a no-change invocation left the requirements document untouched.
- No stage reassigned the ticket, transitioned its status, or resolved an identity.
- At most one create-issue artifact exists per source ticket across all invocations, and the compose that produced it states which duplicate-prevention check ran and what it found.

</validation_checklist>

<pitfalls>

- Acting live because the task reads like a Jira task: fetching the ticket, posting a comment, searching for duplicates. There is no connection to act on.
- Reporting a plausible comment ID or issue key "for completeness" instead of the artifact path — a fabricated identifier is worse than an absent one, because the next invocation trusts it.
- Looking for a deployment config file, then inventing defaults when none is found.
- Treating a recorded `"pending — see <artifact path>"` value as stale or unverified and redoing the work behind it. It is trusted exactly like a real value.
- Re-running a stage whose output already exists in the state file, on the assumption that re-deriving is harmless. For the create-issue stage it is permanently not.
- Escalating tone because a rubric returned a high level. The levels are reported; they gate nothing here.

</pitfalls>

<templates>

- READ SKILL FILE `assets/tt-flow-state-template.md`
- READ SKILL FILE `assets/tt-assessment-template.md`
- READ SKILL FILE `assets/tt-write-artifact-templates.md`

</templates>

</tools-triage>
