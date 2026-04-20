#!/bin/bash

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Rosetta Test Validation ===${NC}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PYTEST_BIN="$SCRIPT_DIR/venv/bin/pytest"

if [ ! -x "$PYTEST_BIN" ]; then
    echo -e "${RED}ERROR: pytest not found: $PYTEST_BIN${NC}"
    exit 1
fi

echo -e "${BLUE}Running ims-mcp-server tests...${NC}"
PYTHONPATH="ims-mcp-server${PYTHONPATH:+:$PYTHONPATH}" \
    "$PYTEST_BIN" ims-mcp-server/tests

echo -e "${BLUE}Running rosetta-cli tests...${NC}"
PYTHONPATH="rosetta-cli${PYTHONPATH:+:$PYTHONPATH}" \
    "$PYTEST_BIN" rosetta-cli/tests

echo -e "${BLUE}Running rosettify tests...${NC}"
npm run build --prefix rosettify
npm --prefix "$SCRIPT_DIR/rosettify" run test

echo -e "${GREEN}Test validation passed${NC}"
