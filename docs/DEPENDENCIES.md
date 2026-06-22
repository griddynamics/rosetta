Direct dependencies of all modules in this Rosetta repository.

## ims-mcp-server (ims-mcp v2.0.13)

| Package | Version Constraint | Purpose |
|---|---|---|
| ragflow-sdk | >=0.24.0,<1.0.0 | Document storage and retrieval (RAGFlow backend) |
| mcp | >=1.26.0,<2.0.0 | MCP Python SDK |
| fastmcp | >=3.1.0,<4 | FastMCP framework (Streamable HTTP + OAuth proxy) |
| posthog | >=7.0.0,<8.0.0 | Usage analytics |
| cryptography | >=43.0.0 | Fernet encryption for Redis token storage |
| uuid7-standard | >=1.0.0,<2.0.0 | UUID v7 generation for deterministic document IDs |

### ims-mcp-server optional[redis]

| Package | Version Constraint | Purpose |
|---|---|---|
| py-key-value-aio[redis] | >=0.4.4,<0.5.0 | Async Redis client for session/plan store |

### ims-mcp-server optional[dev]

| Package | Version Constraint | Purpose |
|---|---|---|
| build | >=1.0.0 | Package builder |
| twine | >=4.0.0 | PyPI publisher |
| pytest | >=7.0.0 | Test runner |
| pytest-asyncio | >=0.23.0 | Async test support |

## src/rosetta-cli (rosetta-cli v2.0.10)

| Package | Version Constraint | Purpose |
|---|---|---|
| python-dotenv | >=1.0.0,<2.0.0 | .env file loading |
| python-frontmatter | >=1.1.0,<2.0.0 | YAML frontmatter extraction from instruction files |
| ragflow-sdk | >=0.23.1,<1.0.0 | RAGFlow API client for publishing |
| requests | >=2.31.0,<3.0.0 | HTTP client |
| tqdm | >=4.67.0,<5.0.0 | Progress bars during publish |

### src/rosetta-cli optional[dev]

| Package | Version Constraint | Purpose |
|---|---|---|
| build | >=1.0.0 | Package builder |
| pytest | >=7.0.0 | Test runner |
| twine | >=4.0.0 | PyPI publisher |

## rosetta-mcp-server (rosetta-mcp v2.0.13)

| Package | Version Constraint | Purpose |
|---|---|---|
| ims-mcp | ==2.0.13 | Core MCP server (pinned exact version) |

## Shared Dev (requirements.txt)

| Package | Version Constraint | Purpose |
|---|---|---|
| rosetta-cli[dev] | editable | CLI development install |
| ims-mcp-server[dev,redis] | editable | MCP server development install |
| mypy | >=1.10.0 | Static type checking |

## docs/web (Gemfile)

| Gem | Version Constraint | Purpose |
|---|---|---|
| jekyll | ~> 4.4 | Static site generator |
| csv | latest | Ruby CSV support |
| webrick | latest | Local dev server |

## UV Override

| Package | Version Constraint | Reason |
|---|---|---|
| tiktoken | >=0.12.0 | Override transitive constraint from ragflow-sdk |

## Reference Sources (read-only, not installed)

| Source | Version | Purpose |
|---|---|---|
| refsrc/fastmcp-3.1.1 | 3.1.1 | FastMCP source reference |
| refsrc/python-sdk-1.26.0 | 1.26.0 | MCP Python SDK reference |
| refsrc/ragflow-0.24.0 | 0.24.0 | RAGFlow SDK reference |
