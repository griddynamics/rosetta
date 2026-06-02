---
name: qa-project-config
description: Initialize QA session folder, load or create project config for backend API testing, and collect project info from user.
tags: ["qa"]
baseSchema: docs/schemas/skill.md
---

<qa-project-config>

<role>QA project configuration and session initialization specialist</role>

<when_to_use_skill>
Set up the QA working directory, load existing project config, or collect project-specific information from the user before starting backend API test automation.
</when_to_use_skill>

<prerequisites>
- User provided test case reference (TestRail ID, Jira ticket, or direct description)
- Starting a new QA flow
</prerequisites>

<process>

## 1. Parse Initial User Input

Extract from user's initial prompt:
1. **Test case reference** (REQUIRED): TestRail ID, Jira ticket key/URL, or direct test case description
2. **Additional context** (OPTIONAL): Swagger URL, Confluence pages, API documentation links

Supported formats:
```
"Write API tests for TC-1234"
"Automate backend tests for PROJ-123"
"Create API tests for the user registration endpoint"
"Automate TC-1234, TC-1235 with Swagger: https://api.example.com/swagger"
```

## 2. Setup Output Directory and State File

Create output directory and initialize state file at these canonical paths:

```
agents/qa-state.md           (workflow state file — sibling to agents/qa/)
agents/qa/{IDENTIFIER}/      (per-ticket session directory)
```

Where `{IDENTIFIER}` is:
- Ticket key if from Jira (e.g., `PROJ-123`)
- Test case ID if from TestRail (e.g., `TC-1234`)
- Sanitized kebab-case feature name if direct description (e.g., `user-registration`)

The same `{IDENTIFIER}` value MUST be used in every artifact this skill produces (state file, project config, initial-data file) and in every downstream phase's artifacts under `agents/qa/{IDENTIFIER}/`. Pick once, reuse everywhere.

**Initial state-file content.** Write the following minimum stub to `agents/qa-state.md`; the schema and per-phase update conventions are owned by `qa-flow.md` `<state_file>` (the workflow file updates this file after every phase):

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

Refer to `qa-flow.md` `<state_file>` for the full schema. Downstream phases append per-phase detail; this skill only writes the initial stub above.

## 3. Load or Create Project Config

Search for `qa-project-config.md` at the **canonical path** `agents/qa/qa-project-config.md` (project-wide, **not** per-`{IDENTIFIER}` — the same config is shared across all tickets in the project).

**Branches (exhaustive):**
- **File exists AND non-empty:** skip to step 5 (loaded; nothing to collect).
- **File missing OR exists but empty:** proceed to step 4. Do NOT create an empty placeholder file at this point — step 5 will write the populated file.

## 4. Collect Project Info From User

Execute ONLY if project config does not already exist.

Ask user:
```
To automate backend API tests effectively, I need the following project details:

1. **Document Storage**: Where is your project documentation?
   - Confluence (provide space key or page URLs)
   - Google Drive (provide links)
   - Local docs in repository (provide paths)
   - Other (please specify)

2. **API Specification**: Do you have a Swagger/OpenAPI spec?
   - If yes, provide the URL (e.g., https://api.example.com/swagger.json)
   - If no, I will work from documentation and code analysis

3. **Test Case Management**: Where are your test cases stored?
   - TestRail (provide project/suite IDs)
   - Jira (test cases as tickets or in description)
   - Confluence (test case pages)
   - Provided directly in this conversation
   - Other (please specify)

4. **Test Framework** (optional — I can discover from codebase):
   - What test framework does the project use? (e.g., pytest, Jest, JUnit, RestAssured, SuperTest)
   - Where are existing API tests located? (e.g., tests/api/, src/test/)

5. **Authentication** (optional — I can discover from Swagger/code):
   - What auth mechanism does the API use? (OAuth2, JWT, API Key, Basic, None)
   - How should tests authenticate? (test credentials, mock auth, service account)

6. **Backend Source Code** (optional — helps me analyze API routes and validation; I can also discover from ARCHITECTURE.md RefSrc references):
   - In RefSrc/ folder (provide project name, e.g., RefSrc/my-backend/)
   - In the current workspace (provide path, e.g., src/, backend/)
   - Not available (I will work from Swagger/docs only)

Please answer what you know — I can discover the rest from code and docs.
```

Validate that the response covers at minimum:
- Document storage location OR confirmation that docs are in the repository
- Whether Swagger/OpenAPI is available
- Where test cases come from

