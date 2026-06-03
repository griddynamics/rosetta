#!/usr/bin/env bash
# Local runner for Rosetta "scenario comparison" (see REVIEW.md, .github/workflows/validate-prompts.yml).
# Compares BASE vs NEW versions of instruction markdown using Claude Code CLI + .github/prompts/prompt-comparison.md.
#
# Prerequisites:
#   - ANTHROPIC_API_KEY in the environment (or pass via env when invoking)
#   - npm global: @anthropic-ai/claude-code  →  `claude` on PATH
#   - git, jq
#
# Usage:
#   export ANTHROPIC_API_KEY=...
#   ./scripts/run-prompt-scenario-comparison.sh
#   ./scripts/run-prompt-scenario-comparison.sh --base abc1234
#   PROMPT_COMPARE_BASE=abc1234 ./scripts/run-prompt-scenario-comparison.sh
#   ./scripts/run-prompt-scenario-comparison.sh --files instructions/r3/core/workflows/aqa-flow*.md
#   # (shell expands globs → multiple words; all paths after one --files are collected)
#   ./scripts/run-prompt-scenario-comparison.sh -- instructions/r3/core/workflows/a.md b.md
#   ./scripts/run-prompt-scenario-comparison.sh --model opus
#
# Defaults:
#   --base   colleague snapshot commit (see DEFAULT_PROMPT_COMPARE_BASE_COMMIT in script); override via --base or PROMPT_COMPARE_BASE
#   --model  opus (same as CI workflow)
#
# Outputs:
#   .tmp/base-versions/<mirrored-path>   extracted BASE file content
#   .tmp/<basename>.json                  auditor output (matches .github/prompts/prompt-comparison.md — basename of NEW file, no path)
#   .tmp/all-results.json                 merged array of all results
#   .scripts/all-hashes.json              sha256 of NEW + BASE content per path; skips claude when BASE ref, model, comparison
#                                         prompt, and both blobs match last successful run and per-file .tmp/<stem>.json exists

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TMP_DIR="${TMP_DIR:-.tmp}"
BASE_VERSIONS_DIR="${TMP_DIR}/base-versions"
ALL_RESULTS_FILE="${TMP_DIR}/all-results.json"
MODEL="${MODEL:-opus}"
COMPARISON_PROMPT="$ROOT/.github/prompts/prompt-comparison.md"
HASHES_FILE="$ROOT/.scripts/all-hashes.json"
HASHES_DIR="$(dirname "$HASHES_FILE")"

# Colleague's pre-merge snapshot — original skill wording accepted as-is; NEW is compared against this tree.
DEFAULT_PROMPT_COMPARE_BASE_COMMIT="d6964eeb9449fdfa61219989661c5effc0a576a7"

BASE_REF=""
EXPLICIT_FILES=()
NO_CACHE=0

usage() {
  sed -n '1,35p' "$0" | sed -n 's/^# \{0,1\}//p'
  echo ""
  echo "Options:"
  echo "  --base REF     Commit (or ref) for BASE file reads and diff range (default: \$PROMPT_COMPARE_BASE or built-in colleague commit)"
  echo "  --model NAME   claude --model (default: opus)"
  echo "  --no-cache    Ignore .scripts/all-hashes.json and force fresh checks for selected files"
  echo "  --files PATH...  One or more paths (shell globs OK). Comma-separated also OK in a single argument."
  echo "  --               End of options; every following argument is a file path"
  echo "  --help         This help"
}

die() { echo "error: $*" >&2; exit 1; }

