# TECHSTACK

## Runtime
- **Node.js** v26 — ESM modules (`"type": "module"`)
- **TypeScript** 5.6 — strict mode, NodeNext module resolution

## Key stack decisions

| Decision | Choice | Reason |
|---|---|---|
| LLM router | Vercel AI SDK (`ai@6`) | 25k+ GitHub stars, vendor-agnostic, supports Anthropic/OpenAI/Google/etc. behind one interface |
| Anthropic model | `claude-haiku-4-5` | Fast/cheap for QNA answering; configurable in llm-client.ts |
| PTY | `node-pty` | De-facto standard for Node.js pseudo-terminal; required for Claude Code interactive TUI |
| Unzip | `unzipper` | Streaming unzip, works with macOS-generated zips including __MACOSX entries |
| Config | `dotenv` | Load .env for ANTHROPIC_API_KEY without leaking to environment |
| Dev runner | `tsx` | No build step needed for development |
