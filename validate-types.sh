#!/bin/bash

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Rosetta Type Validation ===${NC}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CONFIG_FILE="$SCRIPT_DIR/mypy.ini"
PYTHON_BIN="$SCRIPT_DIR/venv/bin/python"

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}ERROR: mypy config not found: $CONFIG_FILE${NC}"
    exit 1
fi

if [ ! -x "$PYTHON_BIN" ]; then
    echo -e "${RED}ERROR: repo venv python not found: $PYTHON_BIN${NC}"
    exit 1
fi

echo -e "${BLUE}Running Python type validation...${NC}"
"$PYTHON_BIN" -m mypy --config-file "$CONFIG_FILE"

echo -e "${BLUE}Running rosettify TypeScript type validation...${NC}"
npm --prefix "$SCRIPT_DIR/rosettify" run typecheck

echo -e "${GREEN}Type validation passed${NC}"
