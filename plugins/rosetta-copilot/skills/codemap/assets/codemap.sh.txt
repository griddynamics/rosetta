#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# codemap.sh — Generate CODEMAP.md for every git repo under a workspace root.
#
# Usage:
#   ./codemap.sh [WORKSPACE_ROOT] [MAX_DEPTH]
#
#   WORKSPACE_ROOT  Directory to scan (default: current directory)
#   MAX_DEPTH       How many directory levels to recurse (default: 4)
#
# Output:  CODEMAP.md in WORKSPACE_ROOT
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

WORKSPACE="${1:-.}"
WORKSPACE="$(cd "$WORKSPACE" && pwd)"
MAX_DEPTH="${2:-4}"
OUTFILE="$WORKSPACE/CODEMAP.md"

# ── Recognised extensions (source, assets, docs) ────────────────────────────
# Add or remove extensions to match your stack.
SOURCE_EXT="ts tsx js jsx mjs cjs vue svelte astro py pyx pyi rb erb rs go java kt kts scala groovy cs fs swift m mm c h cpp hpp cc hh zig asm s S pl pm lua r R jl ex exs erl hrl clj cljs cljc hs lhs elm dart php"
CONFIG_EXT="json jsonc json5 yaml yml toml ini cfg conf env properties plist xml xsl xslt graphql gql proto thrift tf tfvars hcl nix flake"
DOC_EXT="md mdx rst txt adoc org tex bib"
STYLE_EXT="css scss sass less styl pcss"
TEMPLATE_EXT="html htm ejs hbs pug njk liquid jinja jinja2 j2 mustache twig blade"
DATA_EXT="csv tsv sql prisma"
ASSET_EXT="svg png jpg jpeg gif webp ico bmp tiff avif mp3 wav ogg mp4 webm woff woff2 ttf otf eot"
SCRIPT_EXT="sh bash zsh fish ps1 psm1 bat cmd"
CI_EXT="Dockerfile Containerfile Makefile Justfile Rakefile Gemfile Procfile Vagrantfile"

# Build a single |-delimited regex from all extensions
ALL_EXT="$SOURCE_EXT $CONFIG_EXT $DOC_EXT $STYLE_EXT $TEMPLATE_EXT $DATA_EXT $ASSET_EXT $SCRIPT_EXT"
EXT_PATTERN="$(echo "$ALL_EXT" | tr ' ' '\n' | sort -u | paste -sd'|' -)"

# Exact filenames to always include (no extension match needed)
EXACT_NAMES="Dockerfile Containerfile Makefile Justfile Rakefile Gemfile Procfile Vagrantfile Caddyfile CMakeLists.txt SConstruct SConscript BUILD WORKSPACE go.mod go.sum Cargo.toml Cargo.lock package.json package-lock.json yarn.lock pnpm-lock.yaml bun.lockb composer.json composer.lock Pipfile Pipfile.lock pyproject.toml setup.py setup.cfg requirements.txt .editorconfig .prettierrc .eslintrc .stylelintrc .babelrc tsconfig.json vite.config.ts webpack.config.js rollup.config.js next.config.js nuxt.config.ts tailwind.config.js postcss.config.js jest.config.ts vitest.config.ts"

# ── Helpers ───────────────────────────────────────────────────────────────────

matches_extensions() {
  # Return 0 if filename matches a tracked extension or exact name
  local file="$1"
  local base
  base="$(basename "$file")"
  local ext="${base##*.}"

  # Exact-name match (extensionless special files)
  for name in $EXACT_NAMES; do
    [[ "$base" == "$name" ]] && return 0
  done

  # Dotfiles that are configs (e.g. .gitignore, .env)
  [[ "$base" == .env* ]] && return 0
  [[ "$base" == .gitignore ]] && return 0
  [[ "$base" == .gitattributes ]] && return 0
  [[ "$base" == .dockerignore ]] && return 0

  # Extension match
  echo "$ext" | grep -qiE "^($EXT_PATTERN)$" && return 0

  return 1
}