If critical information is missing, ask follow-up questions.

## 5. Save Project Config

Save to the canonical path `agents/qa/qa-project-config.md` (project-wide; same file referenced by step 3 above and by `qa-data-collection`'s prerequisites):

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
```

## 6. Create Initial Data File

File: `agents/qa/{IDENTIFIER}/initial-data.md`

```markdown
# Initial Data - [IDENTIFIER]

**Initial user prompt**: [USER PROMPT]
**Project config file — USE AS REFERENCE FOR THE NEXT PHASE**: [PROJECT CONFIG FILENAME]
**Test case reference**: [TestRail ID / Jira key / Description summary]
**Additional links provided**: [List or None]
```

</process>

<safety_boundaries>

`agents/qa/qa-project-config.md` is a **tracked, project-wide artifact** committed to version control and read by every QA session for this project. The step-4 prompt actively elicits credential-shaped information (auth mechanism, test credentials, service account); without redaction discipline a user-pasted token would persist into the repo.

**Auth fields — record mechanism + source, never literal values:**

- **API Auth Mechanism** (step 5 field): record the **scheme name** (`OAuth2 client-credentials` / `JWT Bearer` / `API Key in X-Api-Key header` / `Basic Auth` / `Session cookie` / `None`). Acceptable; this is structural.
- **Test Auth Strategy** (step 5 field): record the **strategy + source** — `Bearer JWT obtained from helper AuthHelper.get_token('admin'); credentials in env vars E2E_USER + E2E_PASS` or `Service account JSON loaded from secret-manager path projects/foo/secrets/qa-sa` or `Mock auth — bypass middleware sets x-test-user header`. **Never paste:** the actual token, the actual password, the literal JSON contents, the literal API key value, OAuth client_secret, or any production-environment secret — regardless of whether the user labeled it "test" or "throwaway".
- **Redaction at intake:** if the user's step-4 answer pastes a literal secret (`Bearer eyJ...`, `password: SuperSecret123`, a literal API key, a JSON blob with `client_secret`), redact at capture time before writing step 5. Replace with the mechanism+source description and add a one-line note in `## Additional Notes`: `Original auth answer included a literal <kind> — redacted; agent should request mechanism+source description from user if env var name is unknown.`
- **Other credential-shaped fields:** `Test Case Management` access tokens (TestRail API key, Jira PAT) — record as `MCP-managed` or `env var <NAME>`, never the literal token. Confluence/SharePoint base URLs are safe; embedded credentials in URLs (`https://user:pass@host`) are redacted to `https://<redacted: credentialed URL>` with the credential location described in prose.
- **Synthetic test-user identities** (when the user supplies an example test account): keep emails on IETF reserved domains (`test.user-1@example.com`), do not record real production-account emails even if "marked test".

**Structural content stays verbatim** — endpoint paths, framework names, directory paths, MCP names, spec URLs without embedded credentials, test-case-system identifiers (TestRail project IDs, Jira project keys). Redaction targets sensitive **values**, not the structural config.

This boundary is consistent with `qa-gap-analysis` and `qa-test-debugging` `<safety_boundaries>` — all three artifacts under `agents/qa/` follow the same redaction discipline.

</safety_boundaries>

<failure_handling>

- **Test case reference missing or unparseable from the initial prompt** (step 1 cannot extract a TestRail ID, Jira key, or feature description): stop, report `qa-project-config: test case reference unresolvable from initial prompt "<prompt>"` to the calling workflow, ask the user to supply one of: TestRail case ID (`TC-NNNN`), Jira ticket key (`PROJ-NNN` or URL), or a kebab-case feature name. Do NOT fabricate an `{IDENTIFIER}` — every downstream phase's path depends on this value being correct.
- **`{IDENTIFIER}` ambiguous** (multiple references supplied — e.g., both a Jira key and a TestRail ID): apply the same precedence as `qa-flow.md` Phase 0 (Jira key → TestRail ID → kebab-case feature name; first non-empty wins). Record the chosen value AND the rejected candidates in the initial-data file's `Additional links provided` section. Do not silently drop the rejected candidate.
- **Step-4 minimum-info follow-up loop:** if after the first prompt the response is missing one of the three required fields (document storage, Swagger availability, test case source), ask **one** follow-up question naming exactly the missing fields. Do NOT exceed two total rounds (initial + one follow-up).
- **Step-4 follow-up still incomplete** (after one follow-up the user still cannot/will not provide the minimum required info): **stop** rather than fabricate. Record `Phase 0 blocked: minimum project info not obtained after follow-up — missing: <list>` in `agents/qa-state.md` and tell the user the phase is paused pending the information. Do NOT proceed with TBD-marked config for fields where the user explicitly declined to answer — that's silent progression that breaks downstream phases. (`TBD — will discover from codebase/spec` IS acceptable when the user explicitly opts into discovery; it is NOT acceptable as a default fallback when the user simply didn't answer.)
- **User-pasted literal credential in step-4 answer:** apply `<safety_boundaries>` redaction at capture — replace with mechanism+source description, record the redaction in `## Additional Notes`, do not persist the literal value to disk anywhere. If env-var name is unknown, ask once for it.
- **`agents/qa-state.md` or `qa-project-config.md` unwritable** (permission denied, file locked, disk full): pause, report the filesystem error with the file path, do not mark Phase 0 complete.
- **Existing config file present but malformed/corrupt** (step 3 finds a non-empty file but it doesn't parse or is missing required sections): treat as `config-incomplete` — go to step 4 for the missing sections only, then step 5 writes a corrected file (preserving any clean sections). Surface the corruption to the user in the initial-data file's notes.

</failure_handling>

<pitfalls>
- Proceeding without asking the user when project config doesn't exist
- Overwriting an existing, valid project config
- Not validating that minimum required info (doc storage, Swagger availability, test case source) is collected
- Using inconsistent IDENTIFIER naming (must match across all phase artifacts)
- Writing the project config under `agents/qa/{IDENTIFIER}/qa-project-config.md` instead of the canonical project-wide path `agents/qa/qa-project-config.md` — the config is shared across all tickets, not per-ticket
- Skipping the `agents/qa-state.md` initial stub or writing it with an unspecified `IDENTIFIER` field
- Persisting a literal user-pasted token / password / API key / service-account JSON into the saved config — apply `<safety_boundaries>` redaction at intake, before step 5 writes
- Fabricating an `{IDENTIFIER}` when the test case reference is unparseable — stop and ask per `<failure_handling>`, do not invent
- Looping indefinitely on step-4 follow-up questions — cap at one follow-up per `<failure_handling>`
</pitfalls>

<validation_checklist>

Before declaring this skill complete, all of the following must hold:

- **Session directory created:** `agents/qa/{IDENTIFIER}/` exists.
- **State file initialized:** `agents/qa-state.md` exists with the initial stub from step 2 (Last Updated / Current Phase: 0 / IDENTIFIER / Phase Completion Status table with Phase 0 checked).
- **Project config present:** `agents/qa/qa-project-config.md` (canonical project-wide path) exists and is non-empty — either pre-existing (step 3 path A) or freshly saved by step 5 (path B).
- **Initial-data file written:** `agents/qa/{IDENTIFIER}/initial-data.md` exists with all four template fields populated (Initial user prompt / Project config file / Test case reference / Additional links).
- **IDENTIFIER consistency:** the same `{IDENTIFIER}` value appears in (a) the `agents/qa/{IDENTIFIER}/` directory name, (b) the `IDENTIFIER:` field of `agents/qa-state.md`, and (c) the directory portion of the `initial-data.md` path. If any of the three differ, the skill is NOT complete — re-run step 2 and propagate the corrected value.
- **No empty placeholders:** project config has real values (or explicit `TBD` where optional + explanation), not blank fields.
- **Canonical paths only:** no use of the deprecated `<agent_folder>` placeholder anywhere in the produced files; all paths follow the canonical scheme documented in step 2 and step 5.
- **No literal credentials persisted:** `agents/qa/qa-project-config.md` was scanned for credential-shaped patterns (`Bearer `, `password:`, `api_key=`, JWT shape `eyJ...`, `BEGIN PRIVATE KEY`, OAuth `client_secret`, `postgres://user:pass@`) per `<safety_boundaries>` — auth fields carry mechanism + source descriptions only; any literal value from the user's step-4 answer was redacted at intake and the redaction is noted in `## Additional Notes`.
- **No fabricated `{IDENTIFIER}`:** the chosen value traces to a real TestRail ID / Jira key / feature reference from the user's prompt; if the prompt was unparseable, the failure path in `<failure_handling>` was followed (stop + ask) rather than guessing.

</validation_checklist>

</qa-project-config>
