# Rosetta CLI

> Knowledge base publishing and management tools powered by RAGFlow

## 🎯 Overview

This directory contains the Python package for publishing knowledge base content to RAGFlow instances. The CLI supports multi-environment workflows with smart change detection and auto-metadata extraction.

## Community

- [Discord](https://discord.gg/QzZ2cWg36g)
- [Website](https://griddynamics.github.io/rosetta/)
- [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)

### Key Features

- **🚀 Smart Publishing** - MD5 hash-based change detection (~77% faster republishing)
- **🏗️ Modular Architecture** - Command pattern with service layer for maintainability
- **🏷️ Tag-in-Title Format** - `[tag1][tag2] filename.ext` for powerful server-side filtering
- **📊 Parse Status Tracking** - Monitor document parsing progress with visual indicators
- **🔄 Upsert Semantics** - No duplicates, republishing updates existing documents
- **⏱️ Performance Timing** - All commands show execution time
- **🌍 Multi-Environment** - Switch between local, dev, and production configs
- **🔐 API Key Auth** - Secure authentication via RAGFlow API keys
- **🎯 Server-Side Filtering** - Reduce network traffic with metadata conditions

### Quick Navigation

- **Complete Setup Guide:** See [docs/QUICKSTART.md](docs/QUICKSTART.md) for detailed setup instructions
- **CLI Commands:** See [CLI Commands](#-cli-commands) for all available commands
- **Environment Management:** See [Environment Management](#-environment-management) for switching configs

## 📁 Contents

```
rosetta-cli/
├── pyproject.toml          # Package metadata + console entrypoint
├── rosetta_cli/            # Installable Python package
│   ├── cli.py              # CLI entry point
│   ├── commands/           # Command implementations
│   ├── services/           # Shared business logic
│   ├── ims_config.py       # Configuration management
│   ├── ims_publisher.py    # Publishing orchestration
│   └── ragflow_client.py   # RAGFlow SDK wrapper
├── env.template            # Environment configuration template
├── tests/                  # CLI unit tests
└── README.md               # This file
```

## 🚀 Quick Start

Complete setup instructions are in [docs/QUICKSTART.md](../docs/QUICKSTART.md). Here's the quick reference:

### Prerequisites

- Python 3.12 (required by ragflow-sdk 0.23.1)
- RAGFlow instance (local via Docker Compose or remote)
- `uvx` for installed CLI usage
- Root virtual environment configured for local CLI development

### Installed Usage

```bash
uvx rosetta-cli@latest version
uvx rosetta-cli@latest verify
```

### Local Development

```bash
python3 -m venv venv
venv/bin/pip install -r requirements.txt
cp rosetta-cli/.env.dev .env
venv/bin/rosetta-cli verify
```

## 🔧 CLI Commands

All commands support `--env <environment>` flag to override the active environment.

### Version

```bash
uvx rosetta-cli@latest version
```

### Publishing Commands

#### Publish Knowledge Base Content

```bash
# Publish all instructions (only changed files)
uvx rosetta-cli@latest publish ../instructions

# Publish business context
uvx rosetta-cli@latest publish ../business

# Force republish all files (bypass change detection)
uvx rosetta-cli@latest publish ../instructions --force

# Preview changes without publishing
uvx rosetta-cli@latest publish ../instructions --dry-run

# Use different environment
uvx rosetta-cli@latest publish ../instructions --env production
```

**Performance:**
- First publish: ~10-15s per file (embedding generation + parsing)
- Subsequent publishes: Only changed files (~77% faster)
- Dry run: Preview in ~2-3s

**What gets published:**

```
File: /instructions/agents/r1/agents.md

Published as:
  Document ID: b0ec4d56-6cc5-5bbd-9868-5d49afa2a7d8 (UUID from path)
  Title: [instructions][agents][r1] agents.md
  Dataset: aia-r1 (from template: aia-{release})
  Tags: ["instructions", "agents", "r1"]  (in metadata)
  Domain: instructions (first folder)
  Release: r1 (auto-detected from path)
  Content Hash: abc123... (MD5 of content)
```

#### Trigger Document Parsing

Re-parse documents without re-uploading (useful for changing parser settings):

```bash
# Parse all unparsed documents
uvx rosetta-cli@latest parse

# Parse specific dataset
uvx rosetta-cli@latest parse --dataset aia-r1

# Force re-parse ALL documents
uvx rosetta-cli@latest parse --dataset aia-r1 --force

# Preview without parsing (dry run)
uvx rosetta-cli@latest parse --dataset aia-r1 --dry-run
```

#### List Documents

```bash
# List documents in default dataset
uvx rosetta-cli@latest list-dataset

# List specific dataset
uvx rosetta-cli@latest list-dataset --dataset aia-r1
```

**Output shows:**
- Document title (with tag prefixes)
- Document ID, file size, parse status, chunk count
- Metadata (tags, domain, release, source path)

#### Cleanup Dataset

```bash
# Preview cleanup without deleting
uvx rosetta-cli@latest cleanup-dataset --dataset aia-r1 --dry-run

# Cleanup documents with specific prefix
uvx rosetta-cli@latest cleanup-dataset --dataset aia-r1 --prefix "aqa-phase" --dry-run

# Cleanup documents with specific tags (space-separated)
uvx rosetta-cli@latest cleanup-dataset --dataset aia-r1 --tags "r1 agents" --dry-run

# Cleanup documents with specific tags (comma-separated)
uvx rosetta-cli@latest cleanup-dataset --dataset aia-r1 --tags "r1,agents" --dry-run

# Force cleanup without confirmation
uvx rosetta-cli@latest cleanup-dataset --dataset aia-r1 --force

# Force cleanup with prefix
uvx rosetta-cli@latest cleanup-dataset --dataset aia-r1 --prefix "aqa-phase" --force

# Force cleanup with tags
uvx rosetta-cli@latest cleanup-dataset --dataset aia-r1 --tags "r1,agents" --force
```

⚠️ **Warning:** Without `--prefix` or `--tags`, this deletes ALL documents. Use `--dry-run` first.

**Filtering Options:**
- `--prefix`: Match documents by title prefix (e.g., `"[instructions]"`)
- `--tags`: Match documents by metadata tags (e.g., `"r1 agents"` or `"r1,agents"`)
  - Uses OR logic: finds documents with ANY of the specified tags
  - Server-side filtering for efficiency

### Verification Commands

#### Verify Connection

```bash
uvx rosetta-cli@latest verify

# Check production environment
uvx rosetta-cli@latest verify --env production
```

Checks:
- API key validity
- RAGFlow server connectivity
- System health (database, Redis, document engine)
- Available datasets

## 🌍 Environment Management

### Configuration Files

| File | Environment | Purpose |
|------|-------------|---------|
| `env.template` | Template | Create new environments |
| `.env` | **Active** | Current configuration (gitignored) |
| `.env.local` | Local | Local RAGFlow development |
| `.env.remote` | Remote | Production RAGFlow instance |

### Switch Environments

**Method 1: Copy file to .env** (recommended)

```bash
# Switch to local
cp .env.local .env

# Switch to production
cp .env.remote .env

# Check current environment
grep "ENVIRONMENT=" .env
```

**Method 2: Use --env flag** (temporary override)

```bash
uvx rosetta-cli@latest list-dataset --env local
uvx rosetta-cli@latest publish ../instructions --env production
```

### Environment Variables

```bash
# Required
RAGFLOW_BASE_URL=http://your-ragflow-instance
RAGFLOW_API_KEY=ragflow-xxx...
ENVIRONMENT=local

# Dataset Configuration
RAGFLOW_DATASET_DEFAULT=aia
RAGFLOW_DATASET_TEMPLATE=aia-{release}

# Embedding Model (optional)
RAGFLOW_EMBEDDING_MODEL=text-embedding-3-small@OpenAI

# Chunking Configuration (optional)
RAGFLOW_CHUNK_METHOD=naive
RAGFLOW_CHUNK_TOKEN_NUM=512
RAGFLOW_DELIMITER=\n
RAGFLOW_AUTO_KEYWORDS=0
RAGFLOW_AUTO_QUESTIONS=0
```

### Creating New Environments

```bash
cp env.template .env.staging
nano .env.staging
uvx rosetta-cli@latest verify --env staging
```

## 🏗️ Architecture

### Key Components

#### RAGFlowClient (`ragflow_client.py`)

Wrapper around ragflow-sdk:

```python
from rosetta_cli.ragflow_client import RAGFlowClient, DocumentMetadata

client = RAGFlowClient(api_key="ragflow-xxx", base_url="http://your-ragflow-instance")

# Dataset management
client.create_dataset(name="aia-r1", description="Release 1")
client.get_dataset(name="aia-r1")
client.list_datasets()

# Document upload with change detection
client.upload_document(
    file_path=Path("agents.md"),
    metadata=DocumentMetadata(...),
    dataset_id="dataset-id",
    force=False  # Skip if unchanged
)

# Health check
client.verify_connection()
client.get_system_health()
```

#### IMSConfig (`ims_config.py`)

Configuration management with smart .env discovery:

```python
from rosetta_cli.ims_config import IMSConfig

# Auto-discover .env (searches cwd, script dir, git root)
config = IMSConfig.from_env()

# Use specific environment
config = IMSConfig.from_env(environment="production")

# Validate configuration
config.validate()
```

#### ContentPublisher (`ims_publisher.py`)

Publishing logic with metadata extraction:

```python
from rosetta_cli.ims_publisher import ContentPublisher

publisher = ContentPublisher(client, config, workspace_root)

results = publisher.publish(
    content_path=Path("../instructions"),
    force=False,      # Skip unchanged files
    dry_run=False,    # Preview mode
    no_parse=False,   # Skip parsing after upload
    parse_timeout=300 # Parse timeout in seconds
)

print(f"Published: {results.published_count}")
print(f"Skipped: {results.skipped_count}")
print(f"Failed: {results.failed_count}")
```

**Metadata Extraction:**

```
File: /instructions/agents/r1/bootstrap.md

Extracted:
  Tags: ["instructions", "agents", "r1"]
  Domain: instructions
  Release: r1
  Title: bootstrap.md
  Content Hash: abc123... (MD5)
  Document ID: uuid-from-path
```

## 🎯 Tag-in-Title Format

### What is Tag-in-Title?

Documents are stored with tags as prefixes for server-side filtering:

```
Format: [tag1][tag2][tag3] filename.ext

Examples:
  [instructions][agents][r1] agents.md
  [business][project] RFP.pdf
```

### Why Two Locations?

Tags are stored in **both title and metadata**:

**Title:** Fast server-side keyword search
**Metadata:** Precise client-side filtering with complex queries

### How Tags are Generated

Tags come from **folder structure only**:

```
File: /instructions/agents/r1/bootstrap.md
Folders: instructions / agents / r1 / (file)
Tags: [instructions][agents][r1]
```

### Using Tags for Filtering

```bash
# Delete all instruction documents
uvx rosetta-cli@latest cleanup-dataset --prefix "[instructions]"

# Delete all r1 agent documents
uvx rosetta-cli@latest cleanup-dataset --prefix "[instructions][agents][r1]"
```

## 💻 Usage Examples

### Example 1: First-Time Setup

```bash
python3 -m venv venv
venv/bin/pip install -r requirements.txt
cp rosetta-cli/env.template .env
nano .env  # Add RAGFLOW_BASE_URL and RAGFLOW_API_KEY
uvx rosetta-cli@latest verify
uvx rosetta-cli@latest publish instructions
```

### Example 2: Daily Publishing Workflow

```bash
uvx rosetta-cli@latest publish ../instructions --dry-run
uvx rosetta-cli@latest publish ../instructions
uvx rosetta-cli@latest list-dataset
```

### Example 3: Multi-Environment Publishing

```bash
# Publish to dev
uvx rosetta-cli@latest publish ../instructions --env dev

# Verify on dev
uvx rosetta-cli@latest verify --env dev

# Publish to production
uvx rosetta-cli@latest publish ../instructions --env prod
```

### Example 4: Cleanup and Republish

```bash
# Preview deletion
uvx rosetta-cli@latest cleanup-dataset --dataset aia-r1 --dry-run

# Delete all documents
uvx rosetta-cli@latest cleanup-dataset --dataset aia-r1 --force

# Republish everything
uvx rosetta-cli@latest publish ../instructions --force
```

### Example 5: Programmatic Usage

```python
from pathlib import Path
from rosetta_cli.ragflow_client import RAGFlowClient, DocumentMetadata
from rosetta_cli.ims_config import IMSConfig
from rosetta_cli.ims_publisher import ContentPublisher

config = IMSConfig.from_env()
client = RAGFlowClient(
    api_key=config.api_key,
    base_url=config.base_url,
    embedding_model=config.embedding_model,
    chunk_method=config.chunk_method,
    parser_config=config.parser_config
)

client.verify_connection()
publisher = ContentPublisher(client, config, Path("/path/to/workspace"))

results = publisher.publish(
    content_path=Path("/path/to/workspace") / "instructions",
    force=False,
    dry_run=False
)

print(f"Published: {results.published_count}, Skipped: {results.skipped_count}")
```

## 🔍 Troubleshooting

### Error: "api_key cannot be empty"

Set `RAGFLOW_API_KEY` in `.env`:
```bash
nano .env
# Add: RAGFLOW_API_KEY=ragflow-xxxxxxxxxxxxxxxxxxxx
```

### Error: "Invalid API key or expired token"

Generate new API key:
1. Login to RAGFlow
2. Profile → API Keys → Generate New Key
3. Update `.env` file

### Error: "Connection refused"

1. Check RAGFlow is running: `docker ps | grep ragflow`
2. Verify URL: `grep RAGFLOW_BASE_URL .env`
3. Test: `curl http://your-ragflow-instance/v1/system/healthz`

### Error: "Module 'ragflow_sdk' not found"

```bash
venv/bin/pip install -r requirements.txt
```

### Error: "No .env file found"

```bash
cp rosetta-cli/env.template .env
nano .env
```

### Parse Status Shows "FAIL"

1. Check document format (PDF, MD, TXT supported)
2. Re-trigger parsing: `uvx rosetta-cli@latest parse --dataset aia-r1 --force`
3. Check RAGFlow logs: `docker logs ragflow-server`

### Slow Publishing Performance

- Use faster embedding model: `RAGFLOW_EMBEDDING_MODEL=text-embedding-3-small@OpenAI`
- Ensure change detection works (don't use `--force`)
- Reduce chunk size: `RAGFLOW_CHUNK_TOKEN_NUM=256`

### Documents Not Showing Tags

Tags should appear in title with format `[tag1][tag2]`:
```bash
uvx rosetta-cli@latest list-dataset
# Output: 1. [instructions][agents][r1] agents.md
```

## 🚦 Performance Tips

### 1. Use Change Detection

```bash
# Good: Only publishes changed files (~77% faster)
uvx rosetta-cli@latest publish ../instructions

# Bad: Republishes everything
uvx rosetta-cli@latest publish ../instructions --force
```

### 2. Use Dry Run to Preview

```bash
# Preview (fast)
uvx rosetta-cli@latest publish ../instructions --dry-run

# Then publish for real
uvx rosetta-cli@latest publish ../instructions
```

### 3. Optimize Chunking

```bash
# Faster parsing
RAGFLOW_CHUNK_TOKEN_NUM=256

# Better context
RAGFLOW_CHUNK_TOKEN_NUM=1024
```

### 4. Use Selective Cleanup

```bash
# Fast: Delete specific documents
uvx rosetta-cli@latest cleanup-dataset --prefix "[instructions][agents]" --force

# Slow: Delete and republish everything
uvx rosetta-cli@latest cleanup-dataset --force
uvx rosetta-cli@latest publish ../instructions --force
```

### 5. Monitor Parse Status

```bash
uvx rosetta-cli@latest list-dataset | grep "Parse Status"
```

## 📖 Advanced Topics

### Custom Dataset Naming

The `RAGFLOW_DATASET_TEMPLATE` supports `{release}` placeholder:

```bash
RAGFLOW_DATASET_TEMPLATE=aia-{release}

# /instructions/r1/file.md → aia-r1
# /instructions/r2/file.md → aia-r2
# /instructions/file.md → aia (default)
```

### Supported File Types

**Text files** (extracted and chunked):
- Markdown (`.md`)
- Plain text (`.txt`)

**Binary files** (uploaded for storage):
- PDF, Excel, Word, PowerPoint


### Environment File Discovery

When running commands without specifying config, search order:

1. Current directory: `.env.{environment}` or `.env`
2. Script directory: `.env.{environment}` or `.env`
3. Git root: `.env.{environment}` or `.env`

## 📝 Related Documentation

- **Complete Setup:** [docs/QUICKSTART.md](../docs/QUICKSTART.md) - Comprehensive setup guide
- **Architecture:** [docs/CONTEXT.md](../docs/CONTEXT.md) - System architecture
- **Environment Template:** `env.template` - Configuration options
- **Requirements:** `requirements.txt` - Python dependencies
