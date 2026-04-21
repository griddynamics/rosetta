# FR-HELP — Help Command

Help is a command with a run delegate, like any other. It is the single entry point for all help behavior in rosettify. The --help flag is syntactic sugar converted to a help invocation. Unrecognized commands/subcommands/params route through help via FR-ARCH-0012 (help enrichment).

## FR-HELP-0001 Help Run Delegate — Top Level

<req id="FR-HELP-0001" type="FR" level="System">
  <title>Help with no subcommand lists commands with briefs</title>
  <statement>The help run delegate called with no subcommand SHALL return: tool name, version, available commands (each with name and brief only — no full schemas), and a guidance message to use "help <command>" for detailed information on a specific command.</statement>
  <rationale>Self-describing command listing enables AI agents to discover available functionality.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: help called with no subcommand. Then: returns {ok: true, result: {tool, version, commands: [{name, brief}], guidance: "use 'help <command>' for details"}}. No full input_schema in the listing.</criteria>
  </acceptance>
</req>

## FR-HELP-0002 Help Run Delegate — Command Detail

<req id="FR-HELP-0002" type="FR" level="System">
  <title>Help with subcommand returns full command details</title>
  <statement>The help run delegate called with a subcommand (e.g., {subcommand: "plan"}) SHALL return full details for that command: brief, description, input schema, output schema, and subcommands (if any) with their briefs. If the subcommand does not match a registered command, the help delegate SHALL treat it as if no subcommand was provided (return top-level help per FR-HELP-0001). The help delegate SHALL never return include_help=true.</statement>
  <rationale>AI agents need full schemas to construct valid invocations.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: help with {subcommand: "plan"}. Then: returns {ok: true, result: {name, brief, description, input_schema, output_schema, subcommands: [...]}}. Given: help with {subcommand: "nonexistent"}. Then: returns top-level help (same as FR-HELP-0001), ok: true, include_help: false.</criteria>
  </acceptance>
</req>

## FR-HELP-0003 --help Flag Conversion

<req id="FR-HELP-0003" type="FR" level="System">
  <title>--help converted to help command invocation</title>
  <statement>The CLI frontend SHALL convert --help into a help command invocation. "rosettify --help" becomes help with no subcommand. "rosettify plan --help" becomes help with {subcommand: "plan"}. This is syntactic sugar — the help run delegate handles both. The MCP frontend does not need this conversion since the caller invokes the help tool directly.</statement>
  <rationale>CLI syntactic sugar for standard --help convention.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rosettify --help via CLI. Then: same result as rosettify help. Given: rosettify plan --help via CLI. Then: same result as rosettify help plan. Given: MCP CallTool "help" {subcommand: "plan"}. Then: same result as CLI "rosettify help plan".</criteria>
  </acceptance>
</req>
