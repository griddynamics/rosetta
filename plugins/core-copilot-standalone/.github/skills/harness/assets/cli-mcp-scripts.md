<harness_actions>

Callable surface the agent uses to exercise a RUNNING service.

<delivery_shape>

- CLI — default. No install, any coding agent, output lands in context.
- MCP — native tool calls, typed args; costs per-developer IDE config. Choose when called constantly, mid-conversation.
- Scripts — only when the stack already standardizes on them (make, npm, task, gradle, python, typescript, bash/zsh, powershell).
- Dual CLI+MCP — one core, two thin frontends. Never two implementations.

Decide with the user; record the choice.

</delivery_shape>

<encapsulation>

Encode once, so no session rediscovers it:

- endpoint construction, API versioning, pagination
- authentication, token refresh, impersonation
- secret loading via the project's real mechanism — never hardcoded, never a CLI argument
- required headers, tenant and correlation ids, idempotency keys
- naming conventions, FK resolution, reference-data lookups
- markers separating test data from real (dedicated test client, `[test]` suffix, reserved id range)

</encapsulation>

<actions>

- One action = smallest MEANINGFUL business outcome, several calls composed. Not an endpoint wrapper.
  `create-order` ⇒ authenticate → resolve test client → create order with test marker → add items → return id.
- Name by outcome, imperative: `create-order`, `submit-payment`, `expire-session`.
- Each action: own command AND own file. One area → one folder or module.
- Shared core: auth, transport, tracing, redaction, config, error mapping. DRY.
- Modular from version one — 3 actions today, 60 later.
- Actions compose into scenarios by calling each other; never copy internals.

</actions>

<output_contract>

- Verbose by default, `--quiet` opt-in. Evidence is the deliverable.
- Curated trace, never a dump: request method + URL + relevant headers + body · response status + relevant headers + body · elapsed. Drop framework noise, boilerplate headers, unchanged defaults.
- Multi-call actions print every call in order — the sequence is what gets verified.
- Redact credentials, tokens, cookies, keys on EVERY path. Default, not a flag.
- `--show-secrets` opt-in, auth debugging only. USE SKILL `sensitive-data` before authoring it, and before such output is shown, stored, or committed.
- Exit code reflects outcome; failure prints the failing call's full trace.

</output_contract>

<environment_boundary>

- Default target: local or devcontainer.
- Shared, staging, or higher: HITL gate. USE SKILL `risk-assessment`, `dangerous-actions`.
- Destructive actions touch only data the harness created and marked.
- Target is explicit config or a required flag — never an implicit default resolving to production.

</environment_boundary>

<why_verbose>

Execute → see real request/response → verify behavior → write tests from observed payloads, not invented ones. Missing, noisy, or over-redacted trace breaks the loop.

</why_verbose>

<registration>

One MoSCoW sentence in `ARCHITECTURE.md` under `## Harness`: what to run, for what, against which environment. `--help` is the reference — write no manual.

</registration>

</harness_actions>
