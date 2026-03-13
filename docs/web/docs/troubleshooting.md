---
layout: docs
title: Troubleshooting
permalink: /docs/troubleshooting/
---

# Troubleshooting

**Who is this for?** Anyone blocked while using or developing Rosetta.

**When should I read this?** When something isn't working and you need a quick fix.

---

## Connection & Authentication

**OAuth prompt does not appear**
- Restart your IDE and retry the connection
- Confirm your IDE supports HTTP MCP transport (see [Quick Start](/docs/quickstart/))
- Some IDEs require manually triggering auth (Claude Code: `/mcp` > select Rosetta > Authenticate)

**MCP server shows as disconnected**
- Open your IDE's MCP settings and verify the Rosetta server entry exists
- Check that the endpoint URL is exactly `https://rosetta.evergreen.gcp.griddynamics.net/mcp`
- Restart the IDE. Some IDEs need a full restart after config changes

**Agent suddenly stops following Rosetta rules**
- MCP OAuth tokens expire. When this happens, the MCP connection silently degrades: tools still appear but the agent stops receiving instructions
- Re-authenticate: trigger the OAuth flow again through your IDE's MCP settings
- In Claude Code: `/mcp` > select Rosetta > Authenticate
- `codex mcp login Rosetta`

## Agent Not Using Rosetta

**Agent ignores Rosetta tools entirely**
- Confirm the MCP server shows as connected in your IDE's MCP settings
- Add a [bootstrap rule](/docs/installation/) to your project. This is the universal fallback for any IDE or agent that doesn't reliably read MCP server prompts
- Download [bootstrap.md](https://github.com/griddynamics/rosetta/blob/main/instructions/r2/core/rules/bootstrap.md?plain=1) and place it in your IDE's instruction file (see [Quick Start](/docs/quickstart/#step-2-add-bootstrap-rule) Step 2 for paths)

**Agent used Rosetta before but stopped**
- Check re-authentication (see above)
- Verify the model hasn't changed. Auto model selection often picks models that don't follow MCP instructions well
- Re-add the bootstrap rule if it was removed

**Untested IDE or agent**
- Not every IDE/agent has been validated with Rosetta. If yours isn't listed in [Quick Start](/docs/quickstart/), it may not invoke MCP tools reliably
- The bootstrap rule works as a fallback for any agent that reads project-level instruction files
- If neither MCP nor bootstrap works, your IDE/agent may not support the required capabilities. Open an [issue](https://github.com/griddynamics/rosetta/issues)

## Model Selection

**Wrong model causes poor or inconsistent results**

Use **Sonnet 4.6**, **GPT-5.3-codex-medium**, **gemini-3.1-pro** or better. Avoid Auto model selection. Weaker models skip tool calls, hallucinate instructions, or ignore MCP prompts entirely.

## Slow or Empty Responses

- Check your network can reach `rosetta.evergreen.gcp.griddynamics.net`
- Rosetta Server (RAGFlow) may be temporarily unavailable. Retry after a few minutes
- Large repositories take longer on first initialization. This is expected

---

## For Contributors

For full local development setup, see the [Developer Guide](/docs/developer-guide/).

### Local Development Setup

**"OPENAI_API_KEY not set" or missing environment variables**
- Copy the dev environment file: `cp .env.dev .env`
- Edit `.env` and fill in your API keys

**"Port is already in use"**
- Find what's using it: `lsof -i :<port>`
- Kill the process: `kill <PID>`

### Publishing

Read more about CLI commands and change detection in [Architecture — Rosetta CLI](/docs/architecture/#rosetta-cli).

**"No changes detected"**
- Files are unchanged since last publish. This is working as intended
- Use `--force` flag to republish all files

**"Connection refused" or "Authentication failed"**
- Verify Rosetta Server (RAGFlow) is running
- Check that `.env` has the correct server URL and credentials (`cp .env.dev .env` if starting fresh)
- Run: `python ims_cli.py verify` to test connectivity

### Parser Failures

Documents can fail parsing during ingestion. To diagnose:

1. Open RAGFlow UI
2. Navigate to the dataset, then the specific file
3. Look for a small green or red dot next to the file
4. Click the dot to see the parsing error details

Common causes: unsupported file format, oversized documents, malformed markdown.

---

## Still Stuck?

- [Discord](https://discord.gg/QzZ2cWg36g)
- [Open an issue](https://github.com/griddynamics/rosetta/issues)
- [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)
