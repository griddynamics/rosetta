# Functional Requirements: Rosetta CLI

## Workspace and Configuration File

<req id="FR-0017" type="FR" level="System" ticketId="" classification="technical">
  <title>Workspace root detection</title>
  <statement>The Rosetta CLI shall treat the current working directory as the workspace root for all configure operations.</statement>
  <rationale>Aligns with standard CLI conventions where the current directory is the project being configured.</rationale>
  <source>User request</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given the user runs `npx -y rosetta@latest configure claudecode` from `/home/user/my-project` When the command completes Then bootstrap files and `rosetta.json` are written relative to `/home/user/my-project`.</criteria>
  </acceptance>
</req>

<req id="FR-0018" type="FR" level="System" ticketId="" classification="technical">
  <title>Workspace configuration file</title>
  <statement>The Rosetta CLI shall create and maintain a `rosetta.json` file in the workspace root that stores workspace configuration state.</statement>
  <rationale>Enables version control of Rosetta configuration and persistence of user choices across runs.</rationale>
  <source>User request</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given the user runs `npx -y rosetta@latest configure claudecode,cursor` When the command completes Then `rosetta.json` exists in the workspace root and contains the configured targets and MCP preset.</criteria>
  </acceptance>
</req>

<req id="FR-0019" type="FR" level="System" ticketId="" classification="technical">
  <title>Configuration file content</title>
  <statement>The `rosetta.json` file shall store: configured IDE targets, selected MCP preset name, server URL, dataset name, and any non-secret parameter overrides.</statement>
  <rationale>Allows team members to share IDE configuration choices via version control.</rationale>
  <source>User request</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given `rosetta.json` is inspected Then it contains `targets`, `preset`, `serverUrl`, and `dataset` fields. Given any field inspection Then no API keys, passwords, or secrets are present.</criteria>
  </acceptance>
</req>

<req id="FR-0020" type="FR" level="System" ticketId="" classification="technical">
  <title>No secrets in configuration file</title>
  <statement>The `rosetta.json` file shall not contain API keys, passwords, OAuth secrets, or any other credential values.</statement>
  <rationale>The file is intended for version control; secrets in VCS are a security risk.</rationale>
  <source>Security</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given any MCP preset (stdio, http) When `rosetta.json` is generated Then the file contains zero secret values. Given stdio preset with API key override When `rosetta.json` is inspected Then it contains `"preset": "stdio"` but not the API key value itself.</criteria>
  </acceptance>
</req>

<req id="FR-0021" type="FR" level="System" ticketId="" classification="technical">
  <title>Configuration file re-use</title>
  <statement>When `rosetta.json` exists in the workspace root, the Rosetta CLI shall read it and apply stored values as defaults, which command-line flags may override.</statement>
  <rationale>Enables `npx -y rosetta@latest configure` without arguments to re-apply the previously saved configuration.</rationale>
  <source>Usability</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given `rosetta.json` contains `{"targets": ["claudecode", "cursor"], "preset": "stdio"}` When the user runs `npx -y rosetta@latest configure` without arguments Then it configures claudecode and cursor using the stdio MCP preset.</criteria>
  </acceptance>
</req>

<req id="FR-0022" type="FR" level="System" ticketId="" classification="technical">
  <title>Configuration file update on re-run</title>
  <statement>When the Rosetta CLI runs with different parameters than stored in `rosetta.json`, it shall update `rosetta.json` to reflect the new configuration.</statement>
  <rationale>The file shall always represent the last applied configuration.</rationale>
  <source>Consistency</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given `rosetta.json` contains `{"targets": ["claudecode"]}` When the user runs `npx -y rosetta@latest configure cursor` Then `rosetta.json` is updated to include `cursor` in the targets list.</criteria>
  </acceptance>
</req>

## CLI Invocation

<req id="FR-0001" type="FR" level="System" ticketId="" classification="technical">
  <title>Configure command invocation</title>
  <statement>The Rosetta CLI shall accept the command `npx -y rosetta@latest configure <targets>` where `<targets>` is a comma-separated list of IDE target names.</statement>
  <rationale>Single command to configure one or more IDEs reduces onboarding friction.</rationale>
  <source>User request</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given a user runs `npx -y rosetta@latest configure claudecode,cursor` When the command completes Then Rosetta is configured in both Claude Code and Cursor.</criteria>
  </acceptance>
</req>

<req id="FR-0002" type="FR" level="System" ticketId="" classification="technical">
  <title>Target name resolution</title>
  <statement>The Rosetta CLI shall resolve each target name to an IDE configuration handler using case-insensitive matching and documented aliases.</statement>
  <rationale>Users may type targets in varying cases or use shorthand names.</rationale>
  <source>Usability</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given target name `ClaudeCode` When resolved Then it matches the `claudecode` handler. Given target name `vscode` When resolved Then it matches the VS Code handler.</criteria>
  </acceptance>
  <notes>Aliases: `claudecode`/`claude-code`/`claude`, `cursor`, `vscode`/`vs-code`, `copilot-vscode`, `copilot-jetbrains`, `junie`, `antigravity`, `opencode`, `codex`, `windsurf`. Target `all` shall configure all listed IDE targets.</notes>
</req>

<req id="FR-0003" type="FR" level="System" ticketId="" classification="technical">
  <title>Invalid target error</title>
  <statement>When a user provides an unrecognized target name, the Rosetta CLI shall exit with a non-zero code and display the list of valid target names.</statement>
  <rationale>Clear error messages prevent user confusion.</rationale>
  <source>Usability</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given target name `emacs` When the command runs Then it exits with code 1 and prints valid target names.</criteria>
  </acceptance>
