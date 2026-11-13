#!/usr/bin/env bash
# Rosetta, small task, Claude Code: one run with a chosen entry command.
#
#   rosetta-small.sh prepare            # reset the stand, run folder, isolation check, T0 prompt to the clipboard
#   rosetta-small.sh agent              # start the agent (terminal 1)
#   rosetta-small.sh save <T1>          # after /exit: copy run-output, tokens.md, workspace files
#
# Env (optional):
#   ENTRY   entry command in the T0 message (default: /rosetta:coding)
#   RUN_ID  report run_id (default: S-CC-08)
#   FOLDER  run folder name under runs/small-storage-conditions/claude-code/ (default: rosetta-skill)
#   METHOD  report method (default: rosetta-skill)
set -euo pipefail

SB="$(cd "$(dirname "$0")/.." && pwd)"
B="$SB/scripts/bench.sh"
BENCH_DIR="$HOME/saleor-benchmark"
ENV_DIR="$BENCH_DIR/envs/rosetta"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude"
ENTRY="${ENTRY:-/rosetta:coding}"
RUN_ID="${RUN_ID:-S-CC-08}"
FOLDER="${FOLDER:-rosetta-skill}"
METHOD="${METHOD:-rosetta-skill}"
RUN="$SB/runs/small-storage-conditions/claude-code/$FOLDER"
REPOS="saleor saleor-dashboard react-storefront"

die() { echo "ERROR: $*" >&2; exit 1; }

check_env() {
  [ "$(claude --version 2>/dev/null | cut -d' ' -f1)" = "2.1.305" ] || die "claude 2.1.305 needed (nvm use 24)"
  [ -f "$CLAUDE_CONFIG_DIR/settings.json" ] || die "no $CLAUDE_CONFIG_DIR/settings.json: run methods/rosetta.md part 1 first"
  claude plugin list 2>/dev/null | grep -q 'rosetta@rosetta' || die "rosetta@rosetta not installed in $CLAUDE_CONFIG_DIR"
}

prompt() {
  printf '%s' "$ENTRY Products need a \"storage conditions\" field (e.g. \"Keep refrigerated at 2–8 °C\").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally."
}

prepare() {
  check_env
  for r in $REPOS; do git -C "$BENCH_DIR/$r" tag -f rosetta-v1 baseline-v1 >/dev/null; done
  "$B" reset rosetta-v1
  "$B" start
  sleep 60
  "$B" health
  rm -rf "$CLAUDE_CONFIG_DIR"/projects/*saleor-benchmark* "$BENCH_DIR/run-output"
  extra="$(ls -A "$BENCH_DIR" | grep -v -x -E 'saleor|saleor-dashboard|react-storefront|seed.dump|logs|envs' || true)"
  [ -z "$extra" ] || die "workspace root has leftovers, remove them first: $extra"
  rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-small.md" "$RUN/report.md"
  sed -i '' -e "s|^run_id:.*|run_id: $RUN_ID|" -e "s|^method:.*|method: $METHOD|" -e 's|^runner:.*|runner: claude-code|' \
    -e 's|^model:.*|model: claude-sonnet-5-5|' -e 's|^start_tag:.*|start_tag: rosetta-v1|' -e 's|^setup_mark:.*|setup_mark: official|' \
    -e "s|^entry_command:.*|entry_command: $ENTRY|" -e 's|^runner_version:.*|runner_version: 2.1.305|' -e 's|^method_version:.*|method_version: 3.1.17|' "$RUN/report.md"
  { claude plugin list; claude mcp list; ls "$CLAUDE_CONFIG_DIR/skills" 2>/dev/null || echo "(no skills dir)"
    for r in $REPOS; do echo "$r: $(git -C "$BENCH_DIR/$r" tag --points-at HEAD | tr '\n' ' ')"; git -C "$BENCH_DIR/$r" status --porcelain; done
  } 2>&1 | tee "$RUN/isolation.txt"
  prompt | pbcopy
  echo
  echo "==> Ready: $RUN_ID in $RUN"
  echo "    Expected above: only rosetta@rosetta, no MCP, rosetta-v1 on every repo, no status lines."
  echo "    T0 message is on the clipboard (starts with '$ENTRY'). Next: '$0 agent' in terminal 1."
}

agent() {
  check_env
  cd "$BENCH_DIR"
  exec claude --dangerously-skip-permissions --model claude-sonnet-5-5
}

save() {
  t1="${1:-}"; [[ "$t1" =~ ^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$ ]] || die "usage: $0 save 2026-10-21T16:05 (your T1)"
  [ -d "$BENCH_DIR/run-output" ] || die "no $BENCH_DIR/run-output: send the post-implementation prompt first"
  cp -R "$BENCH_DIR/run-output/." "$RUN/"
  python3 "$SB/scripts/session-usage.py" "$CLAUDE_CONFIG_DIR/projects/$(echo "$BENCH_DIR" | tr / -)" \
    --t1 "$t1" --copy-to "$RUN" --out "$RUN/tokens.md"
  mkdir -p "$RUN/workspace-root"
  find "$BENCH_DIR" -mindepth 1 -maxdepth 1 | while read -r f; do
    case "$(basename "$f")" in saleor | saleor-dashboard | react-storefront | seed.dump | logs | envs | run-output) ;;
    *) cp -R "$f" "$RUN/workspace-root/" ;; esac
  done
  rmdir "$RUN/workspace-root" 2>/dev/null || true
  ls -la "$RUN"
}

case "${1:-}" in
  prepare) prepare ;;
  agent) agent ;;
  save) shift; save "$@" ;;
  prompt) prompt; echo ;;
  *) sed -n '2,13p' "$0"; exit 1 ;;
esac
