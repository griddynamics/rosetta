---
name: external-lib-flow
description: "Workflow for onboarding an external private library so AI can use it without source access."
tags: ["workflow"]
user-invocable: true
baseSchema: docs/schemas/workflow.md
---

# Onboarding Routine - Execute sequentially - Use Todo Tasks

## Context

- Purpose: Onboard AI to external codebase for usage understanding
- Tool: Repomix MCP to package codebase (compressed XML)
- Target: Two documents in RefSrc folder and in Rosetta
  1. File: `{project-name}.xml` (compressed codebase, unmodified Repomix output)
  2. File: `{project-name}-onboarding.md` (brief Learning Flow with reference)
- Files involved: Project path, README, package files for auto-detection
- MUST generate brief Learning Flow (3-5 words per step, max 20 lines)
- MUST use compressed XML (Tree-sitter) for small output
- Onboarding document MUST specify KB title and search instructions
- Update ARCHITECTURE.md based on template `MUST use RefSrc/{project-name}.xml and RefSrc/{project-name}-onboarding.md. MUST use grep or search with those, because those are big files.`. Combine this rule for multiple external dependencies.

## Onboarding Flow

**Phase 0: Prerequsites**
1. All Rosetta prep steps MUST be FULLY completed
3. MUST USE OPERATION_MANAGER for deterministic execution

**Phase 1: Discovery**
1. Ask project path
2. Auto-detect project name
3. Auto-detect version number
4. Auto-detect tech stack

**Phase 2: Analysis**
1. Package with compression enabled
2. Analyze README for usage
3. Extract main entry points
4. Generate Learning Flow summary

**Phase 3: Publishing**
1. Upload compressed XML as-is
2. Create brief onboarding document
4. Confirm both document IDs
5. Cleanup temporary files

**Phase 4: Verification**
1. Search by project name
2. Verify tags present
3. Display Learning Flow
4. Confirm AI onboarded

Make sure to have todo tasks for each step! Do not skip steps!

## Phase 1: Discovery

### Idea

Ask or confirm user for project path with helpful suggestions. Auto-detect all metadata from project files to minimize user questions.

### Key Points

- Only ONE question: project path
- If user forgets, suggest current directory, parent, common paths
- Auto-detect project name from directory or package files
- Auto-detect version from package.json, pyproject.toml, pom.xml, Cargo.toml, etc.
- Auto-detect tech stack from file extensions and package files
- Use directory name as fallback for project name

### Steps

1. Ask user: "What project path to onboard?" 
   - Suggest existing project names with relative paths, which could be potentially shared
2. Validate path exists and is accessible
3. Auto-detect project name:
   - Check package.json (name field)
   - Check pyproject.toml (name field)
   - Check pom.xml (artifactId)
   - Check Cargo.toml (name field)
   - Any other project files (*.csproj, etc.)
   - Fallback: Use directory name (last path segment)
4. Auto-detect version:
   - Check package.json (version)
   - Check pyproject.toml (version)
   - Check pom.xml (version)
   - Check Cargo.toml (version)
   - Any other project files (*.csproj, etc.)
   - Fallback: skip version tag
5. Auto-detect tech stack:
   - package.json → ["nodejs", "javascript"] + scan for "typescript", "react", etc.
   - pyproject.toml or requirements.txt → ["python"] + scan for frameworks
   - pom.xml → ["java", "maven"]
   - Cargo.toml → ["rust", "cargo"]
   - Any other project files (*.csproj, etc.)
   - Multiple detected → include all
6. Inform user of detected metadata: "{project-name} v{version}, tech: {tags}"

## Phase 2: Analysis

### Idea

Use Repomix to package codebase with compression enabled (Tree-sitter). Generate Learning Flow summary by analyzing README and project structure. Keep XML small and focused on usage understanding. Make sure to exclude any tests projects or demo projects, to keep only the target project.

### Key Points

- MUST use `mcp_repomix_pack_codebase` with `compress: true`
- XML output is for AI consumption, not humans
- Extract signatures + structure, NOT implementation details
- Generate Learning Flow: phases with 3-5 word steps
- Read README for usage instructions
- Analyze main entry points (package.json scripts, main.py, Main.java, etc.)

### Steps

1. Use `mcp_repomix_pack_codebase`:
   - directory: detected project path
   - compress: true (ALWAYS enabled)
   - style: "xml"
   - Store output ID for later reading
2. Read project README if exists:
   - Look for: Installation, Setup, Usage, Getting Started sections
   - Extract key steps and commands
3. Identify main entry points:
   - package.json: "scripts" section (start, dev, build)
   - Python: __main__.py, main.py, or setup.py
   - Java: Main class or pom.xml build commands
   - Rust: main.rs or cargo commands
   - CSharp: main.cs
   - Etc.
4. Generate Learning Flow structure (3-5 words per point):
   - **Phase 1: Setup** (installation, dependencies, configuration)
   - **Phase 2: Usage** (running, testing, key commands)
   - **Phase 3: Key Components** (main modules, APIs, architecture)
   - Each step: 3-5 words maximum (e.g., "Install Python dependencies", "Configure environment variables")
   - Keep brief: max 20 lines total
5. Format Learning Flow as Markdown using example below:
   ```markdown
   # {Project Name} Onboarding
   
   **File**: {project-name}.xml
   
   ## Learning Flow
   
   ### Phase 1: Setup
   - Install dependencies
   - Configure environment
   
   ### Phase 2: Usage
   - Start development server
   - Run tests
   
   ### Phase 3: Key Components
   - API Routes: FastAPI
   - Database: PostgreSQL
   ```
6. If README not found or Learning Flow extraction fails:
   - Use generic template based on tech stack
   - Python: Setup → Usage → Modules
   - Node.js: Install → Scripts → Packages
   - Java: Build → Run → Structure
