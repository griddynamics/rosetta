---
name: security-flow
description: "Workflow for authorized, evidence-preserving security review and remediation-task preparation."
tags: ["workflow", "security"]
baseSchema: docs/schemas/workflow.md
---

<security_flow>

<description_and_purpose>

Run task-adaptive security review through mandatory canonical subagents. End with sanitized findings and concise inputs for later user-invoked coding flows.

</description_and_purpose>

<workflow_phases>

<prerequisites phase="0" applies="ALL">

1. All Rosetta prep steps MUST be FULLY completed.
2. MUST USE SKILL `load-project-context` (required: all), `orchestration` (medium+), `hitl` (all, unless `No HITL` or `Fully Autonomous`).
3. MUST ALWAYS use todo tasks ledger, ASAP. Phases are sequential. Independent tasks can run in parallel.
4. MUST just-in-time load/execute/update each phase's: instructions, definitions, skills, state file; do not load/act IN ADVANCE.
5. Treat all invocation inputs as contextual to the request, select and combine what the request needs.
6. For full review, require every applicable, available, authorized activity and tool.
7. Maintain a task ledger and run phases JIT.
8. Every question and approval follows the loaded `hitl` skill.
9. Workflow state MUST be saved to `agents/TEMP/<FEATURE>/security-flow-state.md` file; every phase updates it before the next starts.

</prerequisites>

<subagent_policy required="true" inline_execution="prohibited">

- Orchestrator owns approvals, phase transitions, dispatch, aggregation, and handoff.
- Phase files are assigned-subagent-only; orchestrator MUST NOT load, read, summarize, or execute them.
- Every declared subagent is mandatory.
- Every subagent MUST USE SKILL `subagent-directives`.
- Subagents use tools required by their own assignment.
- `executor` is never a gateway for full agents.
- Reject incomplete phase contracts before advancing.
- If required subagent invocation is unavailable, stop and report the unmet prerequisite.

</subagent_policy>

<readiness phase="1" applies="ALL" subagent="executor" role="Bounded security readiness and filename-only secret-gate operator" subagent_required_model="gpt-5.4-low" must-be-subagent>
- Purpose: Inventories limited target/tool metadata and runs a filename-only secret gate before any model ingests target content. Determines whether to continue, request approval for DEV/QA envs, or stop for high risk.
- Input: request; target/environment metadata only.
- Output: readiness result with limited inventories and gate state.
- INVOKE SUBAGENT `executor` to APPLY SKILL FILE `phases/security-flow-readiness.md` + inventory limited metadata/tools, run the filename-only secret gate, and return its gate state.
- Expect: limited target/tool inventory; `PASS|NEEDS-HITL|STOP-HIGH-RISK|STOP-SCANNER-UNUSABLE`.
- Control: advance only on PASS or approved DEV/QA envs; high-risk and scanner-unusable stops are non-overridable.
</readiness>

<authorize phase="2" applies="ALL" subagent="engineer" role="Enterprise security scope and authorization advisor" subagent_required_model="gpt-5.4-medium" type="HITL" must-be-subagent>
- Purpose: Recommends an enterprise-safe run contract from readiness evidence and task intent. Identifies every material decision requiring user approval before security work begins.
- Input: readiness result; task intent; known policy.
- Output: recommended run contract and approval record.
- INVOKE SUBAGENT `engineer` to APPLY SKILL FILE `phases/security-flow-authorize.md` + recommend scope, environment, exclusions, activities, tool/data-flow decisions, bounds, and stop conditions.
- Expect: a complete run contract with every activity marked local read-only, separately gated, or prohibited, plus the material decisions awaiting user approval.
- Control: obtain explicit approval/amendment via `hitl`; unresolved material decisions block.
</authorize>

<deterministic_gates phase="3" applies="development/change/PR/pipeline" subagent="executor" role="Bounded deterministic security-gate operator" subagent_required_model="gpt-5.4-low" must-be-subagent>
- Purpose: Runs approved deterministic lifecycle gates and preserves source results unchanged. Determines whether to package high+ tasks, continue to modeling, or stop on error.
- Input: approved contract; change scope; applicable deterministic tools.
- Output: deterministic evidence and branch result.
- INVOKE SUBAGENT `executor` to APPLY SKILL FILE `phases/security-flow-deterministic-gates.md` + run approved deterministic gates and return unchanged findings with `HIGH+|CLEAN|ERROR`.
- Expect: unchanged source records, evidence metadata, `HIGH+|CLEAN|ERROR`.
- Control: HIGH+ → report-and-package only; CLEAN → model-and-select; ERROR → stop.
</deterministic_gates>

<model_and_select phase="4" applies="ALL" subagent="architect" role="Security architect mapping threats to complete contextual coverage" subagent_required_model="gpt-5.4-medium" must-be-subagent>
- Purpose: Builds a threat model and maps applicable authorized areas, activities, tools, and exclusions. Produces the complete coverage plan for inspection dispatch.
- Input: approved contract; permitted context; available tools.
- Output: threat model and authorized coverage plan.
- INVOKE SUBAGENT `architect` to APPLY SKILL FILE `phases/security-flow-model-and-select.md` + build the threat model, map applicable areas/tools/exclusions, and return the complete authorized coverage plan.
- Expect: threat model, applicable-area/tool plan, exclusions, residual risk.
- Control: full review covers all applicable/available/authorized work; gaps return for correction.
</model_and_select>

