# FR-ARCH — Architecture

Internal architecture requirements for rosettify.

## FR-ARCH-0001 Tool Registry

<req id="FR-ARCH-0001" type="FR" level="System">
  <title>Static tool registry</title>
  <statement>The system SHALL maintain a static registry of tools where each tool is defined by: name (== command), brief (when to use), description (how it works), input schema (JSON Schema), output schema (JSON Schema), cli flag (boolean), mcp flag (boolean), and a "run" delegate function.</statement>
  <rationale>Single source of truth for all tool metadata. Both CLI and MCP frontends read from this registry.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a registered tool. When: the registry is queried by name. Then: all metadata fields (name, brief, description, input schema, output schema, cli, mcp, run) are returned.</criteria>
  </acceptance>
</req>

## FR-ARCH-0002 Dual Frontend Model

<req id="FR-ARCH-0002" type="FR" level="System">
  <title>CLI and MCP as thin frontends over shared run delegates</title>
  <statement>The system SHALL provide two frontends — CLI and MCP — that both invoke the same "run" delegate from the tool registry. Frontends handle only input parsing and output formatting. Business logic lives exclusively in run delegates.</statement>
  <rationale>Prevents duplication. One implementation, two access modes.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a tool invoked via CLI and the same tool invoked via MCP with identical parameters. When: both complete. Then: the run delegate is called exactly once per invocation with the same input, and both return equivalent output.</criteria>
  </acceptance>
</req>

## FR-ARCH-0003 Modular Command Structure

<req id="FR-ARCH-0003" type="FR" level="System">
  <title>Each command in a separate module</title>
  <statement>Each command (plan, help, install, uninstall, upgrade, generate, handle) SHALL be implemented as a separate TypeScript module or submodule. The tool registry imports and registers each module's tool definitions.</statement>
  <rationale>Architectural requirement from user. Enforces separation of concerns, allows incremental development.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the source tree. When: inspected. Then: each command resides in its own directory/module under a commands/ folder, with no cross-command imports except through the registry.</criteria>
  </acceptance>
</req>

## FR-ARCH-0004 Run Delegate Contract

<req id="FR-ARCH-0004" type="FR" level="System">
  <title>Uniform run delegate signature</title>
  <statement>Every run delegate SHALL accept a typed input object (matching the tool's input schema) and return a typed output object (matching the tool's output schema). All I/O is JSON-serializable. Run delegates SHALL NOT read from stdin, write to stdout, write to stderr, or perform any direct I/O. They are pure functions that receive input and return output.</statement>
  <rationale>Enables both frontends to serialize/deserialize uniformly. stdin/stdout are reserved for MCP protocol and hook I/O.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any run delegate. When: called with a valid input object. Then: it returns a JSON-serializable output object. When: called with an invalid input. Then: it returns a structured error object, not an exception.</criteria>
  </acceptance>
</req>

## FR-ARCH-0005 Tool Flags

<req id="FR-ARCH-0005" type="FR" level="System">
  <title>CLI and MCP availability flags per tool</title>
  <statement>Each tool in the registry SHALL have independent `cli` and `mcp` boolean flags controlling whether it is exposed through the CLI frontend, the MCP frontend, or both.</statement>
  <rationale>Some tools may be CLI-only or MCP-only.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a tool with cli=true, mcp=false. When: MCP lists tools. Then: the tool is not listed. When: CLI lists commands. Then: the tool is listed.</criteria>
  </acceptance>
</req>

## FR-ARCH-0006 Subcommand Registration

