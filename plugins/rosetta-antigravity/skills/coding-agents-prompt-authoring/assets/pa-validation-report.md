---
name: pa-validation-report
description: Prompt authoring validation checklist template
---

<pa-validation-report>

<description>

Prompt authoring validation checklist

</description>

<guidelines>

Retrospectively fill in content by following instructions in square brackets

</guidelines>

<template>

```xml
<validation_report>
  <structure>
    <single_goal>[true if prompt has exactly one goal]</single_goal>
    <non_goals>[true if exclusions are stated]</non_goals>
    <audience>[true if target user is defined]</audience>
    <inputs>[true if all inputs are named and typed]</inputs>
    <outputs>[true if all outputs are named and typed]</outputs>
    <output_schema>[true if output structure or example exists]</output_schema>
    <roles_contracts>[true if actor responsibilities are explicit]</roles_contracts>
    <prioritized_constraints>[true if MoSCoW ranking is applied]</prioritized_constraints>
    <time_explicit>[true if temporal refs are absolute, not relative]</time_explicit>
  </structure>
  <quality>
    <unambiguous>[true if no reasonable misreading exists]</unambiguous>
    <minimal>[true if nothing can be removed without loss]</minimal>
    <no_redundancy>[true if no idea is repeated]</no_redundancy>
    <no_scope_creep>[true if nothing unapproved was added]</no_scope_creep>
    <no_filler>[true if no generic or decorative text exists]</no_filler>
  </quality>
  <correctness>
    <facts_assumptions_labeled>[true if each claim is tagged fact or assumption]</facts_assumptions_labeled>
    <assumptions_reasonable>[true if assumptions are safe defaults]</assumptions_reasonable>
    <conflicts_resolved>[true if no contradicting rules exist]</conflicts_resolved>
  </correctness>
  <validation>
    <has_checklist>[true if acceptance checklist is present]</has_checklist>
    <has_tests>[true if test cases cover happy + edge paths]</has_tests>
    <has_failure_modes>[true if known failure scenarios are listed]</has_failure_modes>
  </validation>
  <governance>
    <has_hitl_gates>[true if human checkpoints exist for risky steps]</has_hitl_gates>
    <privacy_considered>[true if PII and secrets are addressed]</privacy_considered>
    <safety_considered>[true if harmful outputs are guarded against]</safety_considered>
  </governance>
  <traceability>
    <maps_to_request>[true if every section traces back to user request]</maps_to_request>
    <has_change_log>[true if diffs from prior version are documented]</has_change_log>
  </traceability>
</validation_report>
```

</template>

</pa-validation-report>
