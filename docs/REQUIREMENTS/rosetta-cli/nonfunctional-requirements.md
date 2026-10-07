# Non-Functional Requirements: Rosetta CLI

<req id="NFR-0001" type="NFR" level="System" ticketId="" classification="technical">
  <title>Execution time</title>
  <statement>The Rosetta CLI configure command shall complete within 5 seconds for a single target on a machine with network access.</statement>
  <rationale>Fast execution ensures good developer experience.</rationale>
  <source>Usability</source>
  <priority>Should</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given a single target When measured on a machine with 100 Mbps network Then execution completes in under 5 seconds at the 95th percentile.</criteria>
  </acceptance>
</req>

<req id="NFR-0002" type="NFR" level="System" ticketId="" classification="technical">
  <title>Cross-platform compatibility</title>
  <statement>The Rosetta CLI shall run on macOS, Linux, and Windows with Node.js >= 18.</statement>
  <rationale>Developers use all three platforms.</rationale>
  <source>Platform coverage</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given each supported OS When the configure command runs Then it produces correct output with platform-appropriate file paths.</criteria>
  </acceptance>
</req>

<req id="NFR-0003" type="NFR" level="System" ticketId="" classification="technical">
  <title>Zero runtime dependencies beyond Node.js</title>
  <statement>The Rosetta CLI npm package shall have no runtime dependencies requiring compilation or native modules.</statement>
  <rationale>Ensures `npx` execution works without build tools.</rationale>
  <source>Portability</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given package.json When inspected Then dependencies list contains zero native or compiled packages.</criteria>
  </acceptance>
</req>

<req id="NFR-0004" type="NFR" level="System" ticketId="" classification="technical">
  <title>Error messages</title>
  <statement>The Rosetta CLI shall display actionable error messages that include the specific file path and the corrective action.</statement>
  <rationale>Reduces support burden by guiding users to fix issues themselves.</rationale>
  <source>Usability</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given a permission error writing to `~/.cursor/mcp.json` When the error is displayed Then it includes the file path and suggests using sudo or checking permissions.</criteria>
  </acceptance>
</req>

<req id="NFR-0005" type="NFR" level="System" ticketId="" classification="technical">
  <title>Package size</title>
  <statement>The Rosetta CLI npm package shall not exceed 500 KB unpacked size.</statement>
  <rationale>Keeps `npx` download fast.</rationale>
  <source>Performance</source>
  <priority>Should</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-15</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given the published package When inspected via `npm pack --dry-run` Then unpacked size is under 500 KB.</criteria>
  </acceptance>
</req>
