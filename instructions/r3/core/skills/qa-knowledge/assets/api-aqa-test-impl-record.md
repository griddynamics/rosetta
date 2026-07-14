# API-AQA test-implementation record

Hand-off fields the testing skill returns and the phase verifies.

<api-aqa-test-impl-record>

**Field rule:** every field carries a real value, `None -- …`, or `[UNKNOWN: <what is needed>]` (e.g. lint toolchain absent, framework version unknown) -- never blank, never omit a section. **Done when** all fields are filled and `### Ready for re-test` carries a yes/no + reason.

Summary fields in order:

- test framework (name+version)
- files created/modified counts
- `### Files`
- `### ATC → test mapping` (table: ATC id | test file | test function)
- `### Assumptions made` (`[ASSUMED: …]` entries, or `None -- …`)
- `### Gaps surfaced` (per-ATC reason, or `None -- all ATCs implemented`)
- `### Lint / format status` (pass|fail + exact command; or `N/A -- lint not configured`)
- `### Validation scope & waivers` (local runs vs. user-waived broader checks e.g. full-suite regression, each with a residual-risk note; `None -- no checks waived`)
- `### Ready for re-test` (yes|no + reason)

**Worked example** (the two most-conflated sections, filled):

```markdown
### Gaps surfaced
- ATC-007 (rate-limit 429 path): Uncovered: backend has no rate-limit config in the test env; needs infra setup. Recorded, not dropped.

### Validation scope & waivers
- Ran locally: lint + the 12 new ATC tests (all pass). Waived: full-suite regression (user-approved -- residual risk: a cross-module side-effect would surface only in CI).
```

</api-aqa-test-impl-record>
