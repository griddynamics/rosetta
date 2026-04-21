# NFR — Non-Functional Requirements

## Stability

### NFR-STAB-0001 Stable Dependencies Only

<req id="NFR-STAB-0001" type="NFR" level="System">
  <title>All dependencies must be stable releases</title>
  <statement>All runtime and dev dependencies SHALL be stable releases (no alpha, beta, RC, preview, or v0.x). Minimum dependency versions: TypeScript ^6.0.0, commander ^14.0.3, @modelcontextprotocol/sdk ^1.29.0, pino ^10.3.1, vitest ^4.1.2. Caret ranges (^) allow automatic minor and patch updates. package-lock.json SHALL be committed to SCM.</statement>
  <rationale>User requirement: "I don't want PREVIEW version! only latest stable."</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: package.json. When: all deps resolved. Then: no pre-release versions installed. npm audit reports no known vulnerabilities in direct dependencies.</criteria>
  </acceptance>
</req>

### NFR-STAB-0002 Minimal Dependency Footprint

<req id="NFR-STAB-0002" type="NFR" level="System">
  <title>Minimal runtime dependencies</title>
  <statement>Runtime dependencies SHALL be limited to: commander (CLI), @modelcontextprotocol/sdk (MCP), pino (logging). No additional runtime dependencies without explicit justification and approval.</statement>
  <rationale>Fewer dependencies = fewer attack vectors, fewer breakages.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: package.json dependencies. When: inspected. Then: only commander, @modelcontextprotocol/sdk, and pino listed as runtime deps.</criteria>
  </acceptance>
</req>

## Reliability

### NFR-REL-0001 Structured Error Handling

<req id="NFR-REL-0001" type="NFR" level="System">
  <title>No unhandled exceptions; all errors are structured</title>
  <statement>The system SHALL never crash with an unhandled exception. Run delegates SHALL return errors via the common output envelope (FR-ARCH-0011), never throw. Frontends SHALL catch any unexpected exceptions and write error JSON to stderr (CLI) or return MCP error responses (MCP). The process SHALL exit with code 1 on error, code 0 on success. No stack traces on stdout ever.</statement>
  <rationale>AI agents cannot recover from stack traces. Structured errors enable retry logic. stdout must remain clean per FR-ARCH-0008.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any invalid input, missing file, or runtime error. When: command executed. Then: JSON error output, exit 1, no stack trace on stdout.</criteria>
  </acceptance>
</req>

### NFR-REL-0002 Idempotent File Operations

<req id="NFR-REL-0002" type="NFR" level="System">
  <title>File operations are safe to retry</title>
  <statement>Plan file operations (create, upsert) SHALL be idempotent or safely repeatable. Creating an already-existing plan SHALL overwrite. Upsert SHALL merge without corruption.</statement>
  <rationale>AI agents may retry on perceived failures.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Should</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: create called twice with same path. Then: second call succeeds, file reflects latest data. Given: upsert called twice with same patch. Then: result is identical both times.</criteria>
  </acceptance>
</req>

## Security

### NFR-SEC-0001 Local-Only Execution

<req id="NFR-SEC-0001" type="NFR" level="System">
  <title>No network calls</title>
  <statement>rosettify SHALL NOT make any network calls during normal operation. All data stays local. This package works with IP and must never transmit data externally.</statement>
  <rationale>User request: "This package must only be used locally as it will work with IP."</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any rosettify command. When: network traffic is monitored. Then: zero outbound connections.</criteria>
  </acceptance>
</req>

### NFR-SEC-0002 Apache 2.0 License

<req id="NFR-SEC-0002" type="NFR" level="System">
  <title>Apache 2.0 license, all deps compatible</title>
  <statement>rosettify SHALL be licensed under Apache 2.0. All runtime dependencies SHALL have Apache 2.0-compatible licenses (MIT, BSD, ISC, Apache 2.0). No GPL, AGPL, or SSPL dependencies.</statement>
  <rationale>User requirement. commander=MIT, @modelcontextprotocol/sdk=MIT, pino=MIT — all compatible.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: all runtime deps. When: licenses checked. Then: all are MIT, BSD, ISC, or Apache 2.0. No copyleft licenses.</criteria>
  </acceptance>
</req>

### NFR-SEC-0003 Dependency Security

<req id="NFR-SEC-0003" type="NFR" level="System">
  <title>No known vulnerabilities in dependencies</title>
  <statement>All dependencies SHALL pass npm audit with zero high or critical vulnerabilities. Dependency tree SHALL be reviewed for supply chain risks.</statement>
  <rationale>Security requirement extending to packages and licenses.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: npm audit. When: run. Then: zero high/critical vulnerabilities. Given: dependency tree. When: inspected. Then: no unnecessary transitive dependencies.</criteria>
  </acceptance>
</req>

## Portability

### NFR-PORT-0001 Cross-Platform

