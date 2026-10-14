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

# get_yaml_top_version <file> <key> — reads a top-level `key: value` (quotes optional).
# awk/tr rather than a sed group: BSD sed (macOS) has no `\?`.
get_yaml_top_version() {
    grep "^$2: " "$1" | head -1 | awk '{print $2}' | tr -d '"'
}

# bump_pre <version> [separator]
# separator selects the target pre-release style, independent of the input:
#   ""  -> PEP 440 (toml):        3.0.0b01
#   "-" -> npm/semver (package):  3.0.0-b01
# Accepts either style as input (3.0.0b01 or 3.0.0-b01).
bump_pre() {
    local version="$1" sep="${2:-}"
    if [[ "$version" =~ ^([0-9]+\.[0-9]+\.[0-9]+)-?b([0-9]+)$ ]]; then
        local base="${BASH_REMATCH[1]}"
        local pre="${BASH_REMATCH[2]}"
        printf "%s%sb%02d" "$base" "$sep" "$((10#$pre + 1))"
    else
        # Normal version: bump patch, then introduce b00
        local bumped
        bumped="$(bump_semver "$version" patch)"
        printf "%s%sb00" "$bumped" "$sep"
    fi
}

bump_semver() {
    local version="$1" type="$2"
    # Strip pre-release suffix (e.g. 2.0.13b01 or 3.1.0-b01 -> 3.1.0) before bumping
    local base_version="${version%%[-b]*}"
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

# Comparable key: major.minor.patch.pre — release (no pre) sorts above any pre of same base.
version_key() {
    local v="$1"
    if [[ "$v" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)-?b([0-9]+)$ ]]; then
        printf "%d.%d.%d.%d" \
            "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}" "$((10#${BASH_REMATCH[4]}))"
    elif [[ "$v" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
        printf "%d.%d.%d.%d" \
            "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}" 999999999
    else
        printf "0.0.0.0"
    fi
}

# highest_version <v1> [v2...] — picks the highest among args (Q2=B).
highest_version() {
    local best="" best_key="" v key
    for v in "$@"; do
        key="$(version_key "$v")"
        if [[ -z "$best" ]] \
            || [[ "$(printf '%s\n%s\n' "$best_key" "$key" | sort -t. -k1,1n -k2,2n -k3,3n -k4,4n | tail -1)" == "$key" ]]; then
            best="$v"
            best_key="$key"
        fi
    done
    printf "%s" "$best"
}

compute_new_version() {
    local current="$1" sep="${2:-}"
    if [[ "$bump_choice" == "4" ]]; then
        printf "%s" "$CUSTOM_VERSION"
    elif [[ "$bump_type" == "pre" ]]; then
        bump_pre "$current" "$sep"
    else
        bump_semver "$current" "$bump_type"
    fi
}

PLUGIN_MARKETPLACE_FILES=(
    "$ROOT/src/rosettify-plugins/plugins/template-claude/.claude-plugin/plugin.json"
    "$ROOT/src/rosettify-plugins/plugins/template-cursor/.cursor-plugin/plugin.json"
    "$ROOT/src/rosettify-plugins/plugins/template-copilot/.github/plugin/plugin.json"
    "$ROOT/src/rosettify-plugins/plugins/template-codex/.codex-plugin/plugin.json"
    "$ROOT/src/rosettify-plugins/plugins/template-antigravity/plugin.json"
    "$ROOT/.claude-plugin/marketplace.json"
    "$ROOT/.cursor-plugin/marketplace.json"
    "$ROOT/.github/plugin/marketplace.json"
    "$ROOT/.agents/plugins/marketplace.json"
)

bump_plugin_marketplace_group() {
    local f current currents=() highest target
    for f in "${PLUGIN_MARKETPLACE_FILES[@]}"; do
        currents+=("$(get_json_version "$f")")
    done
    highest="$(highest_version "${currents[@]}")"
    target="$(compute_new_version "$highest" "-")"

    echo "--- plugin.json + marketplace.json (identical version) ---"
    if ask_yn "Bump all ${#PLUGIN_MARKETPLACE_FILES[@]} files to $target  (from highest: $highest)?" "y"; then
        for f in "${PLUGIN_MARKETPLACE_FILES[@]}"; do
            current="$(get_json_version "$f")"
            sedi "s/\"version\": \"${current}\"/\"version\": \"${target}\"/g" "$f"
            echo -e "  ${GREEN}Updated${RESET} ${f#$ROOT/}  ($current → $target)"
        done
    else
        echo "  Skipped"
    fi
}

bump_file_toml() {
    local f="$1" default="$2"
    local current new_version rel
    current="$(get_toml_version "$f")"
    rel="${f#$ROOT/}"
    new_version="$(compute_new_version "$current")"
    if ask_yn "Bump $rel  ($current → $new_version)?" "$default"; then
        sedi "s/^version = \"${current}\"/version = \"${new_version}\"/" "$f"
        echo -e "  ${GREEN}Updated${RESET}"
    else
        echo "  Skipped"
    fi
}

bump_file_json() {
    local f="$1" default="$2"
    local current new_version rel
    current="$(get_json_version "$f")"
    rel="${f#$ROOT/}"
    new_version="$(compute_new_version "$current" "-")"
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
for f in "${PLUGIN_MARKETPLACE_FILES[@]}"; do
    if [[ "$f" == *marketplace.json ]]; then
        printf "  %-55s %s\n" "[marketplace] ${f#$ROOT/}" "$(get_json_version "$f")"
    else
        printf "  %-55s %s\n" "[plugin.json] ${f#$ROOT/}" "$(get_json_version "$f")"
    fi
done
for f in \
    "$ROOT/src/rosetta-cli/pyproject.toml" \
    "$ROOT/src/rosetta-mcp-server/pyproject.toml" \
    "$ROOT/src/ims-mcp-server/pyproject.toml"; do
    printf "  %-55s %s\n" "[toml]        ${f#$ROOT/}" "$(get_toml_version "$f")"
done
printf "  %-55s %s\n" "[package.json] src/rosettify/package.json" "$(get_json_version "$ROOT/src/rosettify/package.json")"
printf "  %-55s %s\n" "[package.json] src/rosettify-plugins/package.json" "$(get_json_version "$ROOT/src/rosettify-plugins/package.json")"
printf "  %-55s %s\n" "[package.json] src/rosettify-prompts/package.json" "$(get_json_version "$ROOT/src/rosettify-prompts/package.json")"
printf "  %-55s %s\n" "[package.json] src/curiocity/package.json" "$(get_json_version "$ROOT/src/curiocity/package.json")"
printf "  %-55s %s\n" "[chart]       src/helm-charts/rosetta-mcp-server/Chart.yaml" \
    "$(get_yaml_top_version "$ROOT/src/helm-charts/rosetta-mcp-server/Chart.yaml" version) (appVersion $(get_yaml_top_version "$ROOT/src/helm-charts/rosetta-mcp-server/Chart.yaml" appVersion))"

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

bump_plugin_marketplace_group

echo ""
echo "--- pyproject.toml files ---"
bump_file_toml "$ROOT/src/rosetta-cli/pyproject.toml"        "n"
bump_file_toml "$ROOT/src/rosetta-mcp-server/pyproject.toml" "n"

# ims-mcp-server: bump version + sync rosetta-mcp dependency to match rosetta-mcp-server
ROSETTA_VERSION="$(get_toml_version "$ROOT/src/rosetta-mcp-server/pyproject.toml")"
f="$ROOT/src/ims-mcp-server/pyproject.toml"
current="$(get_toml_version "$f")"
rel="${f#$ROOT/}"
new_version="$(compute_new_version "$current")"
if ask_yn "Bump $rel  ($current → $new_version, rosetta-mcp → $ROSETTA_VERSION)?" "n"; then
    sedi "s/^version = \"${current}\"/version = \"${new_version}\"/" "$f"
    old_rosetta="$(grep 'rosetta-mcp==' "$f" | sed 's/.*rosetta-mcp==\([^"]*\)".*/\1/')"
    sedi "s/\"rosetta-mcp==${old_rosetta}\"/\"rosetta-mcp==${ROSETTA_VERSION}\"/" "$f"
    echo -e "  ${GREEN}Updated${RESET}"
else
    echo "  Skipped"
fi

echo ""
echo "--- src/helm-charts/rosetta-mcp-server/Chart.yaml ---"
# Helm chart: bump chart `version` + sync `appVersion` to rosetta-mcp-server.
# values.yaml leaves image.tag commented out and deployment.yaml defaults it to
# .Chart.AppVersion, so appVersion MUST track the server version or a default
# `helm install` pulls a stale image. The chart `version` must move in the same
# commit: publish-mcp-helm-chart.yml pushes whatever `version:` says with no
# version-exists guard, so reusing it overwrites the published chart in place.
# Chart versions are SemVer 2, so pre-releases use the "-" separator (0.4.3-b00).
f="$ROOT/src/helm-charts/rosetta-mcp-server/Chart.yaml"
current="$(get_yaml_top_version "$f" version)"
current_app="$(get_yaml_top_version "$f" appVersion)"
rel="${f#$ROOT/}"
new_version="$(compute_new_version "$current" "-")"
if ask_yn "Bump $rel  ($current → $new_version, appVersion $current_app → $ROSETTA_VERSION)?" "n"; then
    sedi "s/^version: ${current}$/version: ${new_version}/" "$f"
    sedi "s/^appVersion: \"${current_app}\"$/appVersion: \"${ROSETTA_VERSION}\"/" "$f"
    echo -e "  ${GREEN}Updated${RESET}"
else
    echo "  Skipped"
fi

echo ""
echo "--- src/rosettify/package.json ---"
bump_file_json "$ROOT/src/rosettify/package.json" "n"

echo ""
echo "--- src/rosettify-plugins/package.json ---"
bump_file_json "$ROOT/src/rosettify-plugins/package.json" "n"

echo ""
echo "--- src/rosettify-prompts/package.json ---"
bump_file_json "$ROOT/src/rosettify-prompts/package.json" "n"

echo ""
echo "--- src/curiocity/package.json ---"
bump_file_json "$ROOT/src/curiocity/package.json" "n"

echo ""
echo -e "${GREEN}Done!${RESET}"
echo ""