<req id="FR-ARCH-0006" type="FR" level="System">
  <title>One command = one registry entry = one run delegate</title>
  <statement>Each command (plan, help, install, etc.) SHALL be registered as one tool in the registry with one run delegate. If a command uses subcommands, the subcommand is just another input parameter — the run delegate receives it like any other field. Both frontends construct the same input object and call the same run delegate. CLI parses "rosettify plan create ..." into {subcommand: "create", ...} and calls the plan run delegate. MCP receives {subcommand: "create", ...} as tool params and calls the plan run delegate. There is no difference.</statement>
  <rationale>User request: "in MCP mode each command is separate tool and subcommand/parameters are params". Frontends are irrelevant — same input, same delegate.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: registry with commands plan, help, install. When: MCP lists tools. Then: exactly 3 MCP tools (one per command). Given: CLI "rosettify plan create '...'" and MCP CallTool "plan" {subcommand: "create", ...} with identical data. When: both execute. Then: both call the plan run delegate with the same input object and produce the same output.</criteria>
  </acceptance>
</req>

## FR-ARCH-0008 I/O Isolation

<req id="FR-ARCH-0008" type="FR" level="System">
  <title>stdin/stdout are never touched outside frontends</title>
  <statement>No code outside of the two frontends (CLI, MCP) SHALL read from stdin or write to stdout. This is unconditional — no IF checks, no mode detection. Run delegates, command modules, utilities, and all internal code SHALL NEVER access process.stdin or process.stdout. stdin/stdout are reserved for: MCP protocol (bidirectional) and CLI result output (stdout, by CLI frontend only). Errors and diagnostics from frontends go to stderr. Logs go to a log file only.</statement>
  <rationale>MCP uses stdin/stdout as its transport. Any stray write corrupts the protocol. Any stray read consumes protocol data. This is not a mode-specific rule — it is absolute.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any run delegate or internal module. When: code is inspected. Then: zero references to process.stdin, process.stdout, console.log, console.info, or console.warn. Given: rosettify running in MCP mode. When: a tool is invoked. Then: only MCP protocol messages appear on stdout. Given: rosettify running as hook handler. When: invoked. Then: only the result JSON appears on stdout.</criteria>
  </acceptance>
</req>

## FR-ARCH-0009 No Progress or Intermediate Output

<req id="FR-ARCH-0009" type="FR" level="System">
  <title>No progress bars, spinners, or intermediate human-oriented output</title>
  <statement>The system SHALL NOT produce progress bars, spinners, status updates, intermediate results, or any human-oriented output. The primary consumer is AI — it does not need visual feedback. Each invocation produces exactly one result object returned by the run delegate. Frontends output that result once.</statement>
  <rationale>AI agents parse structured output. Progress indicators corrupt parsing and waste tokens.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any command execution. When: stdout and stderr are captured. Then: stdout contains exactly one JSON result (or MCP messages), stderr contains only errors/diagnostics if any, no progress text anywhere.</criteria>
  </acceptance>
</req>

## FR-ARCH-0010 Logging to File Only

<req id="FR-ARCH-0010" type="FR" level="System">
  <title>All logs written to log file, never to stdout/stderr</title>
  <statement>Any diagnostic or debug logging SHALL be written to a log file only. Logs SHALL NOT go to stdout (reserved for protocol/results) or stderr (reserved for error output from frontends). Log file location shall be configurable.</statement>
  <rationale>Keeps stdout/stderr clean for protocol and structured error output.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rosettify with debug logging enabled. When: a command runs. Then: log entries appear in the log file. stdout and stderr contain no log lines.</criteria>
  </acceptance>
</req>

## FR-ARCH-0011 Common Output Envelope