describe_dir() {
  # Produce a short ≤10-word description based on directory name / contents
  local dir_name="$1"
  local files="$2"   # newline-separated list of relative file paths in dir

  case "$dir_name" in
    src|lib|core)         echo "Primary application source code" ;;
    app)                  echo "Application entry and route definitions" ;;
    pages|routes)         echo "Page-level route components" ;;
    components|comps)     echo "Reusable UI components" ;;
    hooks)                echo "Custom React or framework hooks" ;;
    utils|helpers|util)   echo "Shared utility and helper functions" ;;
    services|service)     echo "External service integrations and API clients" ;;
    api)                  echo "API route handlers and endpoints" ;;
    models|model|entities) echo "Data models and entity definitions" ;;
    types|typings)        echo "Type declarations and interfaces" ;;
    config|cfg|conf)      echo "Configuration files and constants" ;;
    public|static|assets) echo "Static assets served directly" ;;
    styles|css)           echo "Stylesheets and design tokens" ;;
    images|img|icons)     echo "Image and icon assets" ;;
    fonts)                echo "Font files" ;;
    tests|test|__tests__|spec|specs) echo "Test suites and fixtures" ;;
    e2e|cypress|playwright) echo "End-to-end test definitions" ;;
    docs|doc|documentation) echo "Project documentation" ;;
    scripts|bin|tools)    echo "Build, deploy, and maintenance scripts" ;;
    migrations|migrate)   echo "Database migration files" ;;
    seeds|seeders|fixtures) echo "Seed data and test fixtures" ;;
    middleware|middlewares) echo "Request middleware handlers" ;;
    controllers|controller) echo "Request controllers and handlers" ;;
    views|templates)      echo "Server-rendered view templates" ;;
    layouts|layout)       echo "Page layout components" ;;
    store|stores|state)   echo "State management modules" ;;
    actions|reducers|slices) echo "State actions and reducers" ;;
    context|contexts)     echo "Context providers and consumers" ;;
    i18n|locales|lang|translations) echo "Internationalization and locale files" ;;
    prisma)               echo "Prisma schema and migrations" ;;
    graphql|gql)          echo "GraphQL schema and resolvers" ;;
    proto|protos)         echo "Protocol buffer definitions" ;;
    .github)              echo "GitHub workflows and repo configuration" ;;
    .vscode)              echo "VS Code workspace settings" ;;
    docker|containers)    echo "Container definitions and compose files" ;;
    infra|infrastructure|deploy|deployment) echo "Infrastructure and deployment configuration" ;;
    ci|.circleci)         echo "CI pipeline configuration" ;;
    packages|modules)     echo "Monorepo workspace packages" ;;
    *)
      # Fallback: infer from dominant file types
      if echo "$files" | grep -qiE '\.(test|spec)\.(ts|tsx|js|jsx|py|rb)$'; then
        echo "Tests and specs"
      elif echo "$files" | grep -qiE '\.(css|scss|sass|less)$'; then
        echo "Stylesheets"
      elif echo "$files" | grep -qiE '\.(svg|png|jpg|jpeg|gif|webp)$'; then
        echo "Image assets"
      elif echo "$files" | grep -qiE '\.(md|mdx|rst|txt|adoc)$'; then
        echo "Documentation files"
      elif echo "$files" | grep -qiE '\.(sql|prisma)$'; then
        echo "Database schemas and queries"
      elif echo "$files" | grep -qiE '\.(proto|thrift|graphql|gql)$'; then
        echo "Interface and schema definitions"
      elif echo "$files" | grep -qiE '\.(yaml|yml|toml|json)$'; then
        echo "Configuration and data files"
      else
        echo "Project files"
      fi
      ;;
  esac
}

# ── Core: process one directory inside a git repo ────────────────────────────

