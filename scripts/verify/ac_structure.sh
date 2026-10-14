#!/usr/bin/env bash
# AC1 / AC4 / AC9 — structural checks. Read-only.
# Usage: bash scripts/verify/ac_structure.sh [--tree DIR]
#   --tree DIR  plugin output tree for the AC1 folder checks (default: $ROOT/plugins).
#               AC4 and AC9 always read $ROOT. The root is derived from this file's
#               location, so a copy under <S>/scripts/verify/ checks <S>.
# Exit: 0 pass, 1 findings, 2 usage/environment error.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TREE="$ROOT/plugins"
while [ $# -gt 0 ]; do
  case "$1" in
    --tree) [ $# -ge 2 ] || { echo "ac_structure.sh: --tree needs a directory" >&2; exit 2; }
            TREE="$2"; shift 2
            [ -d "$TREE" ] || { echo "ac_structure.sh: --tree $TREE is not a directory" >&2; exit 2; } ;;
    *) echo "usage: ac_structure.sh [--tree DIR]" >&2; exit 2 ;;
  esac
done
cd "$ROOT" || exit 2
fail=0
say(){ printf '%s\n' "$*"; }
ok(){  say "  PASS  $*"; }
no(){  say "  FAIL  $*"; fail=1; }

say "=== AC1 — 49 output folders, one generator call ==="
n=$(ls "$TREE" 2>/dev/null | wc -l | tr -d ' ')
[ "$n" = 49 ] && ok "$TREE has 49 folders" || no "$TREE has $n folders, expected 49"
missing=""
for set in rosetta core workflows qe search modernization; do
  for ide in claude cursor copilot codex antigravity cursor-standalone copilot-standalone; do
    [ -d "$TREE/$set-$ide" ] || missing="$missing $set-$ide"
  done
done
for ide in claude cursor copilot codex antigravity cursor-standalone copilot-standalone; do
  [ -d "$TREE/rosetta-$ide-light" ] || missing="$missing rosetta-$ide-light"
done
[ -z "$missing" ] && ok "every expected folder present" || no "missing:$missing"
# Count only NON-comment lines holding the bare token; comments may explain the call.
c=$(grep -v '^[[:space:]]*#' scripts/pre_commit.py 2>/dev/null | grep -c 'rosettify-plugins')
[ "$c" = 1 ] && ok "scripts/pre_commit.py has exactly 1 non-comment generator line" \
  || no "scripts/pre_commit.py has $c non-comment lines with rosettify-plugins, expected 1"

say ""
say "=== AC4 — MECE across instructions/r3 folders ==="
tmp=$(mktemp)
for d in core workflows qe search modernization; do
  [ -d "instructions/r3/$d" ] || { no "instructions/r3/$d does not exist"; continue; }
  (cd "instructions/r3/$d" && find . -type f | sed 's|^\./||') >> "$tmp"
done
dupes=$(sort "$tmp" | uniq -d)
[ -z "$dupes" ] && ok "no relative path appears under two folders ($(wc -l < "$tmp" | tr -d ' ') files)" \
  || { no "duplicate relative paths across folders:"; echo "$dupes" | head -20; }
rm -f "$tmp"
[ -d instructions/r3/core/configure ] && no "instructions/r3/core/configure still exists" || ok "configure/ removed"
[ -f instructions/r3/workflows/workflows/self-help-flow.md ] || \
  [ -f instructions/r3/core/workflows/self-help-flow.md ] && no "self-help-flow.md still exists" || ok "self-help-flow.md deleted"
if [ -f instructions/r3/core/workflows/arrange-workspace-flow-modernization.md ]; then
  ok "arrange-workspace-flow-modernization.md is in core (glob trap avoided)"
else
  no "arrange-workspace-flow-modernization.md NOT in core/workflows"
fi

say ""
say "=== AC9 — exactly 5 template folders ==="
n=$(ls src/rosettify-plugins/plugins 2>/dev/null | wc -l | tr -d ' ')
[ "$n" = 5 ] && ok "src/rosettify-plugins/plugins has 5 folders: $(ls src/rosettify-plugins/plugins | tr '\n' ' ')" \
  || no "has $n folders: $(ls src/rosettify-plugins/plugins 2>/dev/null | tr '\n' ' ')"

say ""
say "=== per-folder counts ==="
for d in core workflows qe search modernization; do
  [ -d "instructions/r3/$d" ] || continue
  printf '  %-15s skills=%-3s workflows=%-3s agents=%-3s rules=%s\n' "$d" \
    "$(ls instructions/r3/$d/skills 2>/dev/null | wc -l | tr -d ' ')" \
    "$(ls instructions/r3/$d/workflows 2>/dev/null | wc -l | tr -d ' ')" \
    "$(ls instructions/r3/$d/agents 2>/dev/null | wc -l | tr -d ' ')" \
    "$(ls instructions/r3/$d/rules 2>/dev/null | wc -l | tr -d ' ')"
done
say ""
[ $fail = 0 ] && say "STRUCTURE: ALL PASS" || say "STRUCTURE: FAILURES PRESENT"
exit $fail