<req id="FR-ARCH-0011" type="FR" level="System">
  <title>All run delegates return a common output envelope</title>
  <statement>Every run delegate SHALL return a common JSON envelope: {ok: boolean, result: object|null, error: string|null, include_help: boolean}. On success: ok=true, result contains command-specific data, error=null, include_help=false. On failure: ok=false, result=null, error contains the error code (with optional detail), include_help=true when the error is related to incorrect usage (bad subcommand, invalid params, unrecognized input). Only the delegate knows what to return — it owns the envelope. The envelope is an INTERNAL contract between run delegates, the dispatch/enrichment layer, and frontends. It is never directly serialized and sent to the consumer. Frontends analyze the envelope and transform it into appropriate output per FR-ARCH-0014.</statement>
  <rationale>Uniform contract between delegates and frontends. Keeping the envelope internal allows frontends to produce clean, consumer-appropriate output without exposing implementation internals.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any run delegate returning success. Then: {ok: true, result: {...}, error: null, include_help: false}. Given: run delegate returning usage error. Then: {ok: false, result: null, error: "...", include_help: true}. Given: run delegate returning runtime error (e.g., plan_not_found). Then: {ok: false, result: null, error: "plan_not_found", include_help: false}. In all cases: the consumer-facing output never contains the envelope wrapper — only the extracted payload (FR-ARCH-0014).</criteria>
  </acceptance>
</req>

## FR-ARCH-0014 Frontend Output Transformation

<req id="FR-ARCH-0014" type="FR" level="System">
  <title>Frontends transform EnrichedEnvelope into consumer-appropriate output</title>
  <statement>Frontends (CLI, MCP) SHALL analyze the final EnrichedEnvelope produced by the dispatch layer and transform it into appropriate output. The envelope is INTERNAL — its structure ({ok, result, error, include_help, help}) SHALL NEVER be directly serialized as the output payload.

Transformation rules:
- ok=true: extract and output only the `result` field.
- ok=false: extract and output a sanitized error payload containing: the `error` string and, if present, the `help` field. Output SHALL NOT include stack traces, internal implementation paths, or security-sensitive details. The error message SHALL be sufficient for an AI agent to understand what went wrong and how to correct its invocation.

Additionally, regardless of outcome, all failures (ok=false) SHALL be logged by the frontend via the shared logger before output is written (FR-SHRD-0007).</statement>
  <rationale>Exposing the envelope wrapper leaks internal implementation details to consumers and forces them to unwrap a layer that is meaningless to them. Clean output reduces AI agent parsing complexity and prevents accidental dependency on internal fields.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: dispatch returns {ok: true, result: {plan_file: "x.json", name: "plan", status: "open"}, error: null, include_help: false}. When: CLI or MCP outputs result. Then: consumer receives {plan_file: "x.json", name: "plan", status: "open"} — no ok, no error, no include_help fields.
Given: dispatch returns {ok: false, result: null, error: "plan_not_found", include_help: false}. When: CLI or MCP outputs failure. Then: consumer receives {error: "plan_not_found"} — no ok, no result, no include_help fields. Failure also logged.
Given: dispatch returns {ok: false, error: "unknown_command: foo | valid: ...", include_help: true, help: {...}}. When: CLI or MCP outputs failure. Then: consumer receives {error: "unknown_command: foo | valid: ...", help: {...}} — no ok, no result, no include_help fields. Failure also logged.</criteria>
  </acceptance>
</req>

## FR-ARCH-0012 Help Enrichment

<req id="FR-ARCH-0012" type="FR" level="System">
  <title>System enriches output with help when include_help is true</title>
  <statement>An orchestration layer between the run delegate and the frontend SHALL check include_help in the returned envelope. When include_help=true, it SHALL call the help run delegate for the current command and merge the help output into the response as a "help" field. The final output to the consumer contains both the error and the contextual help. Run delegates never produce help content themselves.</statement>
  <rationale>AI agents get error context and corrective help in one response.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: plan run delegate returns {ok: false, error: "unknown_subcommand: explode", include_help: true}. When: orchestration layer processes it. Then: final output is {ok: false, error: "unknown_subcommand: explode", help: {commands: [...], ...}}. Given: include_help=false. Then: no help field in final output.</criteria>
  </acceptance>
</req>

## FR-ARCH-0007 AI-First Output Design