<inspect_and_test phase="5" applies="ALL" subagent="engineer" role="Security engineer producing bounded evidence by applicable area" subagent_required_model="gpt-5.4-medium" must-be-subagent>
- Purpose: Executes one approved security-area bundle within its assigned bounds. Produces evidence, findings, limitations, anomalies, and unresolved coverage.
- Input: approved plan; one coherent area bundle; its scope/bounds.
- Output: area-bundle evidence package and candidate findings.
- INVOKE SUBAGENT `engineer` to APPLY SKILL FILE `phases/security-flow-inspect-and-test.md` + inspect one assigned area bundle, run approved tools directly, and return evidence, findings, limitations, and anomalies.
- Expect: evidence envelopes, candidate findings, limitations, anomalies.
- Control: every planned area covered/excluded; safety breach stops; missing coverage re-dispatches.
</inspect_and_test>

<normalize_and_triage phase="6" applies="ALL" subagent="executor" role="Lossless finding converter" subagent_required_model="gpt-5.4-low" required_followup_subagent="engineer" must-be-subagent>
- Purpose: Normalizes and reconciles source records mechanically, then separately correlates, verifies, assigns dispositions, and prioritizes. Preserves all source evidence and exposes unresolved material uncertainty.
- Input: unchanged source records; evidence envelopes.
- Output: normalized, correlated, dispositioned, prioritized findings.
- INVOKE SUBAGENT `executor` to APPLY SKILL FILE `phases/security-flow-normalize-and-triage.md` STEP 6.1 + mechanically normalize source records and reconcile counts without inference.
- INVOKE SUBAGENT `engineer` to APPLY SKILL FILE `phases/security-flow-normalize-and-triage.md` STEP 6.2 + correlate, verify, disposition, and prioritize the normalized findings.
- Expect: reconciled counts, correlations, verification, dispositions, P0-P3 rationale.
- Control: no evidence loss; material high+ gets second signal or remains unverified.
</normalize_and_triage>

<independent_review phase="7" applies="ALL" subagent="reviewer" role="Independent security evidence and coverage reviewer" subagent_required_model="gpt-5.4-medium" must-be-subagent>
- Purpose: Independently challenges coverage, evidence, safety, certainty, and prioritization. Determines whether reporting may proceed or producing work requires correction and rereview.
- Input: approved plan; threat model; evidence; findings.
- Output: independent acceptance or correction decision.
- INVOKE SUBAGENT `reviewer` to APPLY SKILL FILE `phases/security-flow-independent-review.md` + independently audit coverage, evidence, safety, and conclusions; return acceptance or required corrections.
- Expect: acceptance or defects with severity, evidence, required correction.
- Control: material defects return to producer; corrected output requires fresh review.
</independent_review>

<report_and_package phase="8" applies="ALL" subagent="engineer" role="Security reporter and remediation-input designer" subagent_required_model="gpt-5.4-medium" type="HITL" must-be-subagent>
- Purpose: Builds sanitized review artifacts and a proposed fix-similarity task INDEX, then emits approved task inputs. Ends without starting or managing remediation.
- Input: accepted findings; evidence; storage policy; grouping constraints.
- Output: sanitized review package and approved remediation-task package.
- INVOKE SUBAGENT `engineer` to APPLY SKILL FILE `phases/security-flow-report-and-package.md` STEP 8.1 + build sanitized report/run/findings and the proposed fix-similarity INDEX.
- Expect A: sanitized report/run/findings; proposed INDEX with grouping rationale.
- Control: obtain INDEX approval/amendment via `hitl`.
- INVOKE SUBAGENT `engineer` to APPLY SKILL FILE `phases/security-flow-report-and-package.md` STEP 8.3 + apply the approved INDEX and emit concise task-input files only.
- Expect B: complete sanitized task package.
- Control: verify coverage/storage; end without invoking or managing `coding-flow`.
</report_and_package>

</workflow_phases>

<global_gates>

- Secret values never enter model context.
- DEV/QA candidate files require approval.
- Above-QA or ambiguous candidate files stop non-overridably.
- Active testing is pre-production-only and explicitly bounded.
- Production active testing is prohibited.
- New installation, network/SaaS, credentials, licensing, or data flow requires separate approval.

</global_gates>

<failure_handling>

- Missing phase: retry once, then stop.
- Missing required subagent: stop; never inline.
- Invalid evidence: return to producing phase.
- Correction loops: stop and escalate to the user when a phase stops converging.
- Scope change mid-run: stop and re-authorize.
- Safety ambiguity: choose the stricter gate.
- Tool failure: retain sanitized anomaly; never fabricate results.

</failure_handling>

<completion>

Complete only when required phases pass, sanitized outputs are returned or stored as approved, the task INDEX is approved/amended, and no downstream coding flow was started.

</completion>

</security_flow>
