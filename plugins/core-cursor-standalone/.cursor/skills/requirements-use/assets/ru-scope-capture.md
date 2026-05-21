---
name: ru-scope-capture
description: Template for defining requirement-use scope, assumptions, and approval gates
---

<ru-scope-capture>

<description>

Define in-scope requirements and constraints before execution.

</description>

<guidelines>

Fill all sections and get explicit user approval before mapping or execution.

</guidelines>

<template>

```xml
<scope_capture goal="[single measurable delivery goal]" audience="[stakeholders and reviewers]" ticketId="JIRA-0000">
  <source_requirements>
    - [file or source reference]
  </source_requirements>
  <intent_summary>
    - [succinct restatement of requested delivery outcome]
  </intent_summary>
  <scope>
    <in_scope_ids>
      - [FR-AREA-0001]
    </in_scope_ids>
    <out_of_scope_ids>
      - [ID or reason if excluded]
    </out_of_scope_ids>
  </scope>
  <constraints>
    <must>
      - [non-negotiable]
    </must>
    <should>
      - [high value]
    </should>
    <could>
      - [nice to have]
    </could>
    <wont>
      - [explicitly excluded]
    </wont>
  </constraints>
  <assumptions>
    - [assumption requiring explicit approval]
  </assumptions>
  <risks>
    - [risk and potential impact]
  </risks>
  <hitl_gates>
    <gate decision="Approve in-scope IDs" why="Controls delivery scope" default_if_unknown="No execution">
      - Approve
      - Refine scope
    </gate>
    <gate decision="Approve assumptions for ambiguous requirements" why="Prevents silent reinterpretation" default_if_unknown="Pause and ask">
      - Approve assumptions
      - Revise assumptions
    </gate>
  </hitl_gates>
  <success_criteria_smart>
    - [specific measurable requirement-coverage target]
  </success_criteria_smart>
</scope_capture>
```

</template>

</ru-scope-capture>
