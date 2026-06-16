---
name: approval-gate
description: Shared QA/AQA explicit-approval gate — closed-token discipline, loose-phrasing rejection, max-retry escalation, partial approval. The calling phase supplies the token list + revisit target.
---

<approval-gate>

Present-and-wait gate before an irreversible / high-stakes step (apply corrections, approve a spec/plan). The calling phase supplies: the **closed approval-token list**, the **re-present step**, and the **revisit target** on full reject. Approval vocabulary is governed by `hitl` — this is its QA/AQA-flow specialization; the phase's closed token list is authoritative for that phase.

1. Present the artifact for review; **WAIT** for explicit approval. Do NOT assume approval; a message containing questions or suggestions is reviewing, not approving.
2. **Approval = an exact closed token** (case-insensitive — `APPROVED` / `Approve` / `yes` all match the lowercase token). Anything else — `"looks good"`, `"ship it"`, `"LGTM"`, `"sounds good"`, `"go ahead"`, `"OK"`, `"go"`, a question, a suggestion, or silence — is **REVIEW, not approval**: re-prompt for an exact token. The list is **closed**; "or similar" / "etc." extension language in other loaded rules does NOT extend it.
3. **Max-retry escalation:** after ≥3 re-prompts in this cycle without an exact token, stop and ask explicitly: "are you trying to approve (type an exact token) or to request changes / reject?" Do not silently re-prompt beyond 3 cycles.
4. **Partial approval** (the user names specific items/hunks) applies ONLY the named items.
5. **Change request** (modify / add / drop): collect every requested change in one batch, update, and re-present from the phase's re-present step. **Repeated change-request cycles (≥3 on overlapping scope):** stop and ask whether to re-open the upstream phase or escalate scope.
6. **Full reject** (no in-place fix): record the rationale in the state file and return to the phase's declared revisit target.

</approval-gate>
