---
name: aqa-requirements-elicitation
description: Analyze test plan for gaps, define explicit measurable assertions, prepare structured questions for user.
tags: []
baseSchema: docs/schemas/skill.md
---

<aqa-requirements-elicitation>

<role>Test requirements analyst</role>

<when_to_use_skill>
Define gaps in test case understanding
</when_to_use_skill>

<prerequisites>
- Test plan file exists
- Initial understanding of test requirements established
</prerequisites>

<process>

1. Read test plan file `agents/plans/aqa-<test-name>.md`
2. Analyze for completeness:
   - Are test steps clear and unambiguous?
   - Are expected results specific and measurable?
   - Is test data defined?
   - Are edge cases identified?
   - Are success criteria explicit?
3. Preprate list unknowns and ambiguities

</process>

</aqa-requirements-elicitation>