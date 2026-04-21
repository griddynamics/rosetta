#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RESET='\033[0m'

if [[ "$OSTYPE" == "darwin"* ]]; then
    sedi() { sed -i '' "$@"; }
else
    sedi() { sed -i "$@"; }
fi

get_toml_version() {
    grep '^version = ' "$1" | head -1 | sed 's/version = "\(.*\)"/\1/'
}

get_json_version() {
    grep '"version"' "$1" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'
}

bump_pre() {
    local version="$1"
    if [[ "$version" =~ ^([0-9]+\.[0-9]+\.[0-9]+)b([0-9]+)$ ]]; then
        local base="${BASH_REMATCH[1]}"
        local pre="${BASH_REMATCH[2]}"
        printf "%sb%02d" "$base" "$((10#$pre + 1))"
    else
        # Normal version: bump patch, then introduce b00
        local bumped
        bumped="$(bump_semver "$version" patch)"
        echo "${bumped}b00"
    fi
}

bump_semver() {
    local version="$1" type="$2"
    # Strip pre-release suffix (e.g. 2.0.13b01 -> 2.0.13) before bumping
    local base_version="${version%%b*}"
    IFS='.' read -r major minor patch <<< "$base_version"
    case "$type" in
        major) echo "$((major + 1)).0.0" ;;
        minor) echo "${major}.$((minor + 1)).0" ;;
        patch) echo "${major}.${minor}.$((patch + 1))" ;;
    esac
}

ask_yn() {
    local prompt="$1" default="$2" answer
    if [[ "$default" == "y" ]]; then
        read -r -p "  $prompt [Y/n]: " answer
        answer="${answer:-y}"
    else
        read -r -p "  $prompt [y/N]: " answer
        answer="${answer:-n}"
    fi
    [[ "$answer" =~ ^[Yy]$ ]]
}

bump_file_toml() {
    local f="$1" default="$2"
    local current new_version rel
    current="$(get_toml_version "$f")"
    rel="${f#$ROOT/}"
    if [[ "$bump_choice" == "4" ]]; then
        new_version="$CUSTOM_VERSION"
    elif [[ "$bump_type" == "pre" ]]; then
        new_version="$(bump_pre "$current")"
    else
        new_version="$(bump_semver "$current" "$bump_type")"
    fi
    if ask_yn "Bump $rel  ($current → $new_version)?" "$default"; then
        sedi "s/^version = \"${current}\"/version = \"${new_version}\"/" "$f"
        echo -e "  ${GREEN}Updated${RESET}"
    else
        echo "  Skipped"
    fi
}

bump_file_json() {
    local f="$1" default="$2"
    local current new_version rel effective_type
    current="$(get_json_version "$f")"
    rel="${f#$ROOT/}"
    # JSON files don't support pre-release; fall back to patch
    effective_type="${bump_type/pre/patch}"
    if [[ "$bump_choice" == "4" ]]; then
        new_version="$CUSTOM_VERSION"
    else
        new_version="$(bump_semver "$current" "$effective_type")"
    fi
    if ask_yn "Bump $rel  ($current → $new_version)?" "$default"; then
        sedi "s/\"version\": \"${current}\"/\"version\": \"${new_version}\"/g" "$f"
        echo -e "  ${GREEN}Updated${RESET}"
    else
        echo "  Skipped"
    fi
}

echo ""
echo -e "${CYAN}=== Rosetta Version Bumper ===${RESET}"
echo ""
echo "Current versions:"
for f in \
    "$ROOT/rosetta-cli/pyproject.toml" \
    "$ROOT/ims-mcp-server/pyproject.toml" \
    "$ROOT/rosetta-mcp-server/pyproject.toml"; do
    printf "  %-55s %s\n" "[toml]        ${f#$ROOT/}" "$(get_toml_version "$f")"
