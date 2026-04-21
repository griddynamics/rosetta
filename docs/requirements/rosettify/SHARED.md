# FR-SHRD — Shared Common Functionality

Cross-cutting concerns used by all commands. No command reimplements these.

## FR-SHRD-0001 Input Schema Validation

<req id="FR-SHRD-0001" type="FR" level="System">
  <title>Validate input against tool schema before dispatch</title>
  <statement>Before any run delegate is called, the common layer SHALL validate the input against the tool's registered input schema. Missing required fields, wrong types, and unknown fields SHALL be rejected with structured errors and include_help=true. The run delegate is never called on invalid input.</statement>
  <rationale>Prevents invalid input from reaching run delegates.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: CallTool "plan" with missing required field. Then: envelope with ok=false, error describing the missing field, include_help=true. Run delegate not called.</criteria>
  </acceptance>
</req>

## FR-SHRD-0002 Envelope Wrapping

<req id="FR-SHRD-0002" type="FR" level="System">
  <title>Common dispatch: validate, call delegate, enrich</title>
  <statement>The common dispatch function SHALL: (1) validate input via FR-SHRD-0001, (2) call the run delegate which returns the common envelope (FR-ARCH-0011), (3) if include_help=true, enrich via FR-SHRD-0003, (4) catch unexpected exceptions and return {ok: false, result: null, error: "internal_error", include_help: false}. The delegate owns the envelope — the common layer orchestrates the pipeline around it.</statement>
  <rationale>Centralizes the validate-call-enrich pipeline.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: run delegate returns {plan_file, name, status}. When: wrapper processes it. Then: {ok: true, result: {plan_file, name, status}, error: null, include_help: false}. Given: run delegate throws unexpectedly. Then: {ok: false, result: null, error: "internal_error", include_help: false}.</criteria>
  </acceptance>
</req>

## FR-SHRD-0003 Help Enrichment

<req id="FR-SHRD-0003" type="FR" level="System">
  <title>Enrich response with help when include_help is true</title>
  <statement>After envelope wrapping, the common layer SHALL check include_help. When true, it SHALL call the help run delegate for the current command and merge the help output into the envelope as a "help" field (FR-ARCH-0012).</statement>
  <rationale>Contextual help alongside errors enables AI self-correction.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: envelope with include_help=true for command "plan". Then: help field added with plan help content. Given: include_help=false. Then: no help field.</criteria>
  </acceptance>
</req>

## FR-SHRD-0005 Logging

<req id="FR-SHRD-0005" type="FR" level="System">
  <title>Common logging to file only</title>
  <statement>The common layer SHALL provide a logging facility using pino 10.3.1 that writes to a log file only (FR-ARCH-0010). All commands and shared code SHALL use this facility. Log level SHALL be configurable. No logging to stdout or stderr.</statement>
  <rationale>Centralized logging keeps stdout/stderr clean per FR-ARCH-0008/0010.</rationale>
  <source>Inferred</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any command with logging enabled. When: executed. Then: log entries in the log file only. stdout and stderr contain no log lines.</criteria>
  </acceptance>
</req>

## FR-SHRD-0006 Optimistic Concurrency for File Writes

<req id="FR-SHRD-0006" type="FR" level="System">
  <title>Common optimistic concurrency via updated_at</title>
  <statement>The common layer SHALL provide a read-modify-write function that checks updated_at before writing. If updated_at changed since read, retry (re-read, re-apply, re-write). After max retries (default 3), return {error: "concurrent_write_conflict"}. Commands that write JSON files SHALL use this function.</statement>
  <rationale>Parallel subagents write to the same files without coordination.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: two concurrent writes to the same file. When: both complete. Then: file is valid, no data loss. Given: 4 consecutive mismatches. Then: {error: "concurrent_write_conflict"}.</criteria>
  </acceptance>
</req>

## FR-SHRD-0004 Error Handling

<req id="FR-SHRD-0004" type="FR" level="System">
  <title>Catch all exceptions and return structured errors</title>
  <statement>The common layer SHALL catch any unhandled exception from a run delegate and return {ok: false, error: "internal_error: &lt;message&gt;", include_help: false}. No stack traces in the envelope. Frontends write diagnostics to stderr (CLI) or log file.</statement>
  <rationale>Prevents crashes from reaching the consumer.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: run delegate throws an exception. Then: envelope returned with ok=false, error="internal_error: ...", no stack trace in result.</criteria>
  </acceptance>
</req>
