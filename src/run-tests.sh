#!/bin/bash

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Rosetta Test Validation ===${NC}"

# Quiet the packages' structured (pino) loggers to warnings+errors only, so runs
# surface real problems without the info-level flood. Both default to 'warn' and
# stay overridable from the caller's environment.
export ROSETTIFY_PLUGINS_LOG_LEVEL="${ROSETTIFY_PLUGINS_LOG_LEVEL:-warn}"
export CURIOCITY_LOG_LEVEL="${CURIOCITY_LOG_LEVEL:-warn}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$REPO_ROOT"
PYTEST_BIN="$REPO_ROOT/venv/bin/pytest"

# Resolve pytest runner: repo venv only (tests need project deps; uvx/system pytest won't have them)
if [ -x "$PYTEST_BIN" ]; then
    PYTEST_CMD=("$PYTEST_BIN")
else
    echo -e "${YELLOW}WARNING: repo venv not found. Skipping Python tests.${NC}"
    echo -e "${YELLOW}To enable: python3 -m venv venv && pip install -r requirements.txt${NC}"
    PYTEST_CMD=()
fi

if [ ${#PYTEST_CMD[@]} -gt 0 ]; then
    echo -e "${BLUE}Running rosetta-mcp-server tests...${NC}"
    PYTHONPATH="src/rosetta-mcp-server${PYTHONPATH:+:$PYTHONPATH}" \
        "${PYTEST_CMD[@]}" --no-header -qq --tb=short -o console_output_style=classic src/rosetta-mcp-server/tests

    echo -e "${BLUE}Running rosetta-cli tests...${NC}"
    PYTHONPATH="src/rosetta-cli${PYTHONPATH:+:$PYTHONPATH}" \
        "${PYTEST_CMD[@]}" --no-header -qq --tb=short -o console_output_style=classic src/rosetta-cli/tests

fi

test_ts() {  # $1 = path under repo root, $2 = "build" to build first
    local dir="$REPO_ROOT/$1" name; name="$(basename "$1")"
    if [ -d "$dir/node_modules" ]; then
        echo -e "${BLUE}Running $name tests...${NC}"
        [ "${2:-}" = "build" ] && npm --silent --prefix "$dir" run build
        npm --silent --prefix "$dir" run test -- --reporter=minimal
    else
        echo -e "${YELLOW}WARNING: $1/node_modules not found. Skipping $name tests (npm --prefix $1 install).${NC}"
    fi
}

test_ts src/curiocity
test_ts src/hooks
test_ts src/rosettify          build
test_ts src/rosettify-plugins
test_ts src/rosettify-prompts

echo -e "${GREEN}Test validation passed${NC}"