done
printf "  %-55s %s\n" "[package.json] rosettify/package.json" "$(get_json_version "$ROOT/rosettify/package.json")"
for f in \
    "$ROOT/plugins/core-claude/.claude-plugin/plugin.json" \
    "$ROOT/plugins/core-cursor/.cursor-plugin/plugin.json" \
    "$ROOT/plugins/core-copilot/.github/plugin/plugin.json" \
    "$ROOT/plugins/core-codex/.codex-plugin/plugin.json" \
    "$ROOT/plugins/rosetta/.claude-plugin/plugin.json" \
    "$ROOT/plugins/rosetta/.cursor-plugin/plugin.json"; do
    printf "  %-55s %s\n" "[plugin.json] ${f#$ROOT/}" "$(get_json_version "$f")"
done
for f in \
    "$ROOT/.claude-plugin/marketplace.json" \
    "$ROOT/.cursor-plugin/marketplace.json" \
    "$ROOT/.github/plugin/marketplace.json"; do
    printf "  %-55s %s\n" "[marketplace] ${f#$ROOT/}" "$(get_json_version "$f")"
done

echo ""
echo "Bump type:"
echo "  [0] pre   [1] patch   [2] minor   [3] major   [4] custom"
read -r -p "Choose (default: 0 = pre): " bump_choice
bump_choice="${bump_choice:-0}"

CUSTOM_VERSION=""
case "$bump_choice" in
    0) bump_type="pre" ;;
    1) bump_type="patch" ;;
    2) bump_type="minor" ;;
    3) bump_type="major" ;;
    4)
        bump_type="custom"
        read -r -p "Enter new version (e.g. 2.1.0): " CUSTOM_VERSION
        if [[ ! "$CUSTOM_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "Invalid semver format. Expected X.Y.Z"
            exit 1
        fi
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""

echo "--- pyproject.toml files ---"
bump_file_toml "$ROOT/rosetta-cli/pyproject.toml"    "n"
bump_file_toml "$ROOT/ims-mcp-server/pyproject.toml" "y"

# rosetta-mcp-server: bump version + sync ims-mcp dependency to match ims-mcp-server
IMS_VERSION="$(get_toml_version "$ROOT/ims-mcp-server/pyproject.toml")"
f="$ROOT/rosetta-mcp-server/pyproject.toml"
current="$(get_toml_version "$f")"
rel="${f#$ROOT/}"
if [[ "$bump_choice" == "4" ]]; then
    new_version="$CUSTOM_VERSION"
elif [[ "$bump_type" == "pre" ]]; then
    new_version="$(bump_pre "$current")"
else
    new_version="$(bump_semver "$current" "$bump_type")"
fi
if ask_yn "Bump $rel  ($current → $new_version, ims-mcp → $IMS_VERSION)?" "y"; then
    sedi "s/^version = \"${current}\"/version = \"${new_version}\"/" "$f"
    old_ims="$(grep 'ims-mcp==' "$f" | sed 's/.*ims-mcp==\([^"]*\)".*/\1/')"
    sedi "s/\"ims-mcp==${old_ims}\"/\"ims-mcp==${IMS_VERSION}\"/" "$f"
    echo -e "  ${GREEN}Updated${RESET}"
else
    echo "  Skipped"
fi

echo ""
echo "--- rosettify/package.json ---"
bump_file_json "$ROOT/rosettify/package.json" "y"

echo ""
echo "--- plugin.json files ---"
bump_file_json "$ROOT/plugins/core-claude/.claude-plugin/plugin.json"  "y"
bump_file_json "$ROOT/plugins/core-cursor/.cursor-plugin/plugin.json"  "y"
bump_file_json "$ROOT/plugins/core-copilot/.github/plugin/plugin.json" "y"
bump_file_json "$ROOT/plugins/core-codex/.codex-plugin/plugin.json"    "y"
bump_file_json "$ROOT/plugins/rosetta/.claude-plugin/plugin.json"      "n"
bump_file_json "$ROOT/plugins/rosetta/.cursor-plugin/plugin.json"      "n"

echo ""
echo "--- marketplace.json files (default: N) ---"
bump_file_json "$ROOT/.claude-plugin/marketplace.json" "n"
bump_file_json "$ROOT/.cursor-plugin/marketplace.json" "n"
bump_file_json "$ROOT/.github/plugin/marketplace.json" "n"

echo ""
echo -e "${GREEN}Done!${RESET}"
echo ""
