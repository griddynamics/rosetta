# Tech Stack

- **Language**: TypeScript 6, strict mode, ES2024 target
- **Module system**: ESM (NodeNext), all relative imports use `.js` extension
- **Runtime**: Node.js >=22
- **CLI**: commander 14
- **MCP**: @modelcontextprotocol/sdk 1.29, low-level Server + StdioServerTransport
- **Logging**: pino 10, file-only (never stdout/stderr), sync mode
- **Testing**: vitest 4
- **Build**: tsc (tsconfig.build.json excludes tests)
