# FR-CLI — CLI Frontend

CLI frontend requirements for rosettify.

## FR-CLI-0001 Standard CLI Convention

<req id="FR-CLI-0001" type="FR" level="System">
  <title>Standard CLI argument structure</title>
  <statement>The CLI SHALL follow the convention: rosettify [options] [command] [subcommand] [parameters]. Implemented using commander 14.0.3.</statement>
  <rationale>User request: "must use standard libraries and modern approaches"</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rosettify plan create '{"name":"test"}'. When: parsed. Then: command=plan, subcommand=create, parameter=JSON string.</criteria>
  </acceptance>
</req>

## FR-CLI-0002 --mcp Flag

<req id="FR-CLI-0002" type="FR" level="System">
  <title>--mcp flag starts MCP stdio server</title>
  <statement>rosettify --mcp SHALL start the MCP stdio server instead of processing CLI commands. This flag is mutually exclusive with command arguments.</statement>
  <rationale>User request: "You can pass --mcp and it works as a local mcp server using stdio"</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rosettify --mcp. When: started. Then: MCP server listens on stdin/stdout via stdio transport. Given: rosettify --mcp plan create. Then: error — mutually exclusive.</criteria>
  </acceptance>
</req>

## FR-CLI-0003 Exit Codes

<req id="FR-CLI-0003" type="FR" level="System">
  <title>Meaningful exit codes</title>
  <statement>The CLI SHALL exit with code 0 on success and help. Exit code 1 on errors (unknown command, invalid input, runtime failure).</statement>
  <rationale>Standard CLI convention. From plan_manager.js behavior.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: successful command. Then: exit 0. Given: unknown command. Then: exit 1. Given: help. Then: exit 0.</criteria>
  </acceptance>
</req>

## FR-CLI-0004 JSON-Only Output

<req id="FR-CLI-0004" type="FR" level="System">
  <title>CLI frontend: transformed payload to stdout, envelope never exposed</title>
  <statement>The CLI frontend SHALL analyze the final EnrichedEnvelope per FR-ARCH-0014 and write exactly one JSON payload to stdout per invocation. The envelope structure is never the output.

- On success (ok=true): write the `result` field as JSON to stdout.
- On failure (ok=false): write a sanitized JSON error payload to stdout containing the `error` string and, if present, the `help` field. The payload SHALL NOT include stack traces, internal paths, or security-sensitive details. The error message SHALL be sufficient for an AI agent to diagnose and correct its invocation. Failures are also logged to the log file via the shared logger (FR-SHRD-0007).

Unexpected top-level errors (e.g., commander parse failures) go to stderr as a minimal JSON error object. No ANSI colors, no progress, no intermediate output. Only the CLI frontend writes to stdout — run delegates never do (FR-ARCH-0008).</statement>
  <rationale>AI-first design. stdout is a clean channel for structured, consumer-ready results. The envelope is internal plumbing — exposing it forces consumers to unwrap a layer that is meaningless to them. Logging failures ensures traceability even when the consumer does not persist output.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: successful plan create. When: CLI executes. Then: stdout is {plan_file, name, status} — no ok, error, or include_help fields.
Given: plan_not_found error. When: CLI executes. Then: stdout is {error: "plan_not_found"} — no ok, result, or include_help fields. Exit code 1. Failure logged.
Given: usage error with help. When: CLI executes. Then: stdout is {error: "...", help: {...}} — no envelope wrapper. Exit code 1. Failure logged.
Given: any invocation. When: executed. Then: stdout is valid JSON parseable by JSON.parse(). No log lines or stack traces on stdout.</criteria>
  </acceptance>
</req>

## FR-CLI-0005 Input Parsing

<req id="FR-CLI-0005" type="FR" level="System">
  <title>Accept both comma-separated and space-separated lists</title>
  <statement>Where commands accept lists (e.g., agent names for install), the CLI SHALL accept both comma-separated (windsurf,claudecode) and space-separated (windsurf claudecode) formats.</statement>
  <rationale>User request confirming both syntaxes.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: "rosettify install windsurf,claudecode". Then: parsed as [windsurf, claudecode]. Given: "rosettify install windsurf claudecode". Then: same result.</criteria>
  </acceptance>
</req>
