#!/bin/bash
# Link check: every `instructions/<release>/...` reference in the live docs resolves,
# plus rule L2 (no `instructions/r3/` path under instructions/r3 except allow_files).
# Scope, allowlist and L2 config: docs/definitions/live_counts.json (shared with ac_counts.py).
# Usage: ac_links.sh [--list-files]
# Exit: 0 pass, 1 findings, 2 usage/environment error.
# Bash 3.2 + BSD grep/awk. Root = this file's location, never the cwd.
NAME="LINKS"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CFG="$ROOT/docs/definitions/live_counts.json"

die() { echo "$NAME: ERROR $1"; exit 2; }

LIST_ONLY=0
if [ $# -gt 1 ]; then echo "usage: ac_links.sh [--list-files]"; exit 2; fi
if [ $# -eq 1 ]; then
  [ "$1" = "--list-files" ] || { echo "usage: ac_links.sh [--list-files]"; exit 2; }
  LIST_ONLY=1
fi

command -v jq >/dev/null 2>&1 || die "jq is required: install jq (brew install jq / apt-get install jq)"
[ -f "$CFG" ] || die "missing docs/definitions/live_counts.json"
jq empty "$CFG" >/dev/null 2>&1 || die "invalid JSON in docs/definitions/live_counts.json"
jq -e '.schema == 1' "$CFG" >/dev/null 2>&1 || die "unknown or missing schema (expected 1)"
jq -e '
  (.scope.root_globs|type=="array") and (.scope.dirs|type=="array") and
  (.scope.extensions|type=="array") and (.scope.exclude_prefixes|type=="array") and
  (.scope.exclude_basenames|type=="array") and (.scope.exclude_dir_names|type=="array") and
  (.links.release|type=="string") and (.links.allowlist|type=="array") and
  (.links.plugin_relative.root|type=="string") and
  (.links.plugin_relative.forbidden|type=="string") and
  (.links.plugin_relative.allow_files|type=="array")' "$CFG" >/dev/null 2>&1 \
  || die "missing or malformed key in docs/definitions/live_counts.json"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/ac_links.XXXXXX")" || die "mktemp failed"
trap 'rm -rf "$TMP"' EXIT

# ---- scope (same semantics as ac_counts.py scope_files) ----
{
  jq -r '.scope.root_globs[]' "$CFG" | while IFS= read -r g; do
    find "$ROOT" -maxdepth 1 -type f -name "$g"
  done
  jq -r '.scope.dirs[]' "$CFG" | while IFS= read -r d; do
    [ -d "$ROOT/$d" ] && find "$ROOT/$d" -type f
  done
} | sed "s#^$ROOT/##" | LC_ALL=C sort -u \
  | jq -R -r --argjson c "$(jq -c '.scope' "$CFG")" '
      . as $p
      | ($p | split("/")) as $parts
      | ($parts | last) as $b
      | (if ($b[1:] | contains(".")) then ($b | split(".") | last) else "" end) as $e
      | select(($c.extensions | index($e)) != null)
      | select(([$c.exclude_prefixes[] as $x | select($p | startswith($x))] | length) == 0)
      | select(($c.exclude_basenames | index($b)) == null)
      | select(([$parts[] as $x | select($c.exclude_dir_names | index($x))] | length) == 0)
      | $p' | LC_ALL=C sort > "$TMP/files" || die "scope computation failed"

if [ "$LIST_ONLY" -eq 1 ]; then cat "$TMP/files"; exit 0; fi

REL="$(jq -r '.links.release' "$CFG")"
scanned="$(wc -l < "$TMP/files" | tr -d ' ')"

# ---- extract tokens: "path:line token" ----
: > "$TMP/hits"
if [ -s "$TMP/files" ]; then
  tr '\n' '\0' < "$TMP/files" | (cd "$ROOT" && xargs -0 grep -IHn -e "instructions/$REL/") > "$TMP/hits" 2>/dev/null
fi
awk -v rel="$REL" '
BEGIN { re = "(^|[^A-Za-z0-9_.-])instructions/" rel "/[A-Za-z0-9/_.~-]*" }
{
  i = index($0, ":"); loc = substr($0, 1, i - 1); rest = substr($0, i + 1)
  j = index(rest, ":"); ln = substr(rest, 1, j - 1); body = substr(rest, j + 1)
  gsub(/https?:\/\/github\.com\/[^\/]+\/[^\/]+\/(blob|tree|raw)\/[^\/]+\/instructions\//, " instructions/", body)
  gsub(/(\.\.\/)+instructions\//, " instructions/", body)
  while (match(body, re)) {
    t = substr(body, RSTART, RLENGTH)
    body = substr(body, RSTART + RLENGTH)
    if (substr(t, 1, 1) != "i") t = substr(t, 2)
    sub(/[.,:;)]+$/, "", t)
    print loc ":" ln " " t
  }
}' "$TMP/hits" > "$TMP/tokens"

# ---- resolve (case-exact: membership in the on-disk listing), allowlist (two-way) ----
# find prints the real on-disk case even on a case-insensitive filesystem, so a
# wrong-case link is not a member. The two leading components are checked via ls.
(cd "$ROOT" && find . -maxdepth 1 -type d -print) | grep -qxF -e "./instructions" || die "instructions/ not found (case-exact)"
(cd "$ROOT/instructions" && find . -maxdepth 1 -type d -print) | grep -qxF -e "./$REL" || die "instructions/$REL not found (case-exact)"
{ echo "instructions/$REL"; cd "$ROOT" && find "instructions/$REL"; } > "$TMP/ondisk"
jq -r '.links.allowlist[].prefix' "$CFG" > "$TMP/allow"
: > "$TMP/allowhits"; : > "$TMP/dead"
tokens=0; resolved=0; allowlisted=0; dead=0
while IFS=' ' read -r loc t; do
  [ -n "$t" ] || continue
  tokens=$((tokens + 1))
  tt="$t"
  while [ "${tt%/}" != "$tt" ]; do tt="${tt%/}"; done
  if grep -qxF -e "$tt" "$TMP/ondisk"; then resolved=$((resolved + 1)); continue; fi
  hit=""
  while IFS= read -r pfx; do
    case "$t" in "$pfx"*) hit="$pfx"; break;; esac
  done < "$TMP/allow"
  if [ -n "$hit" ]; then
    allowlisted=$((allowlisted + 1)); echo "$hit" >> "$TMP/allowhits"
  else
    dead=$((dead + 1)); echo "DEAD $loc $t" >> "$TMP/dead"
  fi
done < "$TMP/tokens"

fail=0
cat "$TMP/dead"
[ "$dead" -gt 0 ] && fail=1
while IFS= read -r pfx; do
  if ! grep -qxF -e "$pfx" "$TMP/allowhits"; then
    echo "FAIL ALLOWLIST stale entry (0 occurrences) $pfx"; fail=1
  fi
done < "$TMP/allow"

# ---- rule L2: plugin-relative guard ----
L2ROOT="$(jq -r '.links.plugin_relative.root' "$CFG")"
L2FORB="$(jq -r '.links.plugin_relative.forbidden' "$CFG")"
jq -r '.links.plugin_relative.allow_files[]' "$CFG" > "$TMP/l2allow"
l2=0
if [ -d "$ROOT/$L2ROOT" ]; then
  (cd "$ROOT" && find "$L2ROOT" -type f -print0 | xargs -0 grep -IHn -F -e "$L2FORB") 2>/dev/null \
    | while IFS= read -r line; do
        f="${line%%:*}"
        grep -qxF -e "$f" "$TMP/l2allow" && continue
        rest="${line#*:}"
        echo "FAIL L2 $f:${rest%%:*}"
      done > "$TMP/l2"
  l2="$(wc -l < "$TMP/l2" | tr -d ' ')"
  cat "$TMP/l2"
else
  echo "FAIL L2 $L2ROOT missing"; fail=1
fi
[ "$l2" -gt 0 ] && fail=1

echo "scanned=$scanned tokens=$tokens resolved=$resolved allowlisted=$allowlisted dead=$dead l2_violations=$l2"
if [ "$fail" -eq 0 ]; then echo "$NAME: ALL PASS"; exit 0; fi
echo "$NAME: FAILURES PRESENT"; exit 1