<req id="FR-ARCH-0007" type="FR" level="System">
  <title>All command output is JSON</title>
  <statement>All command output SHALL be valid JSON for both CLI and MCP frontends. Output structure SHALL be machine-readable so it can be consumed by AI agents and pluggable automation. Outputs SHALL include a brief explanation of what is returned (unless self-evident) and suggested next actions where applicable. This rule applies to every command without exception.</statement>
  <rationale>Primary consumers are AI coding agents and automation pipelines that need structured, parseable responses. A single uniform output contract simplifies integration and avoids special cases.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any command invoked via CLI or MCP. When: it completes successfully or fails. Then: stdout output parses as valid JSON. No command emits non-JSON output to the consumer.</criteria>
  </acceptance>
</req>

## FR-ARCH-0016 No Internal Traceability Leakage in Outputs

<req id="FR-ARCH-0016" type="FR" level="System">
  <title>Emitted outputs SHALL NOT leak internal traceability or implementation references</title>
  <statement>Every output emitted to a consumer — success results, error responses, and help payloads (including command/subcommand descriptions, schema descriptions, examples, and notes) — SHALL NOT contain internal traceability or implementation references. Forbidden tokens in emitted output include: requirement identifiers (`FR-*`, `NFR-*`), ticket identifiers (e.g. `CTORNDGAIN-*`), internal source file paths, internal-only module names, and internal dataset or collection prefixes. These references MAY appear only in source code (comments, traceability annotations) and in requirement documents — never in emitted output. Emitted guidance SHALL be self-contained and directive: it states what the consumer must do or what is returned, and SHALL NOT include authoring rationale, cross-references to requirements, or design history. Meaningful public type names that double as schema keys (e.g. a result type name) are NOT internal references and are permitted.</statement>
  <rationale>Consumers are AI agents and humans who must not be confused or misled by Rosetta-internal bookkeeping. Requirement IDs, ticket numbers, and internal paths are authoring artifacts that carry no actionable meaning for a caller and erode trust in the output. Keeping them in code and requirement docs preserves traceability without leaking it. The directive-only rule mirrors spec hygiene: emitted notes must teach the caller what to do, not why the author wrote them that way.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any command output (result, error, or help payload) emitted via CLI or MCP. When: the serialized output is scanned. Then: it contains no token matching a requirement identifier (`FR-`/`NFR-` followed by digits), no ticket identifier, no internal source path, and no internal dataset/collection prefix. Given: any command's help payload (including plan). When: every subcommand description, schema description, example, and note is inspected. Then: none contains a requirement identifier or authoring rationale; each reads as standalone directive guidance. Given: a schema dictionary key equal to a public result type name. Then: it is permitted (not treated as a leak).</criteria>
  </acceptance>
</req>

## Safety

### FR-ARCH-0015 Dangerous Commands Require --force

<req id="FR-ARCH-0015" type="FR" level="System">
  <title>Dangerous commands require --force flag</title>
  <statement>Commands that perform destructive or irreversible actions SHALL require the --force flag. Without --force, the command SHALL refuse to execute and return an error explaining what the command does and that --force is required. Dangerous commands: uninstall.</statement>
  <rationale>Prevents accidental destructive actions by AI agents and humans.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rosettify uninstall without --force. Then: error explaining the action and requiring --force. Given: rosettify uninstall --force. Then: proceeds with uninstall.</criteria>
  </acceptance>
</req>

## Common Functionality

### FR-ARCH-0013 Shared Common Module

<req id="FR-ARCH-0013" type="FR" level="System">
  <title>Common functionality lives in a shared module</title>
  <statement>Cross-cutting concerns (input validation, envelope wrapping, help enrichment, error handling) SHALL be implemented as shared common functionality used by all commands. Commands SHALL NOT reimplement these concerns. See SHARED.md for detailed requirements.</statement>
  <rationale>DRY — common concerns implemented once.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the source tree. When: inspected. Then: a shared/common module exists. No command module contains its own input validation, envelope wrapping, or help enrichment logic.</criteria>
  </acceptance>
</req>