sha256_file() { sha256sum "$1" | awk '{print $1}'; }
sha256_stdin() { sha256sum | awk '{print $1}'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      BASE_REF="${2:-}"; shift 2 || die "--base requires a value"
      ;;
    --model)
      MODEL="${2:-}"; shift 2 || die "--model requires a value"
      ;;
    --no-cache)
      NO_CACHE=1; shift
      ;;
    --files)
      shift || die "--files requires at least one path"
      _got_files=0
      while [[ $# -gt 0 && "$1" != --* ]]; do
        _got_files=1
        if [[ "$1" == *','* ]]; then
          IFS=',' read -r -a _parts <<<"$1"
          for _p in "${_parts[@]}"; do
            _p="$(printf '%s' "$_p" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
            [[ -n "$_p" ]] && EXPLICIT_FILES+=("$_p")
          done
        else
          EXPLICIT_FILES+=("$1")
        fi
        shift
      done
      [[ "$_got_files" -eq 1 ]] || die "--files requires at least one path (next token was another flag or missing)"
      ;;
    --)
      shift
      while [[ $# -gt 0 ]]; do
        EXPLICIT_FILES+=("$1")
        shift
      done
      break
      ;;
    --help|-h)
      usage; exit 0
      ;;
    *)
      die "unknown option: $1 (use --help). Tip: after --files, pass paths or globs on the same line so the shell expands them into separate words."
      ;;
  esac
done

[[ -n "${ANTHROPIC_API_KEY:-}" ]] || die "ANTHROPIC_API_KEY is not set"
[[ -f "$COMPARISON_PROMPT" ]] || die "missing system prompt: $COMPARISON_PROMPT"
command -v claude >/dev/null 2>&1 || die "claude CLI not found (install: npm i -g @anthropic-ai/claude-code)"
command -v jq >/dev/null 2>&1 || die "jq not found"
command -v git >/dev/null 2>&1 || die "git not found"

if [[ -z "$BASE_REF" ]]; then
  BASE_REF="${PROMPT_COMPARE_BASE:-$DEFAULT_PROMPT_COMPARE_BASE_COMMIT}"
fi

if ! git rev-parse --verify "${BASE_REF}^{commit}" >/dev/null 2>&1; then
  die "BASE ref is not a valid commit: $BASE_REF (fetch the colleague branch/commit into this clone, or pass --base REF)"
fi

echo "Using BASE_REF=$BASE_REF  MODEL=$MODEL  ROOT=$ROOT"

if [[ ${#EXPLICIT_FILES[@]} -gt 0 ]]; then
  mapfile -t CHANGED_FILES < <(printf '%s\n' "${EXPLICIT_FILES[@]}" | sed '/^$/d')
else
  mapfile -t CHANGED_FILES < <(git diff --name-only "$BASE_REF"...HEAD -- 'instructions/**/*.md' 2>/dev/null || true)
fi

if [[ ${#CHANGED_FILES[@]} -eq 0 ]]; then
  echo "No instruction files to compare (empty list). Nothing to do."
  exit 0
fi

_dup_stems="$(for f in "${CHANGED_FILES[@]}"; do basename "$f" .md; done | sort | uniq -d)"
[[ -n "$_dup_stems" ]] && echo "warning: duplicate path basenames (same .tmp/<name>.json): $_dup_stems — run those files separately or only one will remain." >&2

mkdir -p "$TMP_DIR" "$BASE_VERSIONS_DIR" "$HASHES_DIR"
PROMPT_SHA="$(sha256_file "$COMPARISON_PROMPT")"

cache_valid=0
if [[ "$NO_CACHE" -eq 1 ]]; then
  echo "notice: --no-cache set; forcing fresh checks for selected files"
elif [[ -f "$HASHES_FILE" ]]; then
  _sb="$(jq -r '.base_ref // empty' "$HASHES_FILE" 2>/dev/null || true)"
  _sp="$(jq -r '.comparison_prompt_sha256 // empty' "$HASHES_FILE" 2>/dev/null || true)"
  _sm="$(jq -r '.model // empty' "$HASHES_FILE" 2>/dev/null || true)"
  if [[ "$_sb" == "$BASE_REF" && "$_sp" == "$PROMPT_SHA" && "$_sm" == "$MODEL" ]]; then
    cache_valid=1
  fi
fi

if [[ "$cache_valid" -eq 0 ]]; then
  # Meta changed — drop all per-file auditor JSON so merge cannot mix stale runs (same as previous full clean)
  find "$TMP_DIR" -maxdepth 1 -name '*.json' -type f ! -name 'all-results.json' -delete 2>/dev/null || true
else
  # Drop auditor JSON only for paths that need a fresh claude run (content or missing artifact)
  for FILE in "${CHANGED_FILES[@]}"; do
    [[ -n "$FILE" ]] || continue
    RESULT_STEM="$(basename "$FILE" .md)"
    RESULT_FILE="$TMP_DIR/${RESULT_STEM}.json"
    if [[ ! -f "$FILE" ]]; then
      rm -f "$RESULT_FILE"
      continue
    fi
    if ! git show "$BASE_REF:$FILE" >/dev/null 2>&1; then
      rm -f "$RESULT_FILE"
      continue
    fi
    new_h="$(sha256_file "$FILE")"
    base_h="$(git show "$BASE_REF:$FILE" | sha256_stdin)"
    old_n="$(jq -r --arg f "$FILE" '.files[$f].new // empty' "$HASHES_FILE" 2>/dev/null || true)"
    old_b="$(jq -r --arg f "$FILE" '.files[$f].base // empty' "$HASHES_FILE" 2>/dev/null || true)"
    if [[ "$old_n" == "$new_h" && "$old_b" == "$base_h" && -f "$RESULT_FILE" ]]; then
      :
    else
      rm -f "$RESULT_FILE"
    fi
  done
fi
rm -f "$ALL_RESULTS_FILE"

skipped_new=0
skipped_missing=0
skipped_hash=0
ran=0

# Successful runs this session: path -> {new, base} (jq object)
SUCCESS_DIGESTS_JSON='{}'

for FILE in "${CHANGED_FILES[@]}"; do
  [[ -n "$FILE" ]] || continue
  echo ""
  echo "=== Validating: $FILE ==="

  if [[ ! -f "$FILE" ]]; then
    echo "warning: NEW file missing on disk, skipping: $FILE"
    skipped_missing=$((skipped_missing + 1))
    continue
  fi

  # Unique BASE path (avoid basename collisions across directories)
  SAFE_REL="${FILE#./}"
  SAFE_REL="${SAFE_REL//../__}"
  BASE_FILE="${BASE_VERSIONS_DIR}/${SAFE_REL}"
  mkdir -p "$(dirname "$BASE_FILE")"

  if ! git show "$BASE_REF:$FILE" >"$BASE_FILE" 2>/dev/null; then
    echo "warning: no base version at $BASE_REF:$FILE — skipping (CI also skips new files without BASE)"
    skipped_new=$((skipped_new + 1))
    rm -f "$BASE_FILE"
    continue
  fi
  echo "notice: base version found at $BASE_REF:$FILE"

  new_h="$(sha256_file "$FILE")"
  base_h="$(sha256_file "$BASE_FILE")"
  RESULT_STEM="$(basename "$FILE" .md)"
  RESULT_FILE="$TMP_DIR/${RESULT_STEM}.json"

  if [[ "$cache_valid" -eq 1 ]]; then
    old_n="$(jq -r --arg f "$FILE" '.files[$f].new // empty' "$HASHES_FILE" 2>/dev/null || true)"
    old_b="$(jq -r --arg f "$FILE" '.files[$f].base // empty' "$HASHES_FILE" 2>/dev/null || true)"
    if [[ "$old_n" == "$new_h" && "$old_b" == "$base_h" && -f "$RESULT_FILE" ]]; then
      echo "notice: unchanged since last run (sha256 match + existing $RESULT_FILE) — skipping claude"
      skipped_hash=$((skipped_hash + 1))
      continue
    fi
  fi

  PROMPT="Compare and evaluate the prompt file versions: 
NEW: $FILE
BASE: $BASE_FILE."

  # Same allowedTools scope as .github/workflows/validate-prompts.yml
  claude --model "$MODEL" \
    --allowedTools "Edit(.tmp/**), Read(.tmp/**), Read(instructions/**/*.md), Read(docs/**/*.md), Read(agents/**/*.md)" \
    --system-prompt-file "$COMPARISON_PROMPT" \
    -p "$PROMPT"

  # Auditor MUST write here per .github/prompts/prompt-comparison.md (same as validate-prompts.yml):
  #   .tmp/{basename(NEW)}.json
  if [[ -f "$RESULT_FILE" ]]; then
    jq --arg file "$FILE" '. + {file: $file}' "$RESULT_FILE" >"${RESULT_FILE}.tmp" && mv "${RESULT_FILE}.tmp" "$RESULT_FILE"
    echo "notice: result written to $RESULT_FILE"
    ran=$((ran + 1))
    SUCCESS_DIGESTS_JSON="$(jq -n \
      --argjson acc "$SUCCESS_DIGESTS_JSON" \
      --arg p "$FILE" \
      --arg n "$new_h" \
      --arg b "$base_h" \
      '$acc | .[$p] = {new: $n, base: $b}')"
  else
    echo "warning: expected result file not found: $RESULT_FILE"
    echo "warning: (auditor should create .tmp/<basename-of-NEW>.json per prompt-comparison.md; basename here is ${RESULT_STEM}.json)"
  fi
done

# Persist hashes: meta always current; merge file digests for successful runs; drop entries with missing result JSON
if [[ "$cache_valid" -eq 1 ]]; then
  _merge_base="$(cat "$HASHES_FILE")"
else
  _merge_base='{"schema_version":1,"files":{}}'
fi
_merged="$(jq -n \
  --argjson base "$_merge_base" \
  --argjson succ "$SUCCESS_DIGESTS_JSON" \
  --arg br "$BASE_REF" \
  --arg ps "$PROMPT_SHA" \
  --arg md "$MODEL" \
  '($base)
    | .schema_version = 1
    | .base_ref = $br
    | .comparison_prompt_sha256 = $ps
    | .model = $md
    | .files = (($base.files // {}) * $succ)')"
for FILE in "${CHANGED_FILES[@]}"; do
  [[ -n "$FILE" ]] || continue
  RESULT_STEM="$(basename "$FILE" .md)"
  RESULT_FILE="$TMP_DIR/${RESULT_STEM}.json"
  if [[ ! -f "$RESULT_FILE" ]]; then
    _merged="$(jq --arg f "$FILE" 'del(.files[$f])' <<<"$_merged")"
  fi
done
printf '%s\n' "$_merged" | jq '.' >"${HASHES_FILE}.tmp" && mv "${HASHES_FILE}.tmp" "$HASHES_FILE"
echo "notice: wrote hash cache → $HASHES_FILE"

shopt -s nullglob
json_files=("$TMP_DIR"/*.json)
# Exclude merged file if present from glob before merge
merge_list=()
for f in "${json_files[@]}"; do
  [[ "$(basename "$f")" == "all-results.json" ]] && continue
  merge_list+=("$f")
done

if [[ ${#merge_list[@]} -eq 0 ]]; then
  echo '[]' >"$ALL_RESULTS_FILE"
  echo "No per-file JSON outputs; wrote empty $ALL_RESULTS_FILE"
else
  jq -s '.' "${merge_list[@]}" >"$ALL_RESULTS_FILE"
  echo "Merged ${#merge_list[@]} result(s) → $ALL_RESULTS_FILE"
fi

HIGH_COUNT="$(jq '[.[] | .issues[]? | select(.severity >= 3)] | length' "$ALL_RESULTS_FILE")"
LOW_COUNT="$(jq '[.[] | .issues[]? | select(.severity == 1 or .severity == 2)] | length' "$ALL_RESULTS_FILE")"
echo ""
echo "Summary: ran=$ran  skipped_no_base=$skipped_new  skipped_missing_new=$skipped_missing  skipped_unchanged_hash=$skipped_hash"
echo "Issues: high_or_above_severity=$HIGH_COUNT  low_severity=$LOW_COUNT"

if [[ "$HIGH_COUNT" -gt 0 ]]; then
  echo "error: found $HIGH_COUNT issue(s) with severity >= 3 (see $ALL_RESULTS_FILE)" >&2
  exit 1
fi

echo "OK: no high/critical issues (severity >= 3)."
exit 0
