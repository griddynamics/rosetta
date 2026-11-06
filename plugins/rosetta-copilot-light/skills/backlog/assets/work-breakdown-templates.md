<work_breakdown_templates>

<description>

Two templates for LARGE breakdowns. Define in-scope functional requirements before building the WBS, then make critical assumptions and blockers explicit before final approval.

</description>

<functional_requirements>

Use EARS wording. Keep each requirement atomic, testable, and traceable to intent.

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

</functional_requirements>

<risk_and_unknowns>

List only high-impact unknowns and questions that can materially change scope, sequencing, or quality.

```xml
<risk_register feature="[feature-name]">
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
</risk_register>
```

</risk_and_unknowns>

</work_breakdown_templates>
