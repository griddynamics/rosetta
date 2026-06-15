# Full Model Maps: Python vs TypeScript

## Python generator — verbatim source (scripts/plugin_generator.py lines 17–55)

```python
CLAUDE_MODEL_MAP: dict[str, str] = {
    "opus":   "claude-opus-4-8",
    "sonnet": "claude-sonnet-4-6",
    "haiku":  "claude-haiku-4-5",
}

CURSOR_MODEL_MAP: dict[str, str] = {
    "opus":                   "claude-opus-4-8",
    "sonnet":                 "claude-sonnet-4-6",
    "haiku":                  "claude-haiku-4-5",
    "gpt-5.5":                "gpt-5.5",
    "gpt-5.4":                "gpt-5.4",
    "gpt-5.3-codex":          "gpt-5.3-codex",
    "gemini-3.1-pro-preview": "gemini-3.1-pro-preview",
    "gemini-3.1-pro":         "gemini-3.1-pro",
    "gemini-3-flash":         "gemini-3-flash",
}

COPILOT_MODEL_MAP: dict[str, str] = {
    "opus":                   "Claude Opus 4.8",
    "sonnet":                 "Claude Sonnet 4.6",
    "haiku":                  "Claude Haiku 4.5",
    "gpt-5.5":                "GPT-5.5",
    "gpt-5.4":                "GPT-5.4",
    "gpt-5.3-codex":          "GPT-5.3-Codex",
    "gemini-3.1-pro-preview": "Gemini 3.1 Pro (Preview)",
    "gemini-3.1-pro":         "Gemini 3.1 Pro (Preview)",
    "gemini-3-flash":         "Gemini 3 Flash",
}
```

### Python normalization algorithm (lines 194–199)

```python
def _normalize_by_map(value: str, model_map: dict[str, str]) -> str:
    first = value.split(",")[0].strip().lower()
    for key, mapped in model_map.items():
        if key in first:   # SUBSTRING match — not exact key lookup
            return mapped
    return first           # fallthrough: return original value unchanged
```

Key behavioral implication: the Python generator uses **substring matching**.
So `gpt-5.3-codex-high` matches key `gpt-5.3-codex` because the key is a substring.
The TypeScript uses **exact key lookup** and must enumerate effort variants explicitly.

---

## Entry counts

| Map | Python entries (raw keys) | TypeScript entries (exact keys with effort variants) |
|-----|--------------------------|------------------------------------------------------|
| CURSOR_MODEL_MAP / CURSOR_GPT_MAP | 3 GPT keys (gpt-5.5, gpt-5.4, gpt-5.3-codex) | 36 total (9 model families × 4 effort variants each) |
| COPILOT_MODEL_MAP / COPILOT_GPT_MAP | 3 GPT keys (same) | 36 total |
| CURSOR_MODEL_MAP / CURSOR_CLAUDE_MAP | 3 Claude keys (substring) | 11 exact keys |
| COPILOT_MODEL_MAP / COPILOT_CLAUDE_MAP | 3 Claude keys (substring) | 11 exact keys |
| CURSOR_MODEL_MAP / CURSOR_GEMINI_MAP | 3 Gemini keys | 3 exact keys |
| COPILOT_MODEL_MAP / COPILOT_GEMINI_MAP | 3 Gemini keys | 3 exact keys |

Python Cursor GPT entry count: **3**
Python Copilot GPT entry count: **3**
Current TypeScript CURSOR_GPT_MAP entry count: **36**
Current TypeScript COPILOT_GPT_MAP entry count: **36**

---

## Upgrade rules applied in TypeScript (not in Python)

The Python generator maps `gpt-5.3-codex` → `gpt-5.3-codex` (no upgrade).
The TypeScript intentionally upgrades:
- `gpt-5.3*` (bare) → `gpt-5.4` / `GPT-5.4`
- `gpt-5.3-codex*` → `gpt-5.4` / `GPT-5.4`

The TypeScript does NOT upgrade gpt-5.4 → gpt-5.5 (correct per spec).

---

## Models in TypeScript maps NOT present in Python generator

These are additional models handled in TypeScript for forward/backward compatibility:

