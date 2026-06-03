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

**Initial state-file content.** Write the minimum stub to `agents/qa-state.md` — verbatim template lives in [references/templates.md](references/templates.md) (loaded on demand). The full per-phase update schema is owned by `qa-flow.md` `<state_file>`; this skill only writes the initial stub.

## 3. Load or Create Project Config

Search for `qa-project-config.md` at the **canonical path** `agents/qa/qa-project-config.md` (project-wide, **not** per-`{IDENTIFIER}` — the same config is shared across all tickets in the project).

**Branches (exhaustive):**
- **File exists AND non-empty:** skip to step 5 (loaded; nothing to collect).
- **File missing OR exists but empty:** proceed to step 4. Do NOT create an empty placeholder file at this point — step 5 will write the populated file.

## 4. Collect Project Info From User

Execute ONLY if project config does not already exist.

Ask the user using the verbatim step-4 prompt template in [references/templates.md](references/templates.md#step-4-user-prompt-template-referenced-from-skillmd-step-4) — load on demand at this step.

Validate that the response covers at minimum:
- Document storage location OR confirmation that docs are in the repository
- Whether Swagger/OpenAPI is available
- Where test cases come from

If critical information is missing, ask follow-up questions (cap per `<failure_handling>`).

## 5. Save Project Config

Save to the same canonical path as step 3 (`agents/qa/qa-project-config.md`). Verbatim template lives in [references/templates.md](references/templates.md) — loaded on demand at this step. Required sections: **Document Storage** / **API Specification** / **Backend Source Code** / **Test Case Management** / **Test Framework** / **Authentication** / **Additional Notes**. Populate from the user's step-4 answers; mark optional fields `TBD — <reason>` when discovery is intentionally deferred.

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

<success_criteria>
Complete when **all** of the following hold: (1) `agents/qa/{IDENTIFIER}/` session directory exists; (2) `agents/qa-state.md` initial stub written per step 2; (3) `agents/qa/qa-project-config.md` (project-wide canonical path) exists and is non-empty — either pre-existing or freshly saved by step 5; (4) `agents/qa/{IDENTIFIER}/initial-data.md` written with all four template fields populated; (5) `{IDENTIFIER}` is consistent across the directory name, state file, and initial-data path; (6) no literal credential persisted in the saved config (per `<safety_boundaries>` Redaction-at-intake) — OR a `<failure_handling>` stop path was followed and the user was re-prompted. NOT complete if any of (1)–(6) fails silently, if `{IDENTIFIER}` was fabricated, or if a literal credential survived into the saved config.
</success_criteria>

<safety_boundaries>

`agents/qa/qa-project-config.md` is **tracked + project-wide** (committed to VCS, read by every QA session). Step-4 elicits credential-shaped information — a user-pasted token would persist into the repo without redaction.

**Auth fields — record mechanism + source, never literal values:**

- **API Auth Mechanism** (step 5 field): record the **scheme name** only (`OAuth2 client-credentials` / `JWT Bearer` / `API Key in X-Api-Key header` / `Basic Auth` / `Session cookie` / `None`). Structural; acceptable.
- **Test Auth Strategy** (step 5 field): record the **strategy + source** (e.g., `Bearer JWT from AuthHelper.get_token('admin'); credentials in env vars E2E_USER + E2E_PASS`). **Never paste:** actual tokens, passwords, JSON contents, API key values, OAuth `client_secret`, or any production secret — regardless of "test"/"throwaway" labels.
- **Redaction at intake:** if a step-4 answer pastes a literal secret (`Bearer eyJ...`, `password: SuperSecret123`, JSON with `client_secret`, etc.), redact at capture time before writing step 5: replace with mechanism+source description + add one-line `## Additional Notes`: `Original auth answer included a literal <kind> — redacted; agent should request mechanism+source description from user if env var name is unknown.`
- **Other credential-shaped fields:** `Test Case Management` access tokens (TestRail API key, Jira PAT) → record as `MCP-managed` or `env var <NAME>`. Credentialed URLs (`https://user:pass@host`) → redact to `https://<redacted: credentialed URL>` + describe credential location in prose.
- **Synthetic test-user identities:** keep emails on IETF reserved domains (`test.user-1@example.com`); do not record real production emails even if "marked test".

**Structural content stays verbatim** — endpoint paths, framework names, directory paths, MCP names, spec URLs without embedded credentials, TestRail/Jira project keys. Redaction targets sensitive **values**.

Consistent with `qa-gap-analysis` and `qa-test-debugging` `<safety_boundaries>`.

</safety_boundaries>

<failure_handling>

- **Test case reference missing or unparseable** (step 1 cannot extract a TestRail ID, Jira key, or feature description): stop, report `qa-project-config: test case reference unresolvable from initial prompt "<prompt>"`, ask the user for a TestRail case ID, Jira ticket key, or kebab-case feature name. Do NOT fabricate an `{IDENTIFIER}` — every downstream path depends on it.
- **`{IDENTIFIER}` ambiguous** (multiple references — e.g., Jira key AND TestRail ID): apply `qa-flow.md` Phase 0 precedence (Jira key → TestRail ID → kebab-case; first non-empty wins). Record chosen value + rejected candidates in `initial-data.md` `Additional links provided`.
- **Step-4 minimum-info follow-up loop:** if the first response misses one of the three required fields (doc storage, Swagger availability, test case source), ask ONE follow-up naming exactly the missing fields. Cap: 2 total rounds (initial + one follow-up).
- **Step-4 follow-up still incomplete:** stop, record `Phase 0 blocked: minimum project info not obtained after follow-up — missing: <list>` in `agents/qa-state.md`. Do NOT silently fall back to TBD for fields the user actually declined. (`TBD — will discover from codebase/spec` is acceptable only when the user explicitly opts into discovery.)
- **User-pasted literal credential in step-4 answer:** apply `<safety_boundaries>` Redaction-at-intake. If env-var name is unknown, ask once.
- **`agents/qa-state.md` or `qa-project-config.md` unwritable:** pause, report the filesystem error with the path; do not mark Phase 0 complete.
- **Existing config file malformed/corrupt** (step 3 finds non-empty but unparseable / missing required sections): treat as `config-incomplete` — go to step 4 for missing sections only, step 5 writes corrected file preserving clean sections. Surface corruption in `initial-data.md` notes.

</failure_handling>

<pitfalls>
(Each item is a pointer; the rule lives in the cited section.)
- Proceeding without asking when project config doesn't exist → `<process>` step 3 path B.
- Overwriting an existing, valid project config → `<process>` step 3 path A.
- Skipping minimum-info validation → `<process>` step 4 + `<failure_handling>` follow-up loop.
- Per-IDENTIFIER path instead of canonical project-wide → `<process>` step 3 (path note).
- Missing `agents/qa-state.md` stub or unspecified `IDENTIFIER` → `<process>` step 2.
- Literal credential persisted into saved config → `<safety_boundaries>` Redaction-at-intake.
- Fabricated `{IDENTIFIER}` on unparseable reference → `<failure_handling>` "Test case reference missing".
- Indefinite step-4 follow-up loop → `<failure_handling>` "Step-4 minimum-info" cap.
</pitfalls>

<validation_checklist>

9-item pre-emit checklist lives in [references/validation-checklist.md](references/validation-checklist.md) — loaded on demand at session-init completion.

</validation_checklist>

</qa-project-config>
