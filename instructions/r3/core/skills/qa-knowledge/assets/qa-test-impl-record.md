---
name: qa-test-impl-record
description: QA Phase 5 hand-off summary fields — the test-implementation record the testing skill returns and the phase verifies.
---

<qa-test-impl-record>

**Field rule:** if a value cannot be determined (e.g. lint toolchain absent, framework version unknown), write `[UNKNOWN: <what is needed>]` — never leave a field blank or omit a section. **Before returning:** confirm every field below is populated with a real value, a `None — …`, or `[UNKNOWN: …]`. **Done when** all fields are filled and `### Ready for re-test` carries a yes/no + reason.

Hand-off summary fields (returned by the skill, verified by the phase), in order:

- test framework (name+version)
- files created/modified counts
- `### Files`
- `### ATC → test mapping` (table: ATC id | test file | test function)
- `### Assumptions made` (`[ASSUMED: …]` entries, or `None — …`)
- `### Gaps surfaced` (per-ATC reason, or `None — all ATCs implemented`)
- `### Lint / format status` (pass|fail + exact command; or `N/A — lint not configured`)
- `### Validation scope & waivers` (what was run locally vs. any broader check the user explicitly waived — e.g. a full-suite regression — each with its residual-risk note; `None — no checks waived` if none)
- `### Ready for re-test` (yes|no + reason)

**Worked example** (the two most-conflated sections, filled):

```markdown
### Gaps surfaced
- ATC-007 (rate-limit 429 path): Uncovered — backend has no rate-limit config in the test env; needs infra setup. Recorded, not dropped.

### Validation scope & waivers
- Ran locally: lint + the 12 new ATC tests (all pass). Waived: full-suite regression (user-approved — residual risk: a cross-module side-effect would surface only in CI).
```

</qa-test-impl-record>
