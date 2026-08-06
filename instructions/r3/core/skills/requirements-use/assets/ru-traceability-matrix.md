---
name: ru-traceability-matrix
description: Requirement-to-task-to-test traceability matrix template
---

<ru-traceability-matrix>

<description>

Track coverage from requirements to planned work, implementation evidence, and validation.

</description>

<guidelines>

One row per acceptance criterion, not per requirement — a requirement with three criteria is three rows, because coverage is claimed per criterion. Never leave evidence and status implicit.

</guidelines>

<template>

```markdown
| Requirement ID | Ticket ID | Priority | Status | Task/Change Reference | Acceptance Criteria Ref | Test/Evidence Ref | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-AREA-0001 | JIRA-0000 | Must | Approved | [link/id] | FR-AREA-0001.AC1 | [test or proof] | Covered/Partial/Gap | [risk/assumption] |
```

</template>

</ru-traceability-matrix>
