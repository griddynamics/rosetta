---
name: ra-intent-capture
description: Template for intent, scope, assumptions, and questions before drafting requirement units
---

<ra-intent-capture>

<description>

Capture intent and scope before drafting requirements.

</description>

<guidelines>

Follow authoring flow from requirements.md:
capture intent, restate intent, confirm scope and goals, list assumptions, ask targeted questions, then propose outline.

</guidelines>

<template>

```xml
<intent_capture goal="[single measurable goal]" audience="[stakeholders and reviewers]" ticketId="JIRA-0000">
  <intent_summary>
    - [succinct restatement of user intent]
  </intent_summary>
  <non_goals>
    - [what is explicitly out of scope]
  </non_goals>
  <scope>
    <in_scope>
      - [capability or area to cover]
    </in_scope>
    <out_of_scope>
      - [capability or area excluded]
    </out_of_scope>
  </scope>
  <context>
    <must_know>
      - [facts from current project context]
    </must_know>
    <assumptions>
      - [assumption requiring user confirmation]
    </assumptions>
    <open_questions>
      - [targeted clarifying question]
    </open_questions>
  </context>
  <actors>
    - [actor name and responsibility]
  </actors>
  <constraints>
    <must>
      - [non-negotiable requirement]
    </must>
    <should>
      - [important but deferrable]
    </should>
    <could>
      - [nice-to-have]
    </could>
    <wont>
      - [explicitly excluded]
    </wont>
  </constraints>
  <requirements_areas>
    - [FR area and abbreviation]
    - [NFR area and measurement focus]
    - [interfaces and data coverage]
  </requirements_areas>
  <traceability_plan>
    - [how source -> goal -> req -> test is linked]
  </traceability_plan>
  <validation_plan>
    - [which checks and quality gates will run]
  </validation_plan>
  <hitl_gates>
    <gate decision="[what needs user approval]" why="[ambiguity, tradeoff, or risk]" default_if_unknown="[safe fallback]">
      - [choice A]
      - [choice B]
    </gate>
    <gate decision="Approve each requirement unit" why="Explicit user ownership and quality control" default_if_unknown="Keep status Draft">
      - Approve
      - Request change
      - Defer
    </gate>
  </hitl_gates>
  <success_criteria_smart>
    - [specific measurable acceptance target]
  </success_criteria_smart>
</intent_capture>
```

</template>

</ra-intent-capture>
