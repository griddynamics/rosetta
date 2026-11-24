#!/usr/bin/env bash
#
# Run test cases for instructions/ changes.
#
# Input: CHANGED_FILES (space or newline-separated)
# Output: PR_COMMENT_FILE
#
# Flow:
# 1. Parse CHANGED_FILES
# 2. Find test cases whose trigger.txt matches any changed file
# 3. For each case: create root_old, root_new, run prompt-request, run validation
# 4. Write results to PR_COMMENT_FILE
#
# Runs on EITHER agent, selected by ROSETTA_AGENT (claude|codex; default codex). The
# two CLIs are not flag-compatible, so every invocation goes through agent_prompt()
# and agent_validate() rather than a bare $CLI_CMD. Differences that are inherent to
# Codex, not choices made here:
#   - no `--append-system-prompt`: the preamble is prepended to the prompt text;
#   - no `--allowedTools`: reach is set by `--sandbox` (workspace-write / read-only);
#   - no `--agent`: the validator's own instruction file is prepended to the
#     validation prompt instead of being loaded as a subagent;
#   - a different memory file: `AGENTS.md`, not `.claude/claude.md`.
#

set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(pwd)}"
INSTRUCTIONS_NEW="${INSTRUCTIONS_NEW:-$REPO_ROOT/instructions}"
ROSETTA_AGENT="${ROSETTA_AGENT:-codex}"
# VALIDATE_CLI_CMD stays the override hook it always was; the default now follows
# the selected agent.
if [[ "$ROSETTA_AGENT" == "claude" ]]; then
  CLI_CMD="${VALIDATE_CLI_CMD:-claude}"
  MODEL="${MODEL:-sonnet}"
else
  CLI_CMD="${VALIDATE_CLI_CMD:-codex}"
  # The tier counterpart of the claude default above. The ladder is the one
  # instructions/r3/core/agents/*.md already pairs: opus<->gpt-6.1-sol,
  # sonnet<->gpt-6-luna (effort one step higher), haiku<->gpt-6-luna.
  MODEL="${MODEL:-gpt-6-luna}"
fi
CODEX_EFFORT="${CODEX_EFFORT:-high}"
BASE_SHA="${BASE_SHA:-HEAD^}"
TEST_LIB="${TEST_LIB:-$REPO_ROOT/test-library}"
ROOT_ZIP="${ROOT_ZIP:-$TEST_LIB/spring-boot-react-mysql.zip}"
PR_COMMENT_FILE="${PR_COMMENT_FILE:-$REPO_ROOT/.tmp/pr-comment.md}"
VALIDATOR_AGENT="${VALIDATOR_AGENT:-$REPO_ROOT/.github/prompts/test-case-result-validator.md}"

# Python 3.10+ is required
if ! command -v python3 &>/dev/null; then
    echo "ERROR: python3 not found. Python 3.10+ is required." >&2
    exit 1
fi
_py_ver=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "0.0")
_py_major=$(echo "$_py_ver" | cut -d. -f1)
_py_minor=$(echo "$_py_ver" | cut -d. -f2)
if [[ "$_py_major" -lt 3 ]] || { [[ "$_py_major" -eq 3 ]] && [[ "$_py_minor" -lt 10 ]]; }; then
    echo "ERROR: Python 3.10+ is required (found: $_py_ver). Please upgrade Python." >&2
    exit 1
fi

# Run a prompt in $1 (working directory) with write access to that directory.
# $2 = system preamble, $3 = prompt text. Stdout of the agent goes to $4 (log file).
agent_prompt() {
  local workdir="$1" preamble="$2" prompt="$3" log="$4"

  if [[ "$ROSETTA_AGENT" == "claude" ]]; then
    (cd "$workdir" && $CLI_CMD --model "$MODEL" --append-system-prompt "$preamble" \
        --allowedTools "Read(./**) Write(./**) Edit(./**)" -p "$prompt" 2>&1) > "$log" || true
    return 0
  fi

  # Codex: the preamble has no dedicated flag, so it leads the prompt. The case
  # workspaces are extracted zips, not git checkouts, hence --skip-git-repo-check.
  local model_args=()
  [[ -n "$MODEL" ]] && model_args=(-m "$MODEL")
  (cd "$workdir" && $CLI_CMD exec "${preamble}"$'\n\n'"${prompt}" \
      "${model_args[@]}" \
      -c model_reasoning_effort="\"$CODEX_EFFORT\"" \
      --sandbox workspace-write \
      --skip-git-repo-check \
      --color never 2>&1) > "$log" || true
}

