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
  <statement>Every run delegate SHALL return a common JSON envelope: {ok: boolean, result: object|null, error: string|null, include_help: boolean}. On success: ok=true, result contains command-specific data, error=null, include_help=false. On failure: ok=false, result=null, error contains the error code (with optional detail), include_help=true when the error is related to incorrect usage (bad subcommand, invalid params, unrecognized input). Only the delegate knows what to return — it owns the envelope. Frontends (CLI, MCP) adapt the envelope to their transport format.</statement>
  <rationale>Uniform contract between delegates and frontends.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any run delegate returning success. Then: {ok: true, result: {...}, error: null, include_help: false}. Given: run delegate returning usage error. Then: {ok: false, result: null, error: "...", include_help: true}. Given: run delegate returning runtime error (e.g., plan_not_found). Then: {ok: false, result: null, error: "plan_not_found", include_help: false}.</criteria>
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
  <title>AI-first output format</title>
  <statement>All tool outputs SHALL be JSON. Outputs SHALL include a brief explanation of what is returned (unless self-evident) and suggested next actions where applicable. This applies to all commands except install, uninstall, and upgrade which are human-friendly.</statement>
  <rationale>Primary consumers are AI coding agents that need structured, actionable responses.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any AI-first tool. When: invoked successfully. Then: output is valid JSON containing the result and, where applicable, a next_steps field. When: invoked with an error. Then: output is valid JSON with an error field.</criteria>
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
  <status>Draft</status>
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
