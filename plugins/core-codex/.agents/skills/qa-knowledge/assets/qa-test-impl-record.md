---
name: qa-test-impl-record
description: QA Phase 5 hand-off summary fields — the test-implementation record the testing skill returns and the phase verifies.
---

<qa-test-impl-record>

Hand-off summary fields (returned by the skill, verified by the phase), in order:

- test framework (name+version)
- files created/modified counts
- `### Files`
- `### ATC → test mapping` (table: ATC id | test file | test function)
- `### Assumptions made` (`[ASSUMED: …]` entries, or `None — …`)
- `### Gaps surfaced` (per-ATC reason, or `None — all ATCs implemented`)
- `### Lint / format status` (pass|fail + exact command)
- `### Validation scope & waivers` (what was run locally vs. any broader check the user explicitly waived — e.g. a full-suite regression — each with its residual-risk note; `None — no checks waived` if none)
- `### Ready for re-test` (yes|no + reason)

</qa-test-impl-record>
