---
name: pl-risk-and-unknowns
description: Template to capture planning assumptions, unknowns, blockers, and clarification questions.
tags: ["planning", "templates"]
---

<pl-risk-and-unknowns>

<description>

Make critical assumptions and blockers explicit before final plan approval.

</description>

<guidelines>

List only high-impact unknowns and questions that can materially change scope, sequencing, or quality.

</guidelines>

<template>

```xml
<planning_risk_register feature="[feature-name]">
  <assumptions>
    <assumption priority="[critical|high]" status="[needs-approval|approved|rejected]">
      <statement>[assumption text]</statement>
      <impact>[what can go wrong if false]</impact>
      <owner>[who confirms]</owner>
    </assumption>
  </assumptions>
  <unknowns>
    <unknown priority="[critical|high]" type="[scope|security|ux|technical]">
      <statement>[unknown detail]</statement>
      <blocked_steps>
        - [wbs step references]
      </blocked_steps>
    </unknown>
  </unknowns>
  <questions>
    <question priority="[critical|high]" target="[user|owner|team]">
      <text>[specific question]</text>
      <why>[why it changes scope/quality]</why>
      <default_if_unanswered>[safe fallback]</default_if_unanswered>
    </question>
  </questions>
  <decisions_needed>
    <decision hitl="required">
      <statement>[approval required]</statement>
      <options>
        - [option A]
        - [option B]
      </options>
    </decision>
  </decisions_needed>
</planning_risk_register>
```

</template>

</pl-risk-and-unknowns>