<req id="NFR-PORT-0001" type="NFR" level="System">
  <title>Works on macOS, Linux, and Windows</title>
  <statement>rosettify SHALL work on macOS, Linux, and Windows. No platform-specific code, no shell-specific commands, no hardcoded path separators. Use Node.js path module for all path operations. Line endings SHALL be handled transparently. File operations SHALL use cross-platform Node.js APIs only.</statement>
  <rationale>rosettify runs wherever Node.js runs. AI coding agents operate on all three platforms.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rosettify on macOS, Linux, and Windows. When: any command executed. Then: same behavior on all platforms. Given: file paths with forward and backward slashes. Then: handled correctly via path module.</criteria>
  </acceptance>
</req>

## Performance

### NFR-PERF-0001 Fast Startup

<req id="NFR-PERF-0001" type="NFR" level="System">
  <title>Sub-second CLI startup</title>
  <statement>rosettify CLI commands SHALL complete startup (import, parse args, dispatch) in under 500ms on a standard development machine. The system SHALL use parallel execution where possible (e.g., concurrent validation checks, parallel I/O) to minimize latency.</statement>
  <rationale>AI agents invoke tools frequently. Slow startup wastes tokens and time.</rationale>
  <source>Inferred</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Should</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rosettify help. When: timed. Then: completes in under 500ms.</criteria>
  </acceptance>
</req>

## Integration

### NFR-INT-0001 Pre-Commit Integration

<req id="NFR-INT-0001" type="NFR" level="System">
  <title>Integrated with pre_commit.py</title>
  <statement>scripts/pre_commit.py SHALL be extended to include rosettify checks: TypeScript compilation (tsc --noEmit) and test execution (vitest run). Failures SHALL block the commit.</statement>
  <rationale>User request: "we also must integrate with all pre_commits/type_validations/etc."</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rosettify source with a type error. When: pre_commit.py runs. Then: exits non-zero, commit blocked.</criteria>
  </acceptance>
</req>

### NFR-INT-0002 Unit Test Suite

<req id="NFR-INT-0002" type="NFR" level="System">
  <title>Vitest unit test suite</title>
  <statement>All requirements SHALL have corresponding vitest unit tests. Tests SHALL use vitest 4.1.2 with environment=node, ESM, TypeScript. Tests SHALL cover all run delegates (plan subcommands, help), common output envelope, CLI argument parsing, MCP tool registration, help enrichment, and all error codes from FR-PLAN-0021.</statement>
  <rationale>Port of plan_manager.test.js coverage patterns to vitest + TypeScript.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: vitest run. When: executed in rosettify/. Then: all tests pass, coverage includes all run delegates and error paths.</criteria>
  </acceptance>
</req>

### NFR-INT-0003 End-to-End MCP Test Harness

<req id="NFR-INT-0003" type="NFR" level="System">
  <title>E2E test harness that exercises rosettify as a real MCP server over stdio</title>
  <statement>rosettify SHALL include an end-to-end test harness (similar to ims-mcp-server verify_mcp.py) that spawns rosettify in MCP mode as a child process (stdio transport), connects as an MCP client, and exercises all tools end-to-end. The harness SHALL: (1) start rosettify --mcp as a subprocess; (2) send MCP ListTools and verify all expected tools are registered; (3) send MCP CallTool for each command with valid and invalid inputs; (4) verify responses match the common output envelope (FR-ARCH-0011); (5) verify help enrichment works over the wire (include_help=true triggers help in response); (6) verify error scenarios return structured errors, not crashes. No class-level invocations — the harness tests the real stdio transport path.</statement>
  <rationale>Unit tests validate run delegates in isolation. This harness validates the full stack: CLI entry point → MCP server → stdio transport → tool dispatch → run delegate → help enrichment → MCP response. Mirrors verify_mcp.py pattern from ims-mcp-server.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: E2E harness executed. When: rosettify --mcp spawned as subprocess. Then: MCP client connects over stdio, ListTools returns all registered tools, CallTool for each command returns valid envelope, error scenarios return structured errors, harness exits 0 on all pass.</criteria>
  </acceptance>
</req>

### NFR-INT-0004 End-to-End CLI Test Harness

<req id="NFR-INT-0004" type="NFR" level="System">
  <title>E2E test harness that exercises rosettify as a real CLI process</title>
  <statement>rosettify SHALL include an end-to-end test harness that spawns rosettify as a CLI subprocess and exercises all commands end-to-end. The harness SHALL: (1) spawn rosettify with command arguments; (2) verify stdout contains valid JSON matching the common output envelope; (3) verify exit codes (0 for success, 1 for errors); (4) verify stderr for error diagnostics; (5) verify help, --help, unknown commands, and plan subcommands. No module-level imports — the harness tests the real CLI binary path.</statement>
  <rationale>Validates the full CLI stack: binary entry point → argument parsing → run delegate → help enrichment → stdout output.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: E2E harness executed. When: rosettify spawned as subprocess with various commands. Then: stdout is valid JSON envelope, exit codes are correct, help enrichment works, error scenarios produce structured output, harness exits 0 on all pass.</criteria>
  </acceptance>
</req>
