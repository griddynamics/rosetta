---
name: ru-traceability-matrix
description: Requirement-to-task-to-test traceability matrix template
---

<ru-traceability-matrix>

<description>

Track coverage from requirements to planned work, implementation evidence, and validation.

</description>

<guidelines>

Every in-scope requirement ID must have one row. Never leave evidence and status implicit.

</guidelines>

<template>

```markdown
| Requirement ID | Ticket ID | Priority | Status | Task/Change Reference | Acceptance Criteria Ref | Test/Evidence Ref | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-AREA-0001 | JIRA-0000 | Must | Approved | [link/id] | [Given/When/Then ref] | [test or proof] | Covered/Partial/Gap | [risk/assumption] |
```

</template>

</ru-traceability-matrix>
