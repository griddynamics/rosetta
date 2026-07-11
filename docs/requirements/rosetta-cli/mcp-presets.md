# MCP Presets: Rosetta CLI

<req id="FR-0004" type="FR" level="System" ticketId="" classification="technical">
  <title>Stdio MCP preset</title>
  <statement>The Rosetta CLI shall provide a built-in `stdio` MCP preset containing default values for the command (`uvx`), package (`ims-mcp@latest`), Rosetta Server URL (`RAGFLOW_BASE_URL`), dataset name (`RAGFLOW_DATASET_DEFAULT`), and API key (`RAGFLOW_API_KEY`).</statement>
  <rationale>The stdio transport is the primary MCP connection method, requiring a complete set of defaults for zero-configuration use.</rationale>
  <source>INSTALLATION.md current defaults</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-16</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given `--preset stdio` or no `--preset` flag When the command runs Then MCP config uses stdio transport with the preset's default values for command, package, server URL, dataset, and API key.</criteria>
  </acceptance>
</req>

<req id="FR-0005" type="FR" level="System" ticketId="" classification="technical">
  <title>Default MCP preset</title>
  <statement>When no `--preset` flag is specified, the Rosetta CLI shall use the `stdio` MCP preset.</statement>
  <rationale>Most users connect via stdio transport; defaulting to it reduces onboarding friction.</rationale>
  <source>Usability</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-16</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given no `--preset` flag When the command runs Then it behaves identically to `--preset stdio`.</criteria>
  </acceptance>
  <depends>FR-0004</depends>
</req>

<req id="FR-0006" type="FR" level="System" ticketId="" classification="technical">
  <title>HTTP MCP preset</title>
  <statement>The Rosetta CLI shall provide a built-in `http` MCP preset containing default values for the MCP server URL, OAuth provider URL, client ID, and redirect URI.</statement>
  <rationale>Supports enterprise SSO authentication via OAuth 2.1 with MCP Auth flow over HTTP transport.</rationale>
  <source>new-ims-mcp-p2.md (OAuth mode)</source>
  <priority>Should</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-16</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given `--preset http` When the command runs Then MCP config uses HTTP transport with the preset's default values for MCP URL and OAuth parameters.</criteria>
  </acceptance>
</req>

<req id="FR-0007" type="FR" level="System" ticketId="" classification="technical">
  <title>Preset parameter overrides</title>
  <statement>The Rosetta CLI shall accept command-line flags that override specific values within the selected MCP preset.</statement>
  <rationale>Flexibility for custom deployments without requiring a separate preset.</rationale>
  <source>User request</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-16</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>
      Given `--preset stdio --server-url https://custom --api-key ragflow-xxx` When the command runs Then MCP config uses the custom server URL and API key but retains other stdio preset defaults.
      Given `--preset http --mcp-url https://custom-mcp` When the command runs Then MCP config uses the custom MCP URL but retains other http preset defaults.
      Given `--preset stdio --mcp-url https://something` When the command runs Then it exits with a non-zero code and displays an error that `--mcp-url` is not valid for the stdio preset.
    </criteria>
  </acceptance>
  <depends>FR-0004, FR-0006</depends>
</req>
