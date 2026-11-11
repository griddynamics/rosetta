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

# Catalog-driven (src/rosettify-plugins/plugins.json): expected folders = declared
# set x variant x target. A set with no folder in the tree at all is declared but
# unpublished/not built: skipped, not failed. A partially built set fails.
CATALOG="src/rosettify-plugins/plugins.json"
FOLDERS_INSTR=$(ls -d instructions/r3/*/ 2>/dev/null | xargs -n1 basename)
STEMS=$(python3 - "$CATALOG" <<'PY'
import json, sys
c = json.load(open(sys.argv[1]))
for s in c["sets"]:
    for v in s.get("variants", []):
        print(s["name"] + "-{t}" + v.get("destinationSuffix", ""))
PY
)
TARGETS=$(python3 -c 'import json,sys; print(" ".join(json.load(open(sys.argv[1]))["targets"]))' "$CATALOG")
NTEMPLATES=0
for t in $TARGETS; do case "$t" in *-standalone) ;; *) NTEMPLATES=$((NTEMPLATES+1));; esac; done
say "=== AC1 — catalog-declared output folders, one generator call ==="
expected=0; missing=""; skipped=""
for stem in $STEMS; do
  built=0
  for t in $TARGETS; do [ -d "$TREE/${stem//\{t\}/$t}" ] && built=$((built+1)); done
  if [ "$built" = 0 ]; then skipped="$skipped ${stem//\{t\}/<ide>}"; continue; fi
  for t in $TARGETS; do
    expected=$((expected+1))
    [ -d "$TREE/${stem//\{t\}/$t}" ] || missing="$missing ${stem//\{t\}/$t}"
  done
done
n=$(ls "$TREE" 2>/dev/null | wc -l | tr -d ' ')
[ "$n" = "$expected" ] && ok "$TREE has $expected folders (built sets only)" || no "$TREE has $n folders, expected $expected"
[ -n "$skipped" ] && say "  SKIP  declared, no folders built:$skipped"
[ "$expected" -gt 0 ] || no "no built set found in $TREE (vacuous)"
[ -z "$missing" ] && ok "every expected folder present" || no "missing:$missing"
# Count only NON-comment lines holding the bare token; comments may explain the call.
c=$(grep -v '^[[:space:]]*#' scripts/pre_commit.py 2>/dev/null | grep -c 'rosettify-plugins')
[ "$c" = 1 ] && ok "scripts/pre_commit.py has exactly 1 non-comment generator line" \
  || no "scripts/pre_commit.py has $c non-comment lines with rosettify-plugins, expected 1"

say ""
say "=== AC4 — MECE across instructions/r3 folders ==="
tmp=$(mktemp)
for d in $FOLDERS_INSTR; do
  (cd "instructions/r3/$d" && find . -type f | sed 's|^\./||') >> "$tmp"
done
dupes=$(sort "$tmp" | uniq -d)
[ -z "$dupes" ] && ok "no relative path appears under two folders ($(wc -l < "$tmp" | tr -d ' ') files)" \
  || { no "duplicate relative paths across folders:"; echo "$dupes" | head -20; }
rm -f "$tmp"
[ -d instructions/r3/core/configure ] && no "instructions/r3/core/configure still exists" || ok "configure/ removed"
ls instructions/r3/*/workflows/self-help-flow.md >/dev/null 2>&1 && no "self-help-flow.md still exists" || ok "self-help-flow.md deleted"
if ls instructions/r3/*/workflows/arrange-workspace-flow-modernization.md >/dev/null 2>&1; then
  ok "arrange-workspace-flow-modernization.md is a workflow file (glob trap avoided)"
else
  no "arrange-workspace-flow-modernization.md NOT found under instructions/r3/*/workflows"
fi

say ""
say "=== AC9 — one template folder per non-standalone target ==="
n=$(ls src/rosettify-plugins/plugins 2>/dev/null | wc -l | tr -d ' ')
[ "$n" = "$NTEMPLATES" ] && ok "src/rosettify-plugins/plugins has $NTEMPLATES folders: $(ls src/rosettify-plugins/plugins | tr '\n' ' ')" \
  || no "has $n folders: $(ls src/rosettify-plugins/plugins 2>/dev/null | tr '\n' ' ')"

say ""
say "=== per-folder counts ==="
for d in $FOLDERS_INSTR; do
  printf '  %-15s skills=%-3s workflows=%-3s agents=%-3s rules=%s\n' "$d" \
    "$(ls instructions/r3/$d/skills 2>/dev/null | wc -l | tr -d ' ')" \
    "$(ls instructions/r3/$d/workflows 2>/dev/null | wc -l | tr -d ' ')" \
    "$(ls instructions/r3/$d/agents 2>/dev/null | wc -l | tr -d ' ')" \
    "$(ls instructions/r3/$d/rules 2>/dev/null | wc -l | tr -d ' ')"
done
say ""
[ $fail = 0 ] && say "STRUCTURE: ALL PASS" || say "STRUCTURE: FAILURES PRESENT"
exit $fail
