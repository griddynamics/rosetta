# FR-MCP — MCP Frontend

MCP stdio frontend requirements for rosettify.

## FR-MCP-0001 Stdio Transport

<req id="FR-MCP-0001" type="FR" level="System">
  <title>MCP server via stdio using official SDK</title>
  <statement>When started with --mcp, rosettify SHALL run as an MCP server using StdioServerTransport from @modelcontextprotocol/sdk 1.29.0. Communication occurs over stdin/stdout only. No HTTP, no SSE. The MCP frontend exclusively owns stdin/stdout — no other code writes to stdout or reads from stdin (FR-ARCH-0008). Errors go to stderr.</statement>
  <rationale>Official SDK provides stable stdio transport for local MCP.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rosettify --mcp started. When: an MCP ListTools request arrives on stdin. Then: a valid MCP response is written to stdout.</criteria>
  </acceptance>
</req>

## FR-MCP-0002 Tool Registration from Registry

<req id="FR-MCP-0002" type="FR" level="System">
  <title>MCP tools generated from tool registry</title>
  <statement>The MCP server SHALL use the low-level Server class (setRequestHandler) to register tools. Each command in the registry with mcp=true SHALL be exposed as one MCP tool. Tool name, description, and input schema are taken directly from registry metadata.</statement>
  <rationale>Low-level control over tool registration from the registry.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: registry has commands plan (mcp=true), help (mcp=true), some_tool (mcp=false). When: MCP ListTools called. Then: plan and help listed, some_tool not listed. Each listed tool has name, description, inputSchema from registry.</criteria>
  </acceptance>
</req>

## FR-MCP-0003 Tool Invocation via Common Envelope

<req id="FR-MCP-0003" type="FR" level="System">
  <title>MCP CallTool dispatches through run delegate and enrichment</title>
  <statement>When an MCP CallTool request is received, the server SHALL look up the tool by name in the registry and invoke the run delegate. The run delegate returns the common output envelope (FR-ARCH-0011). The orchestration layer processes help enrichment if include_help=true (FR-ARCH-0012). The MCP frontend then formats the final envelope as MCP tool result content. Unknown tool names SHALL return an MCP protocol error (MethodNotFound) since the tool was never registered.</statement>
  <rationale>MCP frontend adapts the common envelope to MCP protocol.</rationale>
  <source>Inferred</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: MCP CallTool "plan" with valid params. Then: run delegate executes, enrichment runs, MCP returns the final envelope as content. Given: run delegate returns include_help=true. Then: help field present in MCP result. Given: CallTool for unregistered tool name. Then: MCP protocol error (tool was never listed).</criteria>
  </acceptance>
</req>

## FR-MCP-0004 Subcommand as Tool Parameter

<req id="FR-MCP-0004" type="FR" level="System">
  <title>Subcommands are parameters of the command tool</title>
  <statement>If a command uses subcommands, the MCP tool SHALL expose the subcommand as a parameter in its input schema listing available subcommand values. Commands without subcommands expose only their own parameters. Each command = one MCP tool regardless.</statement>
  <rationale>Subcommand as parameter keeps one MCP tool per command.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: plan command. When: MCP ListTools called. Then: one tool "plan" with input schema showing subcommand enum. When: MCP CallTool "plan" {subcommand: "next", plan_file: "..."}. Then: plan run delegate called with that input.</criteria>
  </acceptance>
</req>
