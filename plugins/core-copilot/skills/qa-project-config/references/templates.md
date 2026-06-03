# Output Templates — qa-project-config

Loaded on demand from SKILL.md when actively writing the state-file stub (step 2) or the project config (step 5). The base SKILL.md keeps the operational rules + GATEs + decision-time content inline; this file holds the verbatim markdown templates that the agent fills in at write time.

Mirrors the same lazy-loading pattern other data-collection skills use.

---

## State-file initial stub (referenced from SKILL.md step 2)

Written to `agents/qa-state.md` as the minimum stub at session init. The full per-phase update schema is owned by `qa-flow.md` `<state_file>` (the workflow file updates this file after every phase); this stub is the seed.

```markdown
# API QA State - <Test Name / Feature>

**Last Updated**: [DateTime]
**Current Phase**: 0
**Test Case Source**: [TestRail ID / Jira Ticket / Manual]
**Feature**: [Feature Name]
**IDENTIFIER**: [the {IDENTIFIER} value chosen above — must match agents/qa/{IDENTIFIER}/ directory]

## Phase Completion Status

- [x] Phase 0: Project Config Loading
- [ ] Phase 1: Data Collection
- [ ] Phase 2: API Spec Analysis
- [ ] Phase 3: Gap & Requirements Clarification
- [ ] Phase 4: Test Case Specification
- [ ] Phase 5: Test Implementation
- [ ] Phase 6: Execution & Report Analysis
- [ ] Phase 7: Test Corrections
```

---

## Project config template (referenced from SKILL.md step 5)

Written to the canonical path `agents/qa/qa-project-config.md` (project-wide; shared across every QA session for this project). Populate each section from the user's step-4 answers; mark optional fields `TBD — <reason>` when discovery is intentionally deferred.

```markdown
# QA Project Config

**Created**: [DateTime]
**Last Updated**: [DateTime]

## Document Storage
- **Type**: [Confluence / Google Drive / Local / Other]
- **Location**: [URLs, space keys, paths]

## API Specification
- **Swagger/OpenAPI Available**: [Yes/No]
- **Spec URL**: [URL or N/A]
- **Spec Format**: [OpenAPI 3.x / Swagger 2.0 / N/A]

## Backend Source Code
- **Available**: [Yes / No]
- **Location**: [RefSrc/{project-name}/ / workspace path / N/A]
- **Framework**: [Spring / Express / FastAPI / .NET / Other / TBD]

## Test Case Management
- **System**: [TestRail / Jira / Confluence / Manual / Other]
- **Project/Suite**: [IDs if applicable]
- **Access**: [MCP name or manual]

## Test Framework
- **Framework**: [pytest / Jest / JUnit / RestAssured / SuperTest / Other / TBD]
- **Test Location**: [Directory path or TBD]
- **Existing API Tests**: [Yes/No / TBD]

## Authentication
- **API Auth Mechanism**: [OAuth2 / JWT / API Key / Basic / None / TBD]
- **Test Auth Strategy**: [Test credentials / Mock auth / Service account / TBD]

## Additional Notes
- [Any project-specific details, constraints, or preferences]
- [If `<safety_boundaries>` Redaction-at-intake was applied: `Original auth answer included a literal <kind> — redacted; agent should request mechanism+source description from user if env var name is unknown.`]
```
