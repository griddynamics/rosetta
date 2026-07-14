# QA approval gate

Shared QA explicit-approval gate: closed-token discipline, loose-phrasing rejection, max-retry escalation, partial approval.

<approval-gate>

Present-and-wait gate before an irreversible/high-stakes step (apply corrections, approve a spec/plan). Phase supplies: **closed approval-token list**, **re-present step**, **revisit target** (full reject). Specializes `hitl`; the phase's closed token list is authoritative.

1. Present the artifact; **WAIT** for explicit approval (no-assume-approval → `hitl`).
2. **Approval = an explicit, scoped affirmative** using the phase's required vocabulary (normally `approved`, `approve`, `yes`, or an equally unambiguous affirmative tied to the presented action). A direct `yes` may answer an immediately preceding exact approval question; an unrelated acknowledgement may not. Comments, questions, suggestions, edits, and partial review are REVIEW, not approval. Re-prompt without inferring intent.
3. **Max-retry escalation:** after ≥3 re-prompts without explicit approval, stop and ask: "approve explicitly, request changes, or reject?" -- never silently re-prompt beyond 3.
4. **Partial approval** (user names specific items/hunks) applies ONLY the named items.
5. **Change request** (modify/add/drop): batch all changes, update, re-present from the phase's re-present step. **≥3 cycles on overlapping scope:** stop, ask whether to re-open the upstream phase or escalate scope.
6. **Full reject** (no in-place fix): record the rationale in the state file, return to the phase's revisit target.

</approval-gate>