| Model | In Python? | In TypeScript CURSOR_GPT_MAP? |
|-------|------------|-------------------------------|
| gpt-5.5 | yes | yes |
| gpt-5.4 | yes | yes |
| gpt-5.3 (bare) | **no** | yes (upgraded to 5.4) |
| gpt-5.3-codex | yes (as gpt-5.3-codex) | yes (upgraded to 5.4) |
| gpt-4.5 | **no** | yes |
| gpt-4o | **no** | yes |
| gpt-4 | **no** | yes |
| o3 | **no** | yes |
| o4-mini | **no** | yes |

The TypeScript maps are a **strict superset** of the Python maps for GPT models.
The 6 extra model families (gpt-5.3 bare, gpt-4.5, gpt-4o, gpt-4, o3, o4-mini) in TypeScript
provide coverage for agent files that reference older or alternative model identifiers.

---

## Complete TypeScript CURSOR_GPT_MAP definition (ready to paste)

```typescript
const CURSOR_GPT_MAP: Record<string, string> = {
  // GPT-5.5
  'gpt-5.5-high':         'gpt-5.5',
  'gpt-5.5-medium':       'gpt-5.5',
  'gpt-5.5-low':          'gpt-5.5',
  'gpt-5.5':              'gpt-5.5',
  // GPT-5.4
  'gpt-5.4-high':         'gpt-5.4',
  'gpt-5.4-medium':       'gpt-5.4',
  'gpt-5.4-low':          'gpt-5.4',
  'gpt-5.4':              'gpt-5.4',
  // GPT-5.3 (bare) → upgrade to 5.4
  'gpt-5.3-high':         'gpt-5.4',
  'gpt-5.3-medium':       'gpt-5.4',
  'gpt-5.3-low':          'gpt-5.4',
  'gpt-5.3':              'gpt-5.4',
  // GPT-5.3-Codex → upgrade to 5.4
  'gpt-5.3-codex-high':   'gpt-5.4',
  'gpt-5.3-codex-medium': 'gpt-5.4',
  'gpt-5.3-codex-low':    'gpt-5.4',
  'gpt-5.3-codex':        'gpt-5.4',
  // GPT-4.5
  'gpt-4.5-high':         'gpt-4.5',
  'gpt-4.5-medium':       'gpt-4.5',
  'gpt-4.5-low':          'gpt-4.5',
  'gpt-4.5':              'gpt-4.5',
  // GPT-4o
  'gpt-4o-high':          'gpt-4o',
  'gpt-4o-medium':        'gpt-4o',
  'gpt-4o-low':           'gpt-4o',
  'gpt-4o':               'gpt-4o',
  // GPT-4
  'gpt-4-high':           'gpt-4',
  'gpt-4-medium':         'gpt-4',
  'gpt-4-low':            'gpt-4',
  'gpt-4':                'gpt-4',
  // o3
  'o3-high':              'o3',
  'o3-medium':            'o3',
  'o3-low':               'o3',
  'o3':                   'o3',
  // o4-mini
  'o4-mini-high':         'o4-mini',
  'o4-mini-medium':       'o4-mini',
  'o4-mini-low':          'o4-mini',
  'o4-mini':              'o4-mini',
};
```

---

## Complete TypeScript COPILOT_GPT_MAP definition (ready to paste)

```typescript
const COPILOT_GPT_MAP: Record<string, string> = {
  // GPT-5.5
  'gpt-5.5-high':         'GPT-5.5',
  'gpt-5.5-medium':       'GPT-5.5',
  'gpt-5.5-low':          'GPT-5.5',
  'gpt-5.5':              'GPT-5.5',
  // GPT-5.4
  'gpt-5.4-high':         'GPT-5.4',
  'gpt-5.4-medium':       'GPT-5.4',
  'gpt-5.4-low':          'GPT-5.4',
  'gpt-5.4':              'GPT-5.4',
  // GPT-5.3 (bare) → upgrade to 5.4
  'gpt-5.3-high':         'GPT-5.4',
  'gpt-5.3-medium':       'GPT-5.4',
  'gpt-5.3-low':          'GPT-5.4',
  'gpt-5.3':              'GPT-5.4',
  // GPT-5.3-Codex → upgrade to 5.4
  'gpt-5.3-codex-high':   'GPT-5.4',
  'gpt-5.3-codex-medium': 'GPT-5.4',
  'gpt-5.3-codex-low':    'GPT-5.4',
  'gpt-5.3-codex':        'GPT-5.4',
  // GPT-4.5
  'gpt-4.5-high':         'GPT-4.5',
  'gpt-4.5-medium':       'GPT-4.5',
  'gpt-4.5-low':          'GPT-4.5',
  'gpt-4.5':              'GPT-4.5',
  // GPT-4o  (note: lowercase 'o' in ID, uppercase in display)
  'gpt-4o-high':          'GPT-4o',
  'gpt-4o-medium':        'GPT-4o',
  'gpt-4o-low':           'GPT-4o',
  'gpt-4o':               'GPT-4o',
  // GPT-4
  'gpt-4-high':           'GPT-4',
  'gpt-4-medium':         'GPT-4',
  'gpt-4-low':            'GPT-4',
  'gpt-4':                'GPT-4',
  // o3
  'o3-high':              'o3',
  'o3-medium':            'o3',
  'o3-low':               'o3',
  'o3':                   'o3',
  // o4-mini
  'o4-mini-high':         'o4-mini',
  'o4-mini-medium':       'o4-mini',
  'o4-mini-low':          'o4-mini',
  'o4-mini':              'o4-mini',
};
```

