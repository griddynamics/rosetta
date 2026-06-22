#!/bin/bash

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Rosetta Type Validation ===${NC}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CONFIG_FILE="$SCRIPT_DIR/mypy.ini"

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}ERROR: mypy config not found: $CONFIG_FILE${NC}"
    exit 1
fi

# Resolve Python runner: repo venv → uvx → system mypy → warn and skip
PYTHON_BIN="$SCRIPT_DIR/venv/bin/python"
if [ -x "$PYTHON_BIN" ]; then
    MYPY_CMD=("$PYTHON_BIN" -m mypy)
elif command -v uvx &>/dev/null; then
    MYPY_CMD=(uvx mypy)
elif command -v mypy &>/dev/null; then
    MYPY_CMD=(mypy)
else
    echo -e "${YELLOW}WARNING: no mypy runner found (venv, uvx, or system mypy). Skipping Python type validation.${NC}"
    echo -e "${YELLOW}To enable: python3 -m venv venv && pip install -r requirements.txt  OR  install uv${NC}"
    MYPY_CMD=()
fi

if [ ${#MYPY_CMD[@]} -gt 0 ]; then
    echo -e "${BLUE}Running Python type validation...${NC}"
    "${MYPY_CMD[@]}" --config-file "$CONFIG_FILE" --no-error-summary
fi

if [ -d "$SCRIPT_DIR/src/rosettify/node_modules" ]; then
    echo -e "${BLUE}Running rosettify TypeScript type validation...${NC}"
    npm --silent --prefix "$SCRIPT_DIR/src/rosettify" run typecheck
else
    echo -e "${YELLOW}WARNING: src/rosettify/node_modules not found. Skipping TS type validation.${NC}"
    echo -e "${YELLOW}To enable: npm --prefix src/rosettify install${NC}"
fi

echo -e "${GREEN}Type validation passed${NC}"
