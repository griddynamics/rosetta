<arrange_workspace_business_context>

<description_and_purpose>
Interview user to gather non-technical and engineering behavior facts about the project not yet in `docs/CONTEXT.md`.
</description_and_purpose>

<phase_steps>
1. Interview user about what's missing in `docs/CONTEXT.md` — use `starter_topics`. Follow Questioning process in `hitl` SKILL.
2. Record confirmed answers to `docs/CONTEXT.md` per `context_contract`. Unconfirmed inferences → `docs/ASSUMPTIONS.md`.
3. Update `arrange-state.md`.
</phase_steps>

<starter_topics>
Starter topics (add project-specific questions as needed):
- Its overall goal.
- What it does in the client's wider ecosystem.
- The source and the target of the work.
- The issue tracker you use.
- How a story goes from ticket to implemented.
- Who the users and key stakeholders are.
- Core business rules and domain constraints.
- Any compliance or regulatory requirements.
- Accepted SDLC, DoD, and processes related to the project.
- References to documentation and ways to access it (example, acli or mcp for atlassian).

# Universal Starter Definition of Done

## Outcome

- [ ] Intent, ACs, and expected outcomes met
- [ ] User and business value proven end to end
- [ ] Scope complete with no known regressions

## Verification

- [ ] Build, lint, type, and static checks pass without errors or warnings
- [ ] Relevant unit + integration + E2E tests created and pass; changed code coverage ≥85%
- [ ] Affected components start and pass direct functional checks fully
- [ ] Fresh AI subagent completed direct manual QA and pass
- [ ] Security and privacy checks pass with no medium or higher findings
- [ ] Performance and reliability meet best practices
- [ ] UX and accessibility meet applicable standards
- [ ] Applicable laws, regulations, standards, policies, and licenses met
- [ ] Specific to project area, domain, technology best practices pass 

## Delivery

- [ ] Data and schema changes correct; migrations tested, safe, and reversible
- [ ] Dependencies, configuration, infrastructure, CI/CD, and deployment assets updated
- [ ] Observability, documentation, runbooks, and release notes updated
- [ ] Compatibility, deployment, rollback, and recovery verified

## Closure

- [ ] Known defects, risks, smells, and TODOs resolved or accepted and tracked
- [ ] Evidence linked and final acceptance recorded
</starter_topics>

<context_contract>
- Bulleted business context, purpose, domain — stakeholder perspective
- No technical details
- Limit to 100 lines, if there is MORE => keep CONTEXT.md with core CONTEXT plus index to per-feature <FEATURE>-CONTEXT.md files with a set of terms what it contains.
</context_contract>

<validation_checklist>
- `docs/CONTEXT.md` exists, non-empty, <=100 lines (or indexed).
- `arrange-state.md` updated.
</validation_checklist>

<pitfalls>
- Re-interviewing topics already covered in `docs/CONTEXT.md`.
- Mixing business context with technical architecture.
</pitfalls>

</arrange_workspace_business_context>
