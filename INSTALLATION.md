# Installation

**Who is this for?** Complete setup reference for all installation modes.
**When should I read this?** When you need the full picture: HTTP, STDIO, plugins, offline, or environment variables. For the fastest path, see [QUICKSTART.md](QUICKSTART.md).

> [!WARNING]
> Use **Sonnet 4.6**, **GPT-5.3-codex-medium**, **gemini-3.1-pro** or better models. Avoid Auto model selection.

---

## Choose Your Mode

|                    | HTTP (recommended)          | STDIO                                   | Plugin                                       | Offline                                     |
| ------------------ | --------------------------- | --------------------------------------- | -------------------------------------------- | ------------------------------------------- |
| Setup              | Single URL, OAuth automatic | Env vars, API key per user              | CLI marketplace commands (installs HTTP MCP) | Download zip, copy files                    |
| Local dependencies | None                        | Python 3.12+, uvx                       | None                                         | None                                        |
| Auth               | OAuth via browser           | API key from Rosetta Server             | OAuth via browser (HTTP MCP)                 | None                                        |
| Network            | Requires internet           | Requires internet                       | Requires internet                            | No network needed (with local models)       |
| Best for           | Most users                  | Custom configs, controlled environments | Claude Code, Cursor                          | Air-gapped or highly regulated environments |

## Step 1: Install

Pick one mode and follow its section.

### HTTP Transport (Recommended)

One URL, no local dependencies, OAuth handles authentication automatically.