</req>


## MCP Configuration Generation

<req id="FR-0008" type="FR" level="System" ticketId="" classification="technical">
  <title>MCP server name</title>
  <statement>The Rosetta CLI shall register the MCP server entry with the name "Rosetta" in all IDE configurations.</statement>
  <rationale>Consistent branding across all IDEs.</rationale>
  <source>User decision</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given any target IDE When the command completes Then the MCP server entry is named "Rosetta".</criteria>
  </acceptance>
</req>

<req id="FR-0009" type="FR" level="System" ticketId="" classification="technical">
  <title>Existing config preservation</title>
  <statement>When an MCP config file already exists, the Rosetta CLI shall merge the Rosetta server entry without modifying other existing server entries.</statement>
  <rationale>Users may have other MCP servers configured that must not be disrupted.</rationale>
  <source>Safety</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given `~/.cursor/mcp.json` contains a "MyOtherMCP" entry When the command runs Then both "Rosetta" and "MyOtherMCP" entries exist in the file.</criteria>
  </acceptance>
  <notes>Not applicable to targets that use native CLI tools (e.g., claudecode, codex) as those tools handle merging.</notes>
</req>

<req id="FR-0010" type="FR" level="System" ticketId="" classification="technical">
  <title>IDE-specific configuration methods</title>
  <statement>The Rosetta CLI shall configure each target IDE using the MCP configuration method, file path, JSON schema, and command line template defined in that target's application profile.</statement>
  <rationale>Native CLI tools handle config format, merging, and validation correctly. JSON file writing is used only for IDEs without a native CLI.</rationale>
  <source>User decision, IDE documentation</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-16</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given any supported target When the configure command runs Then the MCP server entry is created using the method, file path, JSON schema, and command line template defined in the target's application profile (FR-0023).</criteria>
  </acceptance>
  <depends>FR-0023</depends>
</req>

## Bootstrap File Generation

<req id="FR-0011" type="FR" level="System" ticketId="" classification="technical">
  <title>Bootstrap content bundling</title>
  <statement>The Rosetta CLI npm package shall bundle bootstrap content from the single source of truth (`instructions/r1/bootstrap.md`) at build time without duplicating the file in the repository.</statement>
  <rationale>Avoids content drift between the canonical bootstrap file and the CLI package.</rationale>
  <source>User decision</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given the npm package build process When `instructions/r1/bootstrap.md` is updated Then the next package build includes the updated content. Given the repository When inspected Then bootstrap content exists in exactly one location (`instructions/r1/bootstrap.md`).</criteria>
  </acceptance>
  <notes>Build script shall copy or embed the file into the npm package distribution. Same pattern as `src/ims-mcp-server/build.sh` copies bootstrap into Python package resources.</notes>
</req>

<req id="FR-0012" type="FR" level="System" ticketId="" classification="technical">
  <title>Bootstrap file generation per IDE</title>
  <statement>For each target IDE, the Rosetta CLI shall write the bundled bootstrap content to the bootstrap file path defined in the target's application profile, applying the formatting rules from that profile.</statement>
  <rationale>Bootstrap ensures Rosetta MCP is invoked on every AI interaction.</rationale>
  <source>QUICKSTART.md Step 3</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-16</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given any supported target When the configure command runs Then bootstrap content is written to the path and with the formatting defined in the target's application profile (FR-0023).</criteria>
  </acceptance>
  <depends>FR-0023, FR-0011</depends>
</req>

<req id="FR-0013" type="FR" level="System" ticketId="" classification="technical">
  <title>Existing bootstrap preservation</title>
  <statement>When a bootstrap file already exists, the Rosetta CLI shall prepend or merge bootstrap content without removing existing user content.</statement>
  <rationale>Users may have custom rules in their bootstrap file.</rationale>
  <source>Safety</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given `.claude/claude.md` contains user rules When the command runs Then the file contains both Rosetta bootstrap content and the original user rules.</criteria>
  </acceptance>
</req>

## Operational Modes

<req id="FR-0014" type="FR" level="System" ticketId="" classification="technical">
  <title>Dry-run mode</title>
  <statement>When the user specifies `--dry-run`, the Rosetta CLI shall display all changes that would be made without writing any files or executing any CLI commands.</statement>
  <rationale>Allows users to preview changes before applying.</rationale>
  <source>Safety</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given `--dry-run` When the command runs Then no files are written, no CLI commands are executed, and all planned changes are displayed to stdout.</criteria>
  </acceptance>
</req>

<req id="FR-0015" type="FR" level="System" ticketId="" classification="technical">
  <title>Idempotent operation</title>
  <statement>The Rosetta CLI shall produce the same result when run multiple times with the same parameters.</statement>
  <rationale>Safe to re-run without side effects.</rationale>
  <source>Robustness</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given the command runs twice with identical parameters Then the MCP config and bootstrap files are identical after both runs.</criteria>
  </acceptance>
</req>

<req id="FR-0016" type="FR" level="System" ticketId="" classification="technical">
  <title>Global vs project scope</title>
  <statement>The Rosetta CLI shall accept a `--scope` flag with values `global` (default) or `project` to control whether MCP config is written to the user's home directory or the current project directory.</statement>
  <rationale>Some IDEs support both global and project-level MCP configuration.</rationale>
  <source>Cursor and VS Code support both scopes</source>
  <priority>Should</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given `--scope project` and target `cursor` When the command runs Then it writes to `.cursor/mcp.json` in the current directory instead of `~/.cursor/mcp.json`.</criteria>
  </acceptance>
</req>
