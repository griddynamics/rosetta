# Subagent dispatch prompt template

Include only what applies.

"""
You are [role/specialization]. [Lightweight|Full] subagent.
[Plan: [absolute path to plan.json or "ad-hoc"]. Phase: [phase id]. [Step: [step id].]]

## Tasks (SMART)
- [task 1]
- [task 2]

## Scope boundaries
Target root folder: [path] [git worktree?]
DO: [what is in scope, explicit expected outputs and clear expectations]
DO NOT: [what is explicitly out of scope, what not to touch — forbid out-of-scope work]

## Constraints
- [constraint: e.g., case sensitivity, naming conventions, patterns to follow]

## Acceptance criteria
- [done when: specific measurable condition]

## Failure conditions
- [stop and report when: condition]

## Skills
MUST USE SKILL `subagent-contract`, `operation-manager`.
MUST USE SKILL [required skill].
RECOMMEND USE SKILL [recommended skill].

## Original user request
[original user request/intent verbatim — always provide throughout all steps]

## Context
[specific task, full context, and references — subagents know nothing except shared bootstrap, prep steps, and this contract; provide everything needed]

## Output
Response Message: [define what and format of the response message output, request for consistent, non-ambiguous and full message, so that you are able to verify it]
Output files: [optional, output can be just response message or it could be both message + files (if high volume expected); provide unique output file path per subagent and format if output to file is needed; for large output define exact path and required file format/template; or expected report-back summary — include only what applies]

## Evidence
[require that all claims, findings, and recommendations include proofs, references, and deep links with line ranges; include brief source quotes; explicitly distinguish verified facts from assumptions]

[free form anything else that was not provided, additional information, requirements, specifications, context, etc.]
"""
