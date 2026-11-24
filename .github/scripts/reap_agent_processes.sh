#!/usr/bin/env bash
# Terminate anything the Codex agent step left behind, so the job can finalise.
#
# This is BELT-AND-BRACES, not the fix for the ~60-minute runner deaths. That was
# openai/codex-action#160: the default `drop-sudo` safety strategy chmods root-owned
# sockets under /run to 0700, systemd-resolved loses the system bus and crash-loops,
# name resolution dies for the whole machine, and the runner agent then loses contact
# 52-65 minutes in. The workflows now pass `safety-strategy` explicitly, which is what
# actually addresses it.
#
# What this step covers is a SEPARATE, still-open upstream problem: the Codex step can
# fail to return after the turn has completed, with the output file already written --
# openai/codex-action#150 (closed), #169 and #172 (open). A runner cannot finalise a
# job while a process still holds the step's output pipe, and codex-action starts its
# `codex-responses-api-proxy` with `( exec ... ) &` and never shuts it down: it is
# deliberately long-lived so a second invocation can reuse it, and a COMPOSITE action
# cannot register a `post:` cleanup hook to stop it.
#
# Cheap insurance, then. Runs as `if: always()` after the agent step. TERM first so the
# proxy can shut down gracefully; KILL only for what ignores it.
set -uo pipefail

PATTERNS=(
  'codex-responses-api-prox[y]'
  'main.js run-codex-exe[c]'
  '[c]odex-x86_64'
  '[c]odex exec'
  'codex-code-mod[e]'
)

echo "Leftover agent processes:"
found=0
for pat in "${PATTERNS[@]}"; do
  pids="$(pgrep -f "$pat" 2>/dev/null || true)"
  [ -z "$pids" ] && continue
  found=1
  echo "  $pat -> $(echo "$pids" | tr '\n' ' ')"
  # Errors are NOT swallowed: part of the tree can run elevated, and a permission
  # failure here is something to see rather than silently tolerate.
  for p in $pids; do kill -TERM "$p" 2>&1 || true; done
done

if [ "$found" -eq 0 ]; then
  echo "  none"
  exit 0
fi

sleep 5
for pat in "${PATTERNS[@]}"; do
  for p in $(pgrep -f "$pat" 2>/dev/null || true); do
    echo "  survived TERM, sending KILL -> $p"
    kill -KILL "$p" 2>&1 || true
  done
done
echo "Cleanup done."
