# Assumptions and Constraints

## Assumptions

1. **A-001**: Node.js >= 18 and npm are available on the user's machine.
2. **A-002**: The user has filesystem write access to IDE config directories.
3. **A-003**: IDE config file paths follow documented conventions and have not been relocated by the user.
4. **A-004**: The `rosetta-mcp` Python package and `uvx` are the MCP server execution method for all targets.
5. **A-005**: Bootstrap content is fetched from the Rosetta GitHub repository (latest release) or bundled within the npm package.
6. **A-006**: Each IDE has exactly one MCP config file format and one bootstrap file location.

## Constraints

1. **C-001**: The npm package shall not require Python as a runtime dependency. Python is only needed at IDE runtime to execute `uvx rosetta-mcp`.
2. **C-002**: The CLI shall not store credentials on disk beyond what is written to the IDE's MCP config file.
3. **C-003**: The CLI shall not modify files outside the documented IDE config locations without explicit user consent.
4. **C-004**: The default profile shall use the same public credentials currently documented in INSTALLATION.md.
