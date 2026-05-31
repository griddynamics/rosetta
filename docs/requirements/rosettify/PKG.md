# FR-PKG — Packaging

Packaging and distribution requirements for rosettify.

## FR-PKG-0001 npm Package

<req id="FR-PKG-0001" type="FR" level="System">
  <title>Published as npm package</title>
  <statement>rosettify SHALL be published to npmjs.org as both unscoped "rosettify" and scoped "@griddynamics/rosettify". Both packages contain the same code. Package type: "module" (ESM). The unscoped name is confirmed available on npmjs.org.</statement>
  <rationale>User request: "npm package, published to npmjs.org (grid dynamics org)"</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: npm publish. When: completed. Then: package available on npmjs.org under @griddynamics scope with correct metadata.</criteria>
  </acceptance>
</req>

## FR-PKG-0002 bin Entry Point

<req id="FR-PKG-0002" type="FR" level="System">
  <title>Single binary entry point</title>
  <statement>The package SHALL expose a single bin entry "rosettify" that serves as the CLI entry point. The primary usage mode is via npx (`npx rosettify <command>`). Global install is supported but not required.</statement>
  <rationale>Standard npm CLI distribution.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: npx @griddynamics/rosettify help. When: executed. Then: outputs help JSON, exit 0.</criteria>
  </acceptance>
</req>

## FR-PKG-0003 TypeScript Build

<req id="FR-PKG-0003" type="FR" level="System">
  <title>TypeScript 6.0 strict ESM build</title>
  <statement>Source code SHALL be TypeScript 6.0 with strict mode enabled. Build output SHALL be ESM. tsconfig SHALL target latest stable Node.js (ES2024+, NodeNext module resolution).</statement>
  <rationale>Latest stable TypeScript, modern standards.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: tsc --noEmit. When: run on source. Then: zero errors. Given: built output. Then: all files are ESM (.js with import/export).</criteria>
  </acceptance>
</req>

## FR-PKG-0004 Repository Location

<req id="FR-PKG-0004" type="FR" level="System">
  <title>Lives at repo root as rosettify/</title>
  <statement>The rosettify package SHALL reside at the repository root as rosettify/ (sibling to ims-mcp-server/ and rosetta-cli/). All source, tests, config, and build artifacts SHALL be within this folder.</statement>
  <rationale>User request: "it lives in the root (like ims-mcp-server, rosetta-cli, and now rosettify), note all artifacts in this subfolder"</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the repo root. When: inspected. Then: rosettify/ exists as a top-level directory containing package.json, tsconfig.json, src/, and tests.</criteria>
  </acceptance>
</req>

## FR-PKG-0005 Semantic Versioning

<req id="FR-PKG-0005" type="FR" level="System">
  <title>Follow Semantic Versioning 2.0.0 (MAJOR.MINOR.PATCH)</title>
  <statement>The rosettify package version SHALL follow Semantic Versioning 2.0.0 (https://semver.org). The version string in `rosettify/package.json` SHALL match the regex `^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$` and increment according to:

- **MAJOR**: incremented for backwards-incompatible changes to the CLI command surface, MCP tool input/output schemas, plan-file JSON schema (FR-PLAN-0017), envelope shape (FR-ARCH-0011), or any documented run-delegate contract. Examples: removing a subcommand, changing a CLI positional-argument order, renaming a field in the plan JSON schema, removing an error code, breaking the help response shape.
- **MINOR**: incremented for backwards-compatible additions. Examples: a new subcommand, a new optional input field, a new error code, a new template registered in the registry, a new help-content key.
- **PATCH**: incremented for backwards-compatible bug fixes that do not alter any documented contract. Examples: fixing a concurrent-write race, correcting an error message, improving log content, fixing a non-contract regression.

Pre-1.0.0 versions are permitted during early development; once the package reaches 1.0.0 the rules above apply strictly. Pre-release identifiers (`-alpha.N`, `-beta.N`, `-rc.N`) and build metadata (`+sha.abc1234`) are permitted per the semver spec.

Every release that changes published behavior SHALL be accompanied by a CHANGELOG entry (or equivalent release-notes mechanism) stating which contract surface changed and at which level.</statement>
  <rationale>AI agents and human consumers must be able to predict compatibility from the version string alone. Without an explicit semver contract, the previous FR-PLAN-0024 contract loophole (rewriting the rename-vs-mutex semantics without a major bump) could ship as a silent patch and break callers depending on the older surface. A documented semver rule pins the meaning of every digit and forces release notes when behavior changes.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the version field in rosettify/package.json. When: inspected. Then: it matches the semver regex above. Given: a release that removes or breaks a documented contract (CLI surface, MCP tool schema, plan schema, envelope, error code). Then: the new version's MAJOR digit is greater than the previous release's MAJOR. Given: a release that adds a new subcommand, optional field, error code, or template without breaking any existing contract. Then: MAJOR is unchanged and MINOR is incremented. Given: a release that fixes a bug without altering any documented contract. Then: MAJOR and MINOR are unchanged and PATCH is incremented. Given: any release that changes published behavior. Then: a CHANGELOG or release-notes entry exists for it.</criteria>
  </acceptance>
</req>

## FR-PKG-0006 Single-Source Version Reporting

<req id="FR-PKG-0006" type="FR" level="System">
  <title>Reported version is read from package.json</title>
  <statement>The version reported by every frontend SHALL be read from `rosettify/package.json` at runtime; no version string SHALL be hardcoded or duplicated in source. This applies to the CLI version flag/command, the MCP server's advertised `version`, and the `version` field of the help payload. All three SHALL report the exact value of `package.json`'s `version` field, so bumping `package.json` (FR-PKG-0005) is the single action that updates every reported version.</statement>
  <rationale>A version hardcoded separately from package.json drifts — the package can claim one version while the CLI, MCP server, and help payload still report a stale literal (observed: package.json at 2.3.0 while all three reported 0.1.0). Reading from package.json makes that field the single source of truth and removes a class of silent inconsistency that misleads AI and human consumers about which surface they are on.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: package.json version V. When: the CLI version flag/command runs. Then: it reports V. Given: the MCP server initializes. Then: its advertised version equals V. Given: rosettify help (top-level or for a command). When: the help payload is returned. Then: its version field equals V. Given: the source is inspected. Then: no frontend hardcodes a version literal; each derives it from package.json.</criteria>
  </acceptance>
</req>
