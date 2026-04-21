---
name: pl-wbs
description: Template for execution-ready WBS with sequencing, ownership, and quality gates.
tags: ["planning", "templates"]
---

<pl-wbs>

<description>

Create a chronological work breakdown structure from approved intent and requirements.

</description>

<guidelines>

Every step must be independently executable and include mandatory planning fields.
Do not add time or duration fields.
Scope each step to about 20 minutes of focused work.
Persist critical assumptions and unknowns in this file.

</guidelines>

<template>

```md
# WBS: [Feature Name]

## Original Intent

- Requested outcome: [single sentence]
- In-scope: [explicit list]
- Out-of-scope: [explicit list]

## Functional Requirements (EARS)

- [FR-AREA-0001] [WHEN/IF/WHILE/WHERE ... THEN the system SHALL ...]

## Assumptions and Unknowns

- [critical/high assumption or unknown]

## 1. [Top-Level Step Name]

### 1.1 [Step Name]

**Priority**: [P0|P1|P2|P3]
**Predecessors**: [None|1.1, 1.2]
**Agent**: [role with specialization]
**Where**: [files/folders/services/modules]
**Description**: [what will be done]
**AC**:
- [measurable acceptance criterion]
**NFR**:
- [performance/security/reliability constraint]
**EARS FR**:
- [FR-AREA-0001]
**Prerequisites**:
- [required precondition]
**Consequences**:
- [if step is wrong or skipped]
**Watch For**:
- [common failure or risk]
**HITL**:
- [required approval or "None"]

## [Testing]

### [Scenario Design]
- [scenario set]

### [Test Data]
- [input datasets and edge cases]

### [Automation / Local Validation]
- [test execution strategy]

## [Documentation and Git]

### [Docs Update]
- [files to update]

### [Git Checkpoints]
- [branch]
- [commit]
- [push]
- [PR]
```

</template>

</pl-wbs>
