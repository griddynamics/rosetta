# Test Implementation Template — aqa-test-authoring

Loaded on demand from `SKILL.md` `<output_format>` when step 4 (validate and record) is appending the `## Test Implementation` section to the test plan. The base `SKILL.md` keeps the process orchestration, GATE, precedence rules, safety boundaries, failure handling, validation checklist, and pitfalls; this file holds only the verbatim template.

---

## `## Test Implementation` section — appended to the test plan

```markdown
## Test Implementation

### Test File
- Location: [path]
- Type: New file / Added to existing
- Test Name: [descriptive name]

### Implementation Summary
- Assertions implemented: [count]
- Assertions uncovered: [count]  (see Uncovered Assertions below)
- Page Objects Used: [list]
- Utilities Used: [list]

### Uncovered Assertions
- [Assertion text from plan] — reason: [missing page-object method | no UI signal | precondition unestablishable | other]
- (If none: `None — every assertion from the plan was implemented.`)

### Conflicts and Precedence
- [Where user-instruction guidance conflicted with repo docs; resolution: repo docs won; description of the override]
- (If none: `None — sources consistent.`)

### Validation
- [x] All assertions from plan implemented OR recorded in Uncovered Assertions
- [x] Page objects used correctly (no direct-selector bypass)
- [x] Project standards followed (repo docs win per `<input_contract>`)
- [x] Linting passed
- [x] No app source or page-object files were modified (safety boundary)
- [x] Ready for execution
```

Required subsections in this order: **Test File**, **Implementation Summary**, **Uncovered Assertions**, **Conflicts and Precedence**, **Validation**. Empty sections use the explicit `None — <reason>` line shown in the template — never left blank.
