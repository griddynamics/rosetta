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
  <statement>The help run delegate called with a subcommand (e.g., {subcommand: "plan"}) SHALL return full details for that command. The returned shape SHALL be:

```
{
  name: <string>,
  brief: <string>,
  description: <string>,
  schemas: { <key>: <JSONSchema> },
  subcommands?: [ { name, brief } ],
  notes: [ <string> ]
}
```

`schemas` SHALL be a flat dictionary mapping a key name to a JSON Schema object. Every non-primitive shape exposed in `schemas` — at any depth, including each array's `items` shape and every nested object property shape — SHALL be backed by a named, exported type declaration in source and SHALL be present as its own entry in the dictionary, referenced by name from the shapes that contain it. Anonymous inline shapes SHALL NOT be exposed at any depth. Each dictionary key SHALL equal the exact name of its backing type (e.g. `PlanNextResult`), so the key both names the shape and identifies where it is defined in code.

Type declarations SHALL follow SRP and DRY: a shape that is logically identical AND identical in purpose/use SHALL be defined exactly once and reused by every subcommand that returns or accepts it; the `schemas` dictionary SHALL therefore contain exactly one entry per distinct type and no two entries with an identical shape-and-purpose. Shapes that are structurally similar but serve distinct purposes SHALL keep distinct, meaningful type names. Where a shared type name could confuse a reader, a clarifying note SHALL be added or a clearer name chosen.

Each registered subcommand SHALL declare its input and output as named types alongside its handler; the help delegate SHALL compose `schemas` by aggregating these declarations plus any shared reusable types, keyed by type name. The help delegate SHALL NOT hand-author or duplicate schemas.

`notes` SHALL be a string array of behavioral notes contributed by the command; commands declare their notes alongside their help content.

If the subcommand does not match a registered command, the help delegate SHALL treat it as if no subcommand was provided (return top-level help per FR-HELP-0001). The help delegate SHALL never return include_help=true.</statement>
  <rationale>A flat schema dictionary lets a single help response surface multiple model schemas (one per subcommand, plus shared shapes) without imposing an input/output partition that does not match how callers think about subcommands. Composing schemas from per-subcommand declarations prevents drift between code and help. Keying by the exact exported type name makes each schema self-identifying and locatable in code; the SRP+DRY mandate keeps one definition per distinct shape so identical-purpose shapes are never duplicated under divergent keys. Naming applies recursively so a caller can resolve every field of every returned shape — array elements and nested objects included — without guessing at anonymous shapes.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: help with {subcommand: "plan"}. Then: returns {ok: true, result: {name, brief, description, schemas: {<TypeName>: <JSONSchema>, ...}, subcommands: [...], notes: [...]}} where every key equals the name of a named exported type. Given: the source. When: inspected. Then: every exposed schema is backed by a named exported type and no anonymous shape is exposed. Given: the serialized schemas dictionary is walked to any depth. Then: every array declares an `items` shape that references a named type entry, every nested object property references a named type entry, and no object or array-items shape lacks a named-type reference. Given: two subcommands that return a shape identical in structure and purpose. Then: the schemas dictionary contains a single shared entry for that type, reused by both, with no duplicate-purpose entries. Given: help with {subcommand: "nonexistent"}. Then: returns top-level help (same as FR-HELP-0001), ok: true, include_help: false.</criteria>
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
