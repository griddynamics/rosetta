#!/bin/bash

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Rosetta Test Validation ===${NC}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PYTEST_BIN="$SCRIPT_DIR/venv/bin/pytest"

# Resolve pytest runner: repo venv only (tests need project deps; uvx/system pytest won't have them)
if [ -x "$PYTEST_BIN" ]; then
    PYTEST_CMD=("$PYTEST_BIN")
else
    echo -e "${YELLOW}WARNING: repo venv not found. Skipping Python tests.${NC}"
    echo -e "${YELLOW}To enable: python3 -m venv venv && pip install -r requirements.txt${NC}"
    PYTEST_CMD=()
fi

if [ ${#PYTEST_CMD[@]} -gt 0 ]; then
    echo -e "${BLUE}Running ims-mcp-server tests...${NC}"
    PYTHONPATH="src/ims-mcp-server${PYTHONPATH:+:$PYTHONPATH}" \
        "${PYTEST_CMD[@]}" --no-header -qq --tb=short -o console_output_style=classic src/ims-mcp-server/tests

    echo -e "${BLUE}Running rosetta-cli tests...${NC}"
    PYTHONPATH="src/rosetta-cli${PYTHONPATH:+:$PYTHONPATH}" \
        "${PYTEST_CMD[@]}" --no-header -qq --tb=short -o console_output_style=classic src/rosetta-cli/tests

fi

if [ -d "$SCRIPT_DIR/src/rosettify/node_modules" ]; then
    echo -e "${BLUE}Running rosettify tests...${NC}"
    npm --silent run build --prefix src/rosettify
    npm --silent --prefix "$SCRIPT_DIR/src/rosettify" run test -- --reporter=minimal
else
    echo -e "${YELLOW}WARNING: src/rosettify/node_modules not found. Skipping rosettify tests.${NC}"
    echo -e "${YELLOW}To enable: npm --prefix src/rosettify install${NC}"
fi

if [ -d "$SCRIPT_DIR/src/hooks/node_modules" ]; then
    echo -e "${BLUE}Running hooks tests...${NC}"
    npm --silent --prefix "$SCRIPT_DIR/src/hooks" run test -- --reporter=minimal
else
    echo -e "${YELLOW}WARNING: src/hooks/node_modules not found. Skipping hooks tests.${NC}"
    echo -e "${YELLOW}To enable: npm --prefix src/hooks install${NC}"
fi

echo -e "${GREEN}Test validation passed${NC}"
