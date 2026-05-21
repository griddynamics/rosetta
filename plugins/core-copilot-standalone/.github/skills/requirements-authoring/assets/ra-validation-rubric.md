---
name: ra-validation-rubric
description: Requirements authoring validation checklist and scorecard
---

<ra-validation-rubric>

<description>

Retrospective validation of requirements quality, consistency, and approval completeness.

</description>

<guidelines>

Fill all fields with true/false plus short notes for any false result.

</guidelines>

<template>

```xml
<validation_rubric>
  <structure>
    <single_goal>[true if one clear goal exists]</single_goal>
    <scope_defined>[true if scope and non-goals are explicit]</scope_defined>
    <actors_defined>[true if actors and responsibilities are explicit]</actors_defined>
    <fr_nfr_separated>[true if FR and NFR are separated]</fr_nfr_separated>
    <schema_complete>[true if each req has required fields]</schema_complete>
    <ids_stable_unique>[true if IDs are stable and unique]</ids_stable_unique>
  </structure>
  <quality>
    <atomicity>[true if each req has one behavior]</atomicity>
    <groupings_checked>[true if groupings are not requirements in disguise]</groupings_checked>
    <unambiguous>[true if no reasonable misreading exists]</unambiguous>
    <implementation_free>[true if reqs avoid design details]</implementation_free>
    <measurable_nfr>[true if NFRs have metric and threshold]</measurable_nfr>
    <no_redundancy>[true if no duplicate req meaning exists]</no_redundancy>
    <no_scope_creep>[true if no unapproved scope added]</no_scope_creep>
  </quality>
  <language>
    <shall_usage>[true if mandatory uses shall]</shall_usage>
    <gwt_acceptance>[true if acceptance uses Given/When/Then]</gwt_acceptance>
    <consistent_terms>[true if terminology is consistent]</consistent_terms>
    <no_ambiguous_timewords>[true if time references are explicit]</no_ambiguous_timewords>
  </language>
  <verification>
    <verification_present>[true if each req has method]</verification_present>
    <happy_unhappy_boundary>[true if acceptance covers happy, unhappy, boundary]</happy_unhappy_boundary>
    <error_handling_covered>[true if error behavior is covered]</error_handling_covered>
  </verification>
  <traceability>
    <source_links>[true if req links to source]</source_links>
    <goal_links>[true if req links to goal]</goal_links>
    <test_links>[true if req links to tests]</test_links>
    <forward_backward_links>[true if links are navigable both ways]</forward_backward_links>
  </traceability>
  <conflicts>
    <duplicate_ids>[true if none found]</duplicate_ids>
    <duplicate_statements>[true if none found]</duplicate_statements>
    <contradictory_shall>[true if none found]</contradictory_shall>
    <incompatible_thresholds>[true if none found]</incompatible_thresholds>
    <circular_dependencies>[true if none found]</circular_dependencies>
    <mismatched_terminology>[true if none found]</mismatched_terminology>
  </conflicts>
  <gaps>
    <all_goals_traced>[true if all goals traced]</all_goals_traced>
    <all_actors_covered>[true if all actors covered]</all_actors_covered>
    <all_scenarios_covered>[true if all scenarios covered]</all_scenarios_covered>
    <all_interfaces_specified>[true if all interfaces specified]</all_interfaces_specified>
    <all_data_entities_defined>[true if all data entities defined]</all_data_entities_defined>
    <all_risks_recorded>[true if all risks recorded]</all_risks_recorded>
    <questions_tracked>[true if open questions tracked]</questions_tracked>
  </gaps>
  <governance>
    <per_req_user_approval>[true if every req has explicit user decision]</per_req_user_approval>
    <final_user_approval>[true if final set has explicit approval]</final_user_approval>
    <hitl_gates_respected>[true if required gates were used]</hitl_gates_respected>
  </governance>
</validation_rubric>
```

</template>

</ra-validation-rubric>
