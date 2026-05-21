---
name: ru-validation-rubric
description: Requirements-use validation checklist and scorecard
---

<ru-validation-rubric>

<description>

Retrospective validation that delivery work aligns with approved requirements and explicit evidence.

</description>

<guidelines>

Fill all fields with true/false and add short notes for every false value.

</guidelines>

<template>

```xml
<validation_rubric>
  <scope_control>
    <in_scope_ids_explicit>[true if in-scope IDs listed]</in_scope_ids_explicit>
    <out_scope_ids_explicit>[true if excluded IDs listed]</out_scope_ids_explicit>
    <no_unapproved_scope>[true if no extra scope added]</no_unapproved_scope>
  </scope_control>
  <mapping_quality>
    <task_mapping_complete>[true if each in-scope ID maps to tasks]</task_mapping_complete>
    <acceptance_mapping_complete>[true if each in-scope ID maps to acceptance criteria]</acceptance_mapping_complete>
    <test_mapping_complete>[true if each in-scope ID maps to tests or evidence]</test_mapping_complete>
  </mapping_quality>
  <ambiguity_control>
    <assumptions_explicit>[true if assumptions are explicit]</assumptions_explicit>
    <assumptions_approved>[true if assumptions approved by user]</assumptions_approved>
    <conflicts_escalated>[true if conflicts were escalated via HITL]</conflicts_escalated>
  </ambiguity_control>
  <evidence_quality>
    <coverage_reported>[true if covered/partial/gap status exists per ID]</coverage_reported>
    <gaps_listed>[true if gaps are listed with impact]</gaps_listed>
    <over_impl_risks_listed>[true if over-implementation risks are listed]</over_impl_risks_listed>
    <completion_evidence_present>[true if completion claims have evidence]</completion_evidence_present>
  </evidence_quality>
  <governance>
    <hitl_gates_respected>[true if required gates were used]</hitl_gates_respected>
    <final_user_approval>[true if final coverage approved]</final_user_approval>
  </governance>
</validation_rubric>
```

</template>

</ru-validation-rubric>