# Run the validation prompt in $1 (read-only) and echo the agent's final message.
# $2 = prompt file.
agent_validate() {
  local workdir="$1" prompt_file="$2"

  if [[ "$ROSETTA_AGENT" == "claude" ]]; then
    (cd "$workdir" && $CLI_CMD --model "$MODEL" --agent test-case-result-validator \
        --allowedTools "Read(./**)" -p < "$prompt_file" 2>&1) || true
    return 0
  fi

  # Codex has no subagents, so the validator's instruction file becomes the head of
  # the prompt. `-o` is what makes the verdict parseable: `codex exec` writes progress
  # to stdout, so the caller must read the LAST message from a file, not from stdout.
  local last_msg="$workdir/.codex-last-message.txt"
  local combined="$workdir/.codex-validation-prompt.txt"
  {
    # Strip the agent file's frontmatter -- it addresses Claude's agent loader, not
    # the model, and `tools:`/`model:` there would only mislead Codex. The `head`
    # guard matters: without it, a file that ever loses its frontmatter would emit
    # only its first line, because `q` prints the current line before quitting.
    if head -1 "$VALIDATOR_AGENT" | grep -q '^---$'; then
      sed '1,/^---$/d' "$VALIDATOR_AGENT"
    else
      cat "$VALIDATOR_AGENT"
    fi
    printf '\n\n'
    cat "$prompt_file"
  } > "$combined"

  local model_args=()
  [[ -n "$MODEL" ]] && model_args=(-m "$MODEL")
  (cd "$workdir" && $CLI_CMD exec - \
      "${model_args[@]}" \
      -c model_reasoning_effort="\"$CODEX_EFFORT\"" \
      --sandbox read-only \
      --skip-git-repo-check \
      --color never \
      -o "$last_msg" < "$combined" >&2) || true
  rm -f "$combined"
  [[ -f "$last_msg" ]] && cat "$last_msg"
  rm -f "$last_msg"
}

# 1. Parse CHANGED_FILES into array
echo "[1/6] Parsing CHANGED_FILES..."
changed=()
for f in ${CHANGED_FILES:-}; do
  [[ -n "$f" ]] && changed+=("$f")
done
echo "  Parsed ${#changed[@]} changed file(s)"