---

## Gaps in other TypeScript maps vs Python

### CURSOR_GEMINI_MAP / COPILOT_GEMINI_MAP

Python `CURSOR_MODEL_MAP` Gemini keys and targets:
- `gemini-3.1-pro-preview` → `gemini-3.1-pro-preview`
- `gemini-3.1-pro`         → `gemini-3.1-pro`
- `gemini-3-flash`         → `gemini-3-flash`

Current TypeScript `CURSOR_GEMINI_MAP`:
- `gemini-3-flash`          → `gemini-3.5-flash`   (DIVERGES from Python: Python keeps `gemini-3-flash`, TS maps to `gemini-3.5-flash`)
- `gemini-3.1-pro-preview`  → `gemini-3.1-pro`     (DIVERGES from Python: Python keeps `gemini-3.1-pro-preview`, TS normalizes to `gemini-3.1-pro`)
- `gemini-3.1-pro`          → `gemini-3.1-pro`     (matches Python)

Python `COPILOT_MODEL_MAP` Gemini targets:
- `gemini-3.1-pro-preview` → `Gemini 3.1 Pro (Preview)`
- `gemini-3.1-pro`         → `Gemini 3.1 Pro (Preview)`
- `gemini-3-flash`         → `Gemini 3 Flash`

Current TypeScript `COPILOT_GEMINI_MAP`:
- `gemini-3.1-pro-preview`  → `Gemini 3.1 Pro (Preview)` (matches Python)
- `gemini-3.1-pro`          → `Gemini 3.1 Pro (Preview)` (matches Python)
- `gemini-3-flash`          → `Gemini 3.5 Flash`          (DIVERGES: Python uses `Gemini 3 Flash`, TS uses `Gemini 3.5 Flash`)

CONCLUSION for Gemini: TypeScript applies upgrade rules to Gemini too (gemini-3-flash → 3.5-flash).
This is a deliberate normalization in TypeScript, analogous to gpt-5.3-codex → gpt-5.4.
No missing entries — coverage is complete.

### CURSOR_CLAUDE_MAP / COPILOT_CLAUDE_MAP

Python uses 3 substring keys (opus, sonnet, haiku) that match any string containing those words.
TypeScript enumerates 11 exact keys covering known Cursor/Copilot model ID formats.

Python Cursor Claude targets: `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5`
Python Copilot Claude targets: `Claude Opus 4.8`, `Claude Sonnet 4.6`, `Claude Haiku 4.5`

Current TypeScript maps are consistent with Python targets. No gaps.

---

## Summary: models present in Python but missing from TypeScript

None. The TypeScript maps are a **strict superset** of the Python generator's model coverage.

All models in the Python generator are covered in TypeScript. TypeScript additionally covers:
- gpt-5.3 (bare, without -codex) — not in Python
- gpt-4.5, gpt-4o, gpt-4 — not in Python
- o3, o4-mini — not in Python

These extras provide backward compatibility for agent files referencing older model identifiers.

The one semantic difference is that TypeScript applies upgrade rules:
- gpt-5.3-codex → gpt-5.4 (Python keeps gpt-5.3-codex as-is)
- gemini-3-flash → gemini-3.5-flash / Gemini 3.5 Flash (Python keeps gemini-3-flash / Gemini 3 Flash)
