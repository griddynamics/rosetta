#!/bin/bash
# Solr Skill Setup Diagnostic
# Run this anytime to verify your setup is healthy.
#
#   chmod +x check-setup.sh
#   ./check-setup.sh
#
# It checks Claude Code, OpenCode, LM Studio, and the skill files.
# Anything marked ✗ needs attention — see INTERN_SETUP.md sections referenced.

set +e
PASS="✓"
FAIL="✗"
WARN="!"

echo "=== Solr Skill Setup Check ==="
echo

#----- Skill files -----
echo "[ Skill files ]"

# Each entry: skillName:expectedRefCount
SKILLS="solr-query:12 solr-extending:6 solr-semantic-search:8 solr-schema:8"

for entry in $SKILLS; do
  name="${entry%%:*}"
  expected="${entry##*:}"
  if [ -f ~/.claude/skills/$name/SKILL.md ]; then
    SIZE=$(wc -c < ~/.claude/skills/$name/SKILL.md)
    echo "$PASS $name/SKILL.md found ($SIZE bytes)"
    if ! grep -q "^name: $name" ~/.claude/skills/$name/SKILL.md; then
      echo "$FAIL   ...but frontmatter 'name: $name' missing — file may be corrupted"
    fi
    if ! grep -q '^description:' ~/.claude/skills/$name/SKILL.md; then
      echo "$FAIL   ...but frontmatter 'description:' missing — file may be corrupted"
    fi
  else
    echo "$FAIL $name/SKILL.md NOT found at ~/.claude/skills/$name/SKILL.md"
    echo "  → run INTERN_SETUP.md section 1.4 or 2.7"
  fi

  REF_COUNT=$(ls ~/.claude/skills/$name/references/*.md 2>/dev/null | wc -l | tr -d ' ')
  if [ "$REF_COUNT" = "$expected" ]; then
    echo "$PASS $name: all $expected reference files present"
  else
    echo "$FAIL $name: expected $expected reference files, found $REF_COUNT"
    echo "  → re-copy this skill from the repo (skills/solr/)"
  fi
done

echo

#----- Claude Code -----
echo "[ Claude Code ]"
if command -v claude > /dev/null 2>&1; then
  CLAUDE_VER=$(claude --version 2>&1 | head -1)
  echo "$PASS claude CLI: $CLAUDE_VER"
else
  echo "$FAIL claude CLI not installed"
  echo "  → run INTERN_SETUP.md section 1.1"
fi

echo

#----- OpenCode -----
echo "[ OpenCode ]"
if command -v opencode > /dev/null 2>&1; then
  OC_VER=$(opencode --version 2>&1 | head -1)
  echo "$PASS opencode CLI: $OC_VER"
else
  echo "$WARN opencode CLI not installed (skip if you only use Claude Code)"
  echo "  → run INTERN_SETUP.md section 2.5 if you want local model"
fi

if [ -f ~/.config/opencode/opencode.json ]; then
  echo "$PASS OpenCode config exists"
  if grep -q 'PASTE_MODEL_ID_HERE' ~/.config/opencode/opencode.json 2>/dev/null; then
    echo "$FAIL   ...but model id is still 'PASTE_MODEL_ID_HERE' — edit the file"
    echo "  → INTERN_SETUP.md section 2.6"
  fi
  if ! python3 -c "import json; json.load(open('$HOME/.config/opencode/opencode.json'))" 2>/dev/null; then
    echo "$FAIL   ...but config is INVALID JSON — fix syntax"
  fi
else
  echo "$WARN OpenCode config not found"
  echo "  → run INTERN_SETUP.md section 2.6 if using local model"
fi

echo

#----- LM Studio server -----
echo "[ LM Studio server ]"
if curl -sf -m 3 http://127.0.0.1:1234/v1/models > /dev/null 2>&1; then
  echo "$PASS LM Studio server reachable on http://127.0.0.1:1234"
  MODELS=$(curl -s -m 3 http://127.0.0.1:1234/v1/models 2>/dev/null \
    | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    for m in d.get('data', []):
        print('    - ' + m.get('id', '?'))
except Exception as e:
    sys.exit(1)
" 2>/dev/null)
  if [ -n "$MODELS" ]; then
    echo "  Loaded model id(s):"
    echo "$MODELS"
    echo "  ↑ THIS is what should appear as the key in opencode.json under 'models'"
  else
    echo "$WARN   ...but no models loaded in LM Studio — load Qwen3.6 in the app"
  fi
else
  echo "$WARN LM Studio server NOT reachable on :1234"
  echo "  This is FINE if you only use Claude Code."
  echo "  Otherwise: open LM Studio, Developer tab, toggle Status to Running"
  echo "  → INTERN_SETUP.md section 2.3"
fi

echo

#----- Anthropic auth -----
echo "[ Anthropic auth ]"
if [ -f ~/.claude.json ] || [ -f ~/.config/claude/config.json ] || [ -n "$ANTHROPIC_API_KEY" ]; then
  echo "$PASS Anthropic credentials configured"
else
  echo "$WARN Anthropic credentials not detected"
  echo "  → run 'claude' once to set up; INTERN_SETUP.md section 1.3"
fi

echo
echo "=== Done ==="
echo
echo "Legend: $PASS pass   $FAIL fail   $WARN warn (only relevant if you need that path)"
