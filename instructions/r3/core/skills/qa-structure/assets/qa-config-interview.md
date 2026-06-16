---
name: qa-config-interview
description: Verbatim user-prompt interview asked at QA Phase 0 when the project config does not yet exist.
---

<qa-config-interview>

Asked verbatim (through the phase's structured-questioning step) only when the project config does not already exist. Validate the answer covers at minimum: document storage (or confirmation docs are in-repo), Swagger/OpenAPI availability, and where test cases come from. If a required field is missing, ask ONE follow-up naming exactly the missing fields (cap: 2 rounds total). This interview is designed to cover every **required** key in `qa-structure/references/config-schema.md` — load that reference to verify coverage if unsure.

```
To automate backend API tests effectively, I need the following project details:

1. **Document Storage**: Where is your project documentation?
   - Confluence (provide space key or page URLs)
   - Google Drive (provide links)
   - Local docs in repository (provide paths)
   - Other (please specify)

2. **API Specification**: Do you have a Swagger/OpenAPI spec?
   - If yes, provide the URL (e.g., https://api.example.com/swagger.json)
   - If yes, also specify the **format**: OpenAPI 3.x, Swagger 2.0, or Other
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
   - ⚠️ Do NOT paste literal credential values (tokens, passwords, API keys) — describe the **mechanism + source** only (e.g. "Bearer JWT from AuthHelper; credentials in env var `AUTH_TOKEN`").

6. **Backend Source Code** (optional — helps me analyze API routes and validation; I can also discover from ARCHITECTURE.md RefSrc references):
   - In RefSrc/ folder (provide project name, e.g., RefSrc/my-backend/)
   - In the current workspace (provide path, e.g., src/, backend/)
   - Not available (I will work from Swagger/docs only)

Please answer what you know — I can discover the rest from code and docs.
```

**After the interview (agent-facing, not part of the verbatim message):**
- **Coverage check:** before proceeding, confirm the answers cover (1) documentation storage, (2) Swagger/OpenAPI availability, and (3) test-case management. If any is missing, trigger the one-follow-up rule (cap 2 rounds total).
- **Output:** populate `qa-structure/assets/qa-project-config-template.md` with these answers (applying its redaction note), then write the result to `agents/qa/qa-project-config.md`.

</qa-config-interview>