# 2. Get test cases to run: case dirs whose trigger.txt matches any changed file
get_cases() {
  local cases=()
  for dir in "$TEST_LIB"/*/; do
    [[ -f "$dir/trigger.txt" ]] || continue
    while IFS= read -r line; do
      line=$(echo "${line%%#*}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      [[ -z "$line" ]] && continue
      for f in "${changed[@]}"; do
        if [[ "$f" == *"$line"* ]]; then
          cases+=("$dir")
          break 2
        fi
      done
    done < "$dir/trigger.txt"
  done
  [[ ${#cases[@]} -gt 0 ]] && printf '%s\n' "${cases[@]}" | sort -u
}

# Get files changed in $modified vs $base (baseline). Excludes the injected
# instruction trees and memory files (agents/, .claude/, AGENTS.md) and .git/ -- those
# are harness scaffolding, not agent output, and would otherwise show up as a
# "changed file" in every case on the Codex branch.
get_changed_files() {
  local base="$1"
  local modified="$2"
  local mod_abs
  mod_abs=$(cd "$modified" 2>/dev/null && pwd) || return
  [[ ! -d "$base" ]] || [[ ! -d "$modified" ]] && return
  diff -rq "$base" "$modified" 2>/dev/null | while IFS= read -r line; do
    if [[ "$line" == *" differ" ]]; then
      echo "$line" | sed 's/.* and //;s/ differ$//' | sed "s|^$mod_abs/||" | sed 's|^\./||'
    elif [[ "$line" == "Only in "* ]]; then
      local sub
      sub=$(echo "$line" | sed 's/^Only in [^:]*: //' | sed 's|^\./||')
      [[ -n "$sub" ]] && find "$mod_abs/$sub" -type f 2>/dev/null | while IFS= read -r f; do
        echo "${f#$mod_abs/}" | sed 's|^/||'
      done
    fi
  done | grep -vE '^agents/|^\.claude/|^AGENTS\.md$|^\.git/' | sort -u
}

# 3. Prepare root_old and root_new for a test case
prepare_case() {
  local dir="${1%/}"
  local root_old="$dir/root_old"
  local root_new="$dir/root_new"
  local root_original="$dir/root_original"
  local extract_dir="$dir/.tmp_extract"

  echo "  [3a] Removing old root_old, root_new, root..."
  rm -rf "$root_old" "$root_new" "$root_original" "$extract_dir"

  if [[ -f "$ROOT_ZIP" ]]; then
    echo "  [3b] Extracting $ROOT_ZIP into root..."
    mkdir -p "$extract_dir"
    unzip -o -q "$ROOT_ZIP" -d "$extract_dir" 2>/dev/null || true
    # Zip has top-level folder (e.g. spring-boot-react-mysql/), move it to root_old (skip __MACOSX)
    local top_dir
    top_dir=$(find "$extract_dir" -mindepth 1 -maxdepth 1 -type d ! -name '__MACOSX' | head -1)
    if [[ -n "$top_dir" ]]; then
      mkdir -p "$(dirname "$root_old")"
      mv "$top_dir" "$root_old"
    else
      mkdir -p "$root_old"
      [[ -d "$extract_dir" ]] && mv "$extract_dir"/* "$root_old" 2>/dev/null || true
    fi
    rm -rf "$extract_dir"
    echo "  [3c] Saving baseline (root) and copying to root_new..."
    cp -a "$root_old" "$root_original"
    cp -a "$root_old" "$root_new"
  else
    echo "  [3b] ROOT_ZIP not found ($ROOT_ZIP), creating empty root_old, root_new..."
    mkdir -p "$root_old" "$root_new" "$root_original"
  fi

  echo "  [3d] Injecting instructions (new -> root_new, old -> root_old)..."
  rm -rf "$root_new/agents" "$root_old/agents" "$root_new/.claude" "$root_old/.claude"
  mkdir -p "$root_new/agents" "$root_old/agents" "$root_new/.claude" "$root_old/.claude"
  cp -a "$INSTRUCTIONS_NEW" "$root_new/agents/"
  git -C "$REPO_ROOT" archive "$BASE_SHA" instructions 2>/dev/null | tar -x -C "$root_old/agents/" 2>/dev/null

  # The memory file the agent actually reads: CLAUDE.md-style for Claude, AGENTS.md
  # for Codex. Writing the wrong one would leave the injected instructions unloaded
  # and quietly compare two identical runs.
  local memory_old memory_new
  if [[ "$ROSETTA_AGENT" == "claude" ]]; then
    memory_old="$root_old/.claude/claude.md"
    memory_new="$root_new/.claude/claude.md"
  else
    memory_old="$root_old/AGENTS.md"
    memory_new="$root_new/AGENTS.md"
  fi

  echo "  [3e] Creating memory file ($ROSETTA_AGENT): $(basename "$memory_new")..."
  if [[ -f "$root_new/agents/instructions/r1/local.md" ]]; then
    cp "$root_new/agents/instructions/r1/local.md" "$memory_old"
    cp "$root_old/agents/instructions/r1/local.md" "$memory_new"
  fi

  # Claude loads the validator as a project subagent; Codex has no subagents and gets
  # the same file prepended to the validation prompt in agent_validate() instead.
  if [[ "$ROSETTA_AGENT" == "claude" ]]; then
    echo "  [3f] Injecting test-case-result-validator agent..."
    mkdir -p "$REPO_ROOT/.claude/agents"
    cp "$VALIDATOR_AGENT" "$REPO_ROOT/.claude/agents/test-case-result-validator.md"
  else
    echo "  [3f] Skipping subagent injection — Codex has no subagents."
  fi
}

# 4. Run test case: prompt-request on both, validation, compare
run_case() {
  local dir="${1%/}"
  local name
  name=$(basename "${dir%/}")

  local prompt_request="$dir/prompt-request.md"
  local prompt_validation="$dir/prompt-validation.md"

  # Resolve to absolute paths so Claude uses root_old/root_new as workspace
  local root_old root_new
  root_old=$(cd "$REPO_ROOT" && cd "$dir/root_old" && pwd)
  root_new=$(cd "$REPO_ROOT" && cd "$dir/root_new" && pwd)

  [[ -f "$prompt_request" ]] || { echo "{\"name\":\"$name\",\"status\":\"skipped\",\"reason\":\"prompt-request.md missing\"}"; return 0; }
  [[ -f "$prompt_validation" ]] || { echo "{\"name\":\"$name\",\"status\":\"skipped\",\"reason\":\"prompt-validation missing\"}"; return 0; }

  echo "  [4a] Resolved workspace: root_old=$root_old, root_new=$root_new" >&2
  local prompt_content
  prompt_content=$(cat "$prompt_request")
  local no_questions="You are running in automated test mode. NEVER ask clarifying questions. NEVER wait for user input. NEVER suggest options to choose from. Execute the prompt directly and produce the requested output files immediately."
  echo "  [4b] prompt_content: $prompt_content" >&2
  echo "  [4b] Running prompt-request in root_old ($ROSETTA_AGENT)..." >&2
  agent_prompt "$root_old" "$no_questions" "$prompt_content" "$dir/output_old.log"
  echo "  [4b] root_old done" >&2

  echo "  [4c] Running prompt-request in root_new ($ROSETTA_AGENT)..." >&2
  agent_prompt "$root_new" "$no_questions" "$prompt_content" "$dir/output_new.log"
  echo "  [4c] root_new done" >&2

  echo "  [4d] Computing changed files vs baseline..." >&2
  local root_original="$dir/root_original"
  local files_old files_new files_to_check
  files_old=$(get_changed_files "$root_original" "$root_old" 2>/dev/null || true)
  files_new=$(get_changed_files "$root_original" "$root_new" 2>/dev/null || true)
  files_to_check=$(echo -e "${files_old}\n${files_new}" | sort -u | grep -v '^$')
  local count_old count_new
  count_old=$(printf '%s\n' "$files_old" | grep -c . 2>/dev/null || true)
  count_new=$(printf '%s\n' "$files_new" | grep -c . 2>/dev/null || true)
  count_old=${count_old:-0}
  count_new=${count_new:-0}
  echo "  [4d] Files in root_old: ${count_old//$'\n'/}, root_new: ${count_new//$'\n'/}" >&2
  echo "  [4e] Building validation prompt..." >&2
  local prompt_request_content
  prompt_request_content=$(cat "$prompt_request" 2>/dev/null || echo "")
  local files_section=""
  if [[ -n "$files_to_check" ]]; then
    local root_original_abs
    root_original_abs=$(cd "$REPO_ROOT" && cd "$dir/root_original" 2>/dev/null && pwd) || root_original_abs=""

    # Build instruction diff section from changed instruction files
    local instruction_diff=""
    local trigger_file="$dir/trigger.txt"
    if [[ -f "$trigger_file" ]]; then
      while IFS= read -r trig_line; do
        trig_line=$(echo "${trig_line%%#*}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        [[ -z "$trig_line" ]] && continue
        local old_instr="$root_old/agents/$trig_line"
        local new_instr="$root_new/agents/$trig_line"
        if [[ -f "$old_instr" ]] && [[ -f "$new_instr" ]]; then
          local idiff
          idiff=$(diff -u "$old_instr" "$new_instr" 2>/dev/null || true)
          if [[ -n "$idiff" ]]; then
            instruction_diff="${instruction_diff}
### $trig_line
\`\`\`diff
$idiff
\`\`\`
"
          fi
        fi
      done < "$trigger_file"
    fi

    local instruction_diff_section=""
    if [[ -n "$instruction_diff" ]]; then
      instruction_diff_section="
**Instruction diff** (old → new, what changed in the instructions):
$instruction_diff

**Instruction paths:**
Old instruction: $root_old/agents/
New instruction: $root_new/agents/
"
    fi

    files_section="---
## Context

**Prompt request** (goals to evaluate coverage against):
$prompt_request_content

**Root paths:**
root_original: $root_original_abs
root_old: $root_old
root_new: $root_new
$instruction_diff_section
**Files to check in root_old** (changed vs baseline):
$(echo "$files_old" | sed 's/^/- /' | grep -v '^- $')

**Files to check in root_new** (changed vs baseline):
$(echo "$files_new" | sed 's/^/- /' | grep -v '^- $')

"
  fi

  local validation_prompt
  validation_prompt="$(cat "$prompt_validation")
$files_section
"
  echo "  [4f] Running validation with test-case-result-validator ($ROSETTA_AGENT)..." >&2
  printf '%s' "$validation_prompt" > "$dir/.validation-prompt.txt"
  local validation_output
  local json_file="$dir/validation-result.json"
  validation_output=$(agent_validate "$dir" "$dir/.validation-prompt.txt")
  echo "  [4f] Validation output: $validation_output" >&2
  printf '%s' "$validation_output" > "$json_file"
  rm -f "$dir/.validation-prompt.txt"
  
  echo "  [4g] Determining status..." >&2
  local status="passed"
  status=$(python3 -c "
import sys, json
try:
    obj = json.loads(open(sys.argv[1]).read())
    assert isinstance(obj.get('categories_old'), dict) and len(obj['categories_old']) == 8
    assert isinstance(obj.get('categories_new'), dict) and len(obj['categories_new']) == 8
    assert obj.get('result') in ('passed', 'failed')
    print(obj['result'])
except Exception as e:
    print(f'  [4g] JSON validation error: {e}', file=sys.stderr)
    print('failed')
" "$json_file") || status="failed"
  echo "  [4h] Status: $status" >&2

  echo "{\"name\":\"$name\",\"status\":\"$status\"}"
}

# 5. Format categories table from validation-result.json (pure bash)
# Schema MUST match .github/prompts/test-case-result-validator.md exactly:
# - categories_old, categories_new (objects)
# - 8 category keys: Clarity, Completeness, Structure, Processes, Self-organization, Applicability, Briefness, MECE
# - result: "passed" | "failed"
format_categories() {
  local json_file="$1"
  [[ ! -f "$json_file" ]] && return

  local content
  content=$(cat "$json_file")
  echo "| Category | Old | New |"
  echo "|----------|-----|-----|"

  local cats=(Clarity Completeness Structure Processes Self-organization Applicability Briefness MECE)
  for cat in "${cats[@]}"; do
    local matches o n
    matches=$(echo "$content" | grep -oE "\"$cat\"[[:space:]]*:[[:space:]]*[0-9]+" || true)
    o=$(echo "$matches" | head -1 | grep -oE '[0-9]+$' || echo "-")
    n=$(echo "$matches" | tail -1 | grep -oE '[0-9]+$' || echo "-")
    [[ -z "$o" ]] && o="-"
    [[ -z "$n" ]] && n="-"
    echo "| $cat | $o | $n |"
  done
}

# 6. Write PR comment
write_comment() {
  local overall="$1"
  local reason="$2"
  local body="$3"

  mkdir -p "$(dirname "$PR_COMMENT_FILE")"
  {
    echo "## Validate Test Cases"
    echo ""
    echo "<!-- validate-test-cases -->"
    echo ""
    if [[ "$overall" == "skipped" ]]; then
      echo "**Status:** Skipped — $reason"
    else
      [[ "$overall" == "passed" ]] && echo "**Status:** All passed" || echo "**Status:** Failed"
      echo ""
      echo "$body"
    fi
    echo ""
    echo "---"
  } > "$PR_COMMENT_FILE"
}

# Main
main() {
  echo "[0] Starting run-test-cases.sh"
  echo "  ROSETTA_AGENT=$ROSETTA_AGENT (CLI_CMD=$CLI_CMD)"
  echo "  REPO_ROOT=$REPO_ROOT"
  echo "  BASE_SHA=$BASE_SHA"
  echo "  TEST_LIB=$TEST_LIB"
  echo "  PR_COMMENT_FILE=$PR_COMMENT_FILE"
  echo ""

  cd "$REPO_ROOT" || exit 1
  echo "[2] Resolving test cases to run..."

  if [[ ${#changed[@]} -eq 0 ]]; then
    echo "  No changed files, skipping"
    write_comment "skipped" "No changed files" ""
    exit 0
  fi

  local cases
  cases=$(get_cases)

  if [[ -z "$cases" ]]; then
    echo "  No test cases matched, skipping"
    write_comment "skipped" "No test cases matched" ""
    exit 0
  fi

  echo "  Changed files: ${changed[*]}"
  echo "  Test cases to run:"
  echo "$cases" | sed 's/^/    /'
  echo ""

  local failed=0
  local body=""

  while IFS= read -r dir; do
    [[ -z "$dir" ]] && continue

    local case_name
    case_name=$(basename "${dir%/}")
    echo "[3] prepare_case: $case_name"
    prepare_case "$dir"

    echo "[4] run_case: $case_name"
    local result
    result=$(run_case "$dir")

    echo "[5] Processing result: $case_name"
    local name status
    name=$(echo "$result" | sed -n 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
    status=$(echo "$result" | sed -n 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
    [[ -z "$name" ]] && name="?"
    [[ -z "$status" ]] && status="?"

    [[ "$status" == "failed" ]] && failed=1

    local sym=":white_check_mark:"
    [[ "$status" == "failed" ]] && sym=":x:"
    [[ "$status" == "skipped" ]] && sym=":fast_forward:"

    body="${body}### $name $sym $status"$'\n\n'
    local categories_table
    categories_table=$(format_categories "$dir/validation-result.json")
    [[ -n "$categories_table" ]] && body="${body}${categories_table}"$'\n\n'
    echo "  Case $name: $status"
  done <<< "$cases"

  local overall="passed"
  [[ $failed -eq 1 ]] && overall="failed"

  echo ""
  echo "[6] Writing PR comment..."
  write_comment "$overall" "" "$body"

  echo ""
  echo "Done. Result: $overall"
  echo "Output: $PR_COMMENT_FILE"
  echo "status=$overall" >> "${GITHUB_OUTPUT:-/dev/null}" 2>/dev/null || true

  [[ $failed -eq 1 ]] && exit 1
  exit 0
}

main
