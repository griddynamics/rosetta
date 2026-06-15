---
name: aqa-test-impl-record
description: AQA Phase 6 Test Implementation record — appended to the test plan after authoring.
---

<aqa-test-impl-record>

**Test Implementation record** — appended to the test plan, required subsections in order: **Test File** (location · new-vs-existing · test name), **Implementation Summary** (assertions implemented/uncovered counts · page objects used · utilities used), **Uncovered Assertions** (`<assertion> — reason: <…>`, or `None — every plan assertion implemented`), **Conflicts and Precedence** (user-instruction-vs-repo-docs overrides; repo docs win; or `None — sources consistent`), **Validation** (checkboxes). Empty subsections use `None — <reason>`, never blank.

Worked example of the phase-owned `### Uncovered Assertions` entry (framework-neutral; the `<assertion> — reason: <…>` shape, never a silent drop):

```markdown
### Uncovered Assertions
- "Confirmation email received after checkout" — reason: no mail-inbox fixture in scope; missing page-object method routed back to Phase 5.
```

</aqa-test-impl-record>
