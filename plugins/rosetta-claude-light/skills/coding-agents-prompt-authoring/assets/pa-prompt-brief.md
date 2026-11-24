---
name: pa-prompt-brief
description: Identify and define key context of the prompt template
---

<pa-prompt-brief>

<description>

Identify and define key context of the prompt

</description>

<guidelines>

Proactively fill in content by following instructions in square brackets and validate with user

</guidelines>

<template>

```xml
<prompt_brief goal="[single measurable goal]" target_audience="[who will use this prompt]">
  <non_goals>
    - [what this prompt must NOT do]
  </non_goals>
  <context>
    <must_know>
      - [essential fact or domain context]
    </must_know>
    <can_assume>
      - [safe default assumption]
    </can_assume>
  </context>
  <inputs>
    <input name="[param name]" type="[data type]" required="true" notes="[format or constraints]"/>
  </inputs>
  <outputs>
    <output name="[output name]" type="[data type]" schema="[structure or example]"/>
  </outputs>
  <constraints>
    <must>
      - [non-negotiable requirement]
    </must>
    <should>
      - [high-value but deferrable]
    </should>
    <could>
      - [nice-to-have if low effort]
    </could>
    <wont>
      - [explicitly excluded from scope]
    </wont>
  </constraints>
  <assumptions>
    - [stated assumption needing user confirmation]
  </assumptions>
  <open_questions>
    - [blocker question that may change the design]
  </open_questions>
  <risks>
    - [what can go wrong and its impact]
  </risks>
  <hitl_gates>
    <gate decision="[what needs human approval]" why="[task definition, review, approval, ambiguity, irreversibility, or tradeoff]" default_if_unknown="[safe fallback action]">
      - [one possible choice]
      - [another possible choice]
    </gate>
  </hitl_gates>
  <ideas>
    - [ideas, hooks, strategy, tricks, unusual patterns used to be used or maintained]
  </ideas>
  <success_criteria_smart>
    - [specific, measurable, achievable, relevant, time-bound criterion]
  </success_criteria_smart>
</prompt_brief>
```

</template>

</pa-prompt-brief>
