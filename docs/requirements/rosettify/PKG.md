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
