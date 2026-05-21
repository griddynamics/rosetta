---
name: pl-validation-rubric
description: Rubric for validating planning artifact quality before execution approval.
tags: ["planning", "templates"]
---

<pl-validation-rubric>

<description>

Evaluate whether the plan is complete, coherent, and safe to execute.

</description>

<guidelines>

Score each criterion from 0 to 2.
0 = missing, 1 = partial, 2 = complete.
Execution-ready requires all critical criteria scoring 2.

</guidelines>

<template>

```xml
<planning_validation score_model="0-2">
  <criteria>
    <criterion id="C1" critical="true">Intent and non-goals are explicit</criterion>
    <criterion id="C2" critical="true">EARS FR coverage is complete</criterion>
    <criterion id="C3" critical="true">WBS chronology and predecessors are coherent</criterion>
    <criterion id="C4" critical="true">Each step has required fields</criterion>
    <criterion id="C5" critical="true">Acceptance criteria are measurable</criterion>
    <criterion id="C6" critical="true">Key NFR constraints are included</criterion>
    <criterion id="C7" critical="true">Critical assumptions and unknowns are explicit</criterion>
    <criterion id="C8" critical="true">HITL gates exist for high-impact decisions</criterion>
    <criterion id="C9" critical="false">Testing scenarios and data are complete</criterion>
    <criterion id="C10" critical="false">Documentation and git checkpoints are present</criterion>
    <criterion id="C11" critical="true">No speculative scope is introduced</criterion>
    <criterion id="C12" critical="false">Language is compact and unambiguous</criterion>
  </criteria>
  <results>
    <result criterion_id="C1" score="[0|1|2]" notes="[evidence]"/>
  </results>
  <summary>
    <critical_failures>
      - [criterion IDs with score below 2]
    </critical_failures>
    <decision>[ready|revise|blocked]</decision>
    <next_actions>
      - [required correction]
    </next_actions>
  </summary>
</planning_validation>
```

</template>

</pl-validation-rubric>
