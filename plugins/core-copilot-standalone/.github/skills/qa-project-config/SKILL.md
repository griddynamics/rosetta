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

## 2. Setup Output Directory

Create output directory and initialize state file:
```
agents/qa-state.md           (initialize at agents/ root)
agents/qa/{IDENTIFIER}/      (create session directory)
```

Where `{IDENTIFIER}` is:
- Ticket key if from Jira (e.g., `PROJ-123`)
- Test case ID if from TestRail (e.g., `TC-1234`)
- Sanitized feature name if direct description (e.g., `user-registration`)

## 3. Load or Create Project Config

Find `qa-project-config.md` in the repo's agent-specific directory.

- If found and non-empty: skip to step 5
- If not found: proceed to step 4

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

Save to `<agent_folder>/qa-project-config.md`:

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

<pitfalls>
- Proceeding without asking the user when project config doesn't exist
- Overwriting an existing, valid project config
- Not validating that minimum required info (doc storage, Swagger availability, test case source) is collected
- Using inconsistent IDENTIFIER naming (must match across all phase artifacts)
</pitfalls>

</qa-project-config>
