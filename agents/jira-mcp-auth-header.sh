#!/usr/bin/env bash
# headersHelper for .mcp.json's "jira-service-account" server.
# Emits {"Authorization": "Bearer <key>"} to stdout.
# Local run: key comes from the untracked sibling secrets file.
# CI run: set JIRA_API_TOKEN as a CI secret (the name tools-harness-intake uses);
# this script picks it up with no change to .mcp.json or this script's callers.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_FILE="$SCRIPT_DIR/jira-triage.secrets.json"

if [ -n "${JIRA_API_TOKEN:-}" ]; then
  API_KEY="$JIRA_API_TOKEN"
elif [ -f "$SECRETS_FILE" ]; then
  API_KEY="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['jira_service_account']['api_key'])" "$SECRETS_FILE")"
else
  echo "jira-mcp-auth-header.sh: no JIRA_API_TOKEN env var and no $SECRETS_FILE found" >&2
  exit 1
fi

printf '{"Authorization": "Bearer %s"}\n' "$API_KEY"