<details>
<summary><b>Cursor</b></summary>

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "Rosetta": {
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}
```

</details>

<details>
<summary><b>Claude Code</b></summary>

```sh
claude mcp add --transport http Rosetta https://rosetta.evergreen.gcp.griddynamics.net/mcp
```

Authenticate inside a claude session with `/mcp`, select Rosetta, Authenticate, and complete the OAuth flow.

</details>

<details>
<summary><b>Codex</b></summary>

```sh
codex mcp add Rosetta --url https://rosetta.evergreen.gcp.griddynamics.net/mcp
codex mcp login Rosetta
```

</details>

<details>
<summary><b>VS Code / GitHub Copilot</b></summary>

Add to `.vscode/mcp.json` or `~/.mcp.json`:

```json
{
  "servers": {
    "Rosetta": {
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}
```

</details>

<details>
<summary><b>GitHub Copilot (JetBrains)</b></summary>

`Settings` > `Tools` > `GitHub Copilot` > `MCP Settings`. Add to `~/.config/github-copilot/intellij/mcp.json`:

```json
{
  "servers": {
    "Rosetta": {
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}
```

Restart IDE after changes.

</details>

<details>
<summary><b>JetBrains Junie</b></summary>

`Settings` > `Tools` > `Junie` > `MCP Settings` > `+ Add` > `As JSON`:

```json
{
  "mcpServers": {
    "Rosetta": {
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}
```

</details>

<details>
<summary><b>Windsurf</b></summary>

Add to your Windsurf MCP config:

```json
{
  "mcpServers": {
    "Rosetta": {
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}
```

</details>

<details>
<summary><b>Antigravity</b></summary>

Add to your Antigravity MCP config:

```json
{
  "mcpServers": {
    "Rosetta": {
      "serverUrl": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}
```

</details>

<details>
<summary><b>OpenCode</b></summary>

Add to `opencode.json`:

```json
{
  "mcp": {
    "Rosetta": {
      "type": "http",
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp",
      "enabled": true
    }
  }
}
```

</details>

Any MCP client that supports HTTP transport can connect using the endpoint URL. Complete the OAuth flow when prompted.

### STDIO Transport

STDIO runs Rosetta MCP as a local process. Your IDE launches it and communicates over stdin/stdout.

#### Get Your API Key

1. Open [Rosetta Server (RAGFlow)](https://ims.evergreen.gcp.griddynamics.net/)
2. Create an account or sign in
3. Generate an API key from your profile

#### Join Your Team's Datasets

Your team lead shares Instructions and Project datasets. You must accept the invite before you can see them. Check your Rosetta Server inbox for pending invitations.

#### Configure Your IDE

Required environment variables:

| Variable             | Value                                         |
| -------------------- | --------------------------------------------- |
| `ROSETTA_SERVER_URL` | `https://ims.evergreen.gcp.griddynamics.net/` |
| `ROSETTA_API_KEY`    | Your personal API key                         |
| `ROSETTA_USER_EMAIL` | Your email address                            |

<details>
<summary><b>Cursor</b></summary>

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "Rosetta": {
      "command": "uvx",
      "args": ["ims-mcp@latest"],
      "env": {
        "ROSETTA_SERVER_URL": "https://ims.evergreen.gcp.griddynamics.net/",
        "ROSETTA_API_KEY": "your-api-key",
        "ROSETTA_USER_EMAIL": "you@example.com"
      }
    }
  }
}
```

</details>

<details>
<summary><b>Claude Code</b></summary>

```sh
claude mcp add --transport stdio Rosetta \
  --env ROSETTA_SERVER_URL=https://ims.evergreen.gcp.griddynamics.net/ \
  --env ROSETTA_API_KEY=your-api-key \
  --env ROSETTA_USER_EMAIL=you@example.com \
  -- uvx ims-mcp@latest
```

</details>

<details>
<summary><b>Codex</b></summary>

```sh
codex mcp add Rosetta \
  --env ROSETTA_SERVER_URL=https://ims.evergreen.gcp.griddynamics.net/ \
  --env ROSETTA_API_KEY=your-api-key \
  --env ROSETTA_USER_EMAIL=you@example.com \
  -- uvx ims-mcp@latest
```

</details>

<details>
<summary><b>VS Code / GitHub Copilot</b></summary>

Add to `.vscode/mcp.json` or `~/.mcp.json`:

```json
{
  "servers": {
    "Rosetta": {
      "type": "stdio",
      "command": "uvx",
      "args": ["ims-mcp@latest"],
      "env": {
        "ROSETTA_SERVER_URL": "https://ims.evergreen.gcp.griddynamics.net/",
        "ROSETTA_API_KEY": "your-api-key",
        "ROSETTA_USER_EMAIL": "you@example.com"
      }
    }
  }
}
```

</details>

<details>
<summary><b>GitHub Copilot (JetBrains)</b></summary>

Add to `~/.config/github-copilot/intellij/mcp.json`:

```json
{
  "servers": {
    "Rosetta": {
      "type": "stdio",
      "command": "uvx",
      "args": ["ims-mcp@latest"],
      "env": {
        "ROSETTA_SERVER_URL": "https://ims.evergreen.gcp.griddynamics.net/",
        "ROSETTA_API_KEY": "your-api-key",
        "ROSETTA_USER_EMAIL": "you@example.com"
      }
    }
  }
}
```

Restart IDE after changes.

</details>

<details>
<summary><b>JetBrains Junie</b></summary>

`Settings` > `Tools` > `Junie` > `MCP Settings` > `+ Add` > `As JSON`:

```json
{
  "mcpServers": {
    "Rosetta": {
      "command": "uvx",
      "args": ["ims-mcp@latest"],
      "env": {
        "ROSETTA_SERVER_URL": "https://ims.evergreen.gcp.griddynamics.net/",
        "ROSETTA_API_KEY": "your-api-key",
        "ROSETTA_USER_EMAIL": "you@example.com"
      }
    }
  }
}
```

</details>

<details>
<summary><b>Windsurf</b></summary>

Add to your Windsurf MCP config:

```json
{
  "mcpServers": {
    "Rosetta": {
      "command": "uvx",
      "args": ["ims-mcp@latest"],
      "env": {
        "ROSETTA_SERVER_URL": "https://ims.evergreen.gcp.griddynamics.net/",
        "ROSETTA_API_KEY": "your-api-key",
        "ROSETTA_USER_EMAIL": "you@example.com"
      }
    }
  }
}
```

</details>

<details>
<summary><b>Antigravity</b></summary>

Add to your Antigravity MCP config:

```json
{
  "mcpServers": {
    "Rosetta": {
      "command": "uvx",
      "args": ["ims-mcp@latest"],
      "env": {
        "ROSETTA_SERVER_URL": "https://ims.evergreen.gcp.griddynamics.net/",
        "ROSETTA_API_KEY": "your-api-key",
        "ROSETTA_USER_EMAIL": "you@example.com"
      }
    }
  }
}
```

</details>

<details>
<summary><b>OpenCode</b></summary>

Add to `opencode.json`:

```json
{
  "mcp": {
    "Rosetta": {
      "type": "local",
      "command": ["uvx", "ims-mcp@latest"],
      "enabled": true,
      "env": {
        "ROSETTA_SERVER_URL": "https://ims.evergreen.gcp.griddynamics.net/",
        "ROSETTA_API_KEY": "your-api-key",
        "ROSETTA_USER_EMAIL": "you@example.com"
      }
    }
  }
}
```

</details>

#### Environment Variables Reference

Required for STDIO transport. Optional otherwise.

| Variable                  | Default                    | Description                                                                                                                                                 |
| ------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ROSETTA_SERVER_URL`      | `http://localhost:80`      | Rosetta Server base URL. **Required.**                                                                                                                      |
| `ROSETTA_API_KEY`         | (empty)                    | API key for Rosetta Server access. **Required.**                                                                                                            |
| `ROSETTA_USER_EMAIL`      | `rosetta@griddynamics.net` | User identity for authorization checks                                                                                                                      |
| `ROSETTA_MODE`            | `HARD`                     | `HARD` adds more content to context with stricter requirements. `SOFT` is lighter and allows more agent independence, better when bootstrap.md is also used |
| `ROSETTA_INVITE_EMAILS`   | (empty)                    | Comma-separated emails auto-invited on project dataset creation                                                                                             |
| `INSTRUCTION_ROOT_FILTER` | (empty)                    | Comma-separated root tags filter for instructions                                                                                                           |
| `IMS_DEBUG`               | disabled                   | Enable debug logs (`1`, `true`, `yes`, `on`)                                                                                                                |
| `POSTHOG_API_KEY`         | (built-in)                 | Set to `""` to disable usage analytics                                                                                                                      |

Do not set `VERSION`. It uses a server-controlled default for managed upgrades. See [Architecture — Tradeoffs](docs/ARCHITECTURE.md#tradeoffs) for rationale.

### Plugin-Based Installation

Rosetta publishes plugins for Claude Code and Cursor through the plugin marketplace. Install to your user profile for use across all projects.

Two modes:

- **Lightweight (recommended):** bootstrap rule and MCP server definition only. Smallest footprint, behavior driven by MCP.
- **Full:** core (20 skills, 7 agents, 4 workflows, bootstrap rules) plus optional grid enterprise extensions. Requires core 2.0.0+ for grid.

Read more about plugin contents and capabilities in the [Usage Guide — Plugins](USAGE_GUIDE.md#plugins).

#### Claude Code

```sh
claude plugin marketplace add griddynamics/rosetta

# Lightweight (recommended)
claude plugin install rosetta@rosetta

# Full
claude plugin install core@rosetta
claude plugin install grid@rosetta           # Enterprise (optional, requires core)
```

#### Cursor

Cursor uses `.cursor-plugin/plugin.json` and `.cursor-plugin/marketplace.json` manifests. See the plugin repository for Cursor-specific setup.

### Offline Installation (No MCP)

For environments without network access to Rosetta Server.

1. Disable or remove Rosetta MCP from your IDE configuration
2. Download `instructions.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest)
3. Extract to `instructions/` in your repository or workspace
4. Copy the contents of [local-files-mode.md](https://github.com/griddynamics/rosetta/blob/main/instructions/r2/core/rules/local-files-mode.md?plain=1) into your IDE's instruction file (keep frontmatter!):

| IDE                        | Destination                           |
| -------------------------- | ------------------------------------- |
| Cursor                     | `.cursor/rules/local-files-mode.mdc`  |
| Claude Code                | `.claude/claude.md`                   |
| Windsurf                   | `.windsurf/rules/local-files-mode.md` |
| VS Code / GitHub Copilot   | `.github/copilot-instructions.md`     |
| GitHub Copilot (JetBrains) | `.github/copilot-instructions.md`     |
| JetBrains Junie            | `.junie/guidelines.md`                |
| Antigravity                | `.agent/rules/local-files-mode.md`    |
| OpenCode                   | `AGENTS.md`                           |

## Step 2: Add Bootstrap Rule (HTTP and STDIO modes ONLY)

Applies to HTTP and STDIO modes.

Skip if using [Plugin](#plugin-based-installation) or [Offline](#offline-installation-no-mcp) installation.

Download [bootstrap.md](https://github.com/griddynamics/rosetta/blob/main/instructions/r2/core/rules/bootstrap.md?plain=1) and add it to your IDE's instruction file (keep entire contents, including YAML frontmatter):

| IDE                        | Destination                       |
| -------------------------- | --------------------------------- |
| Cursor                     | `.cursor/rules/bootstrap.mdc`     |
| Claude Code                | `.claude/claude.md`               |
| VS Code / GitHub Copilot   | `.github/copilot-instructions.md` |
| GitHub Copilot (JetBrains) | `.github/copilot-instructions.md` |
| JetBrains Junie            | `.junie/guidelines.md`            |
| Windsurf                   | `.windsurf/rules/bootstrap.md`    |
| Antigravity                | `.agent/rules/bootstrap.md`       |
| OpenCode                   | `AGENTS.md`                       |

> [!NOTE]
> Some tools (Cline, Kilo) do not read MCP server prompts. For these, bootstrap.md is always required.

## Step 3: Verify

Applies to all installation modes. Ask the agent:

```
What can you do, Rosetta?
```

It should use Rosetta MCP to retrieve agents, guardrails, and instructions:

<img src="docs/images/Rosetta-ProperResponse1.png" alt="Rosetta proper response" width="355"/> <img src="docs/images/Rosetta-ProperResponse2.png" alt="Rosetta proper response" width="300"/>

## Step 4: Initialize Repository

Run once per repository after installation:

```
Initialize this repository using Rosetta
```

The agent runs an eight-phase workflow (see [Usage Guide — Init Workspace](USAGE_GUIDE.md#workflows) for details):

1. **Context** — detect workspace mode and build file inventory
2. **Shells** — generate IDE/agent shell files from KB schemas
3. **Discovery** — produce TECHSTACK.md, CODEMAP.md, DEPENDENCIES.md
4. **Rules** (optional) — configure local agent rules
5. **Patterns** — extract recurring coding and architectural patterns
6. **Documentation** — create CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md
7. **Questions** — clarifying questions about gaps and assumptions
8. **Verification** — completeness check and catch-up for missed artifacts

> [!NOTE]
> **Composite workspaces:** init each repository separately, then init at the workspace level with "This is composite workspace" appended.
> **Dead code or existing specs:** mention their location in the prompt to save time.

### Workspace Files Created

After initialization, Rosetta maintains these files in your repository. Read more about their purpose in [Architecture — Workspace Files](docs/ARCHITECTURE.md#workspace-files).

**Committed to SCM:**

- `gain.json` - SDLC setup and Rosetta file locations
- `docs/CONTEXT.md` - business context (no technical details)
- `docs/ARCHITECTURE.md` - architecture and technical requirements
- `docs/TECHSTACK.md` - tech stack of all modules
- `docs/DEPENDENCIES.md` - dependencies of all modules
- `docs/CODEMAP.md` - code map of workspace
- `docs/TODO.md` - improvements, feature requests, TODOs (created when needed)
- `docs/ASSUMPTIONS.md` - assumptions and unknowns (created when needed)
- `docs/REQUIREMENTS/*` - original requirements with INDEX.md (optional)
- `docs/PATTERNS/*` - coding and architectural patterns with INDEX.md (optional)
- `agents/IMPLEMENTATION.md` - current implementation state (the only changelog)
- `agents/MEMORY.md` - root causes of errors and lessons learned
- `plans/<FEATURE>/<FEATURE>-PLAN.md` - execution plans
- `plans/<FEATURE>/<FEATURE>-SPECS.md` - tech specs
- `refsrc/INDEX.md` - index of reference documentation (only refsrc file committed)

**Excluded from SCM:**

- `refsrc/*` (except INDEX.md) - reference knowledge files
- `agents/TEMP/<FEATURE>` - temporary implementation files

## Upgrading

- **HTTP:** No action needed. Server-side upgrades apply automatically.
- **STDIO:** `uvx ims-mcp@latest` always pulls the newest published version. No manual step needed.
- **Plugins:** Plugins auto-upgrade or can be updated via `claude plugin update`.
- **Offline:** Download the latest `instructions.zip` from [releases](https://github.com/griddynamics/rosetta/releases/latest) and replace the contents of `instructions/`.

## Uninstalling

**HTTP/STDIO MCP:**

- **Claude Code:** `claude mcp remove Rosetta`
- **Codex:** `codex mcp remove Rosetta`
- **Cursor, VS Code, Windsurf, JetBrains, Antigravity, OpenCode:** Remove the Rosetta entry from your MCP configuration file

**Plugins:**

- **Claude Code:** `claude plugin uninstall rosetta@rosetta` (or `core@rosetta`, `grid@rosetta` for full install)
- **Cursor:** Remove the `.cursor-plugin/` directory from your project

**Offline:**

- Delete the `instructions/` directory and the IDE instruction file content you added

## Related Docs

- [QUICKSTART.md](QUICKSTART.md) - fastest path to a working setup
- [OVERVIEW.md](OVERVIEW.md) - mental model and terminology
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - common issues and fixes
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - org-wide server deployment