process_directory() {
  local repo_root="$1"     # absolute path to git repo root
  local rel_dir="$2"       # path relative to repo root (empty string = root)
  local depth="$3"         # current nesting depth (1-based)
  local ws_rel_repo="$4"   # repo path relative to workspace
  local tracked_files="$5" # newline-separated list of ALL tracked files in repo

  if (( depth > MAX_DEPTH )); then
    return
  fi

  # ── Gather immediate children of $rel_dir from tracked files ──────────
  local children_files="" children_dirs=""

  if [[ -z "$rel_dir" ]]; then
    # Repo root: first path component
    children_files="$(echo "$tracked_files" | grep -v '/' || true)"
    children_dirs="$(echo "$tracked_files" | grep '/' | cut -d'/' -f1 | sort -u || true)"
  else
    # Sub-directory: files matching rel_dir/X (no further slash)
    children_files="$(echo "$tracked_files" | grep "^${rel_dir}/" | sed "s|^${rel_dir}/||" | grep -v '/' || true)"
    children_dirs="$(echo "$tracked_files" | grep "^${rel_dir}/" | sed "s|^${rel_dir}/||" | grep '/' | cut -d'/' -f1 | sort -u || true)"
  fi

  # Filter children files to recognised extensions
  local filtered_files=""
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if matches_extensions "$f"; then
      filtered_files+="$f"$'\n'
    fi
  done <<< "$children_files"
  filtered_files="$(echo "$filtered_files" | sed '/^$/d')"

  # Count recursive files under this directory for the header
  local recursive_count=0
  if [[ -z "$rel_dir" ]]; then
    recursive_count="$(echo "$tracked_files" | grep -c '.' || echo 0)"
  else
    recursive_count="$(echo "$tracked_files" | grep -c "^${rel_dir}/" || echo 0)"
  fi

  # ── Build display path relative to workspace ──────────────────────────
  local display_path
  if [[ -z "$rel_dir" ]]; then
    display_path="$ws_rel_repo"
  else
    display_path="$ws_rel_repo/$rel_dir"
  fi

  # Markdown heading level
  local hashes=""
  for (( i=0; i<depth; i++ )); do hashes+="#"; done

  local dir_basename
  dir_basename="$(basename "${rel_dir:-.}")"
  [[ "$rel_dir" == "" ]] && dir_basename="$(basename "$ws_rel_repo")"

  local all_sub_files=""
  if [[ -z "$rel_dir" ]]; then
    all_sub_files="$tracked_files"
  else
    all_sub_files="$(echo "$tracked_files" | grep "^${rel_dir}/" || true)"
  fi
  local description
  description="$(describe_dir "$dir_basename" "$all_sub_files")"

  # ── Write header ──────────────────────────────────────────────────────
  echo "" >> "$OUTFILE"
  echo "$hashes $display_path ($recursive_count files) — $description" >> "$OUTFILE"
  echo "" >> "$OUTFILE"

  # ── List immediate children files ─────────────────────────────────────
  if [[ -n "$filtered_files" ]]; then
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      echo "- $f" >> "$OUTFILE"
    done <<< "$filtered_files"
    echo "" >> "$OUTFILE"
  fi

  # ── Recurse into child directories ────────────────────────────────────
  while IFS= read -r d; do
    [[ -z "$d" ]] && continue
    local child_rel
    if [[ -z "$rel_dir" ]]; then
      child_rel="$d"
    else
      child_rel="$rel_dir/$d"
    fi
    process_directory "$repo_root" "$child_rel" $((depth + 1)) "$ws_rel_repo" "$tracked_files"
  done <<< "$children_dirs"
}

# ── Main ─────────────────────────────────────────────────────────────────────

echo "Scanning workspace: $WORKSPACE (depth: $MAX_DEPTH)"

# Write header
cat > "$OUTFILE" << 'EOF'
# CODEMAP

> Auto-generated source map. Do not edit manually.
> Regenerate with `./codemap.sh`
EOF

# Find all git repositories (look for .git directories up to MAX_DEPTH levels)
find "$WORKSPACE" -maxdepth "$MAX_DEPTH" -name ".git" -type d 2>/dev/null | sort | while IFS= read -r gitdir; do
  repo_root="$(dirname "$gitdir")"
  ws_rel="$(python3 -c "import os; print(os.path.relpath('$repo_root', '$WORKSPACE'))" 2>/dev/null || echo "${repo_root#$WORKSPACE/}")"

  # Normalise "." for workspace-root repo
  [[ "$ws_rel" == "." ]] && ws_rel="$(basename "$WORKSPACE")"

  echo "  → repo: $ws_rel"

  # Get tracked files via git ls-files (respects .gitignore)
  tracked="$(cd "$repo_root" && git ls-files --cached --others --exclude-standard 2>/dev/null || true)"

  if [[ -z "$tracked" ]]; then
    echo "" >> "$OUTFILE"
    echo "## $ws_rel (0 files) — Empty or uninitialized repository" >> "$OUTFILE"
    continue
  fi

  # Filter to recognised extensions only (entire list, used for counting)
  filtered_tracked=""
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if matches_extensions "$f"; then
      filtered_tracked+="$f"$'\n'
    fi
  done <<< "$tracked"
  filtered_tracked="$(echo "$filtered_tracked" | sed '/^$/d')"

  [[ -z "$filtered_tracked" ]] && continue

  process_directory "$repo_root" "" 1 "$ws_rel" "$filtered_tracked"
done

echo ""
echo "Done → $OUTFILE"
