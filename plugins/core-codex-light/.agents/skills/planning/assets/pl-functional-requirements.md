---
name: pl-functional-requirements
description: Template for planning-oriented functional requirements in EARS form.
tags: ["planning", "templates"]
---

<pl-functional-requirements>

<description>

Define in-scope functional requirements before building WBS.

</description>

<guidelines>

Use EARS wording and keep each requirement atomic, testable, and traceable to intent.

</guidelines>

<template>

```xml
<functional_requirements feature="[feature-name]" goal="[single measurable goal]">
  <intent_summary>
    - [succinct restatement of scope]
  </intent_summary>
  <non_goals>
    - [explicitly excluded behavior]
  </non_goals>
  <requirements>
    <fr id="[FR-AREA-0001]" priority="[Must|Should|Could|Wont]">
      <statement>[WHEN|IF|WHILE|WHERE ... THEN the system SHALL ...]</statement>
      <actor>[user/system/service]</actor>
      <rationale>[business or technical reason]</rationale>
      <acceptance_criteria_smart>
        - [specific measurable criterion]
      </acceptance_criteria_smart>
      <dependencies>
        - [upstream dependency]
      </dependencies>
      <risks>
        - [risk and impact]
      </risks>
    </fr>
  </requirements>
</functional_requirements>
```

</template>

</pl-functional-requirements>
