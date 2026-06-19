#!/usr/bin/env python3
"""Plugin generator: syncs instruction sources into IDE plugin folders."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from pybars import Compiler

CLAUDE_MODEL_MAP: dict[str, str] = {
    "opus":   "claude-opus-4-8",
    "sonnet": "claude-sonnet-4-6",
    "haiku":  "claude-haiku-4-5",
}

ALLOWED_CLAUDE_MODELS = set(CLAUDE_MODEL_MAP.values()) | {"inherit"}

EXCLUDED_RULE_FILES = {"rules/bootstrap.md", "rules/local-files-mode.md"}

BOOTSTRAP_PREFIX = (
    "ALWAYS MUST FULLY READ THIS ENTIRE CONTEXT BEFORE PROCEEDING FROM FILE PATH PROVIDED"
    " ESPECIALLY IF TRUNCATED/PREVIEWED. DO IT NOW! THEN PROCEED.\n"
    "Rosetta get_context_instructions:\n"
)

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


DEFAULT_RELEASE = "r2"


@dataclass(frozen=True)
class Release:
    """A Rosetta instructions release: its name, instruction source, and the
    key-values handed verbatim to the template engine when generating from it.

    `template_vars` is the single source of per-release truth. Adding a future
    release (e.g. r4) is one entry here — the generator code stays release-agnostic.
    """

    name: str
    source: Path
    template_vars: dict[str, object]


def _get_releases(repo_root: Path) -> dict[str, Release]:
    instructions = repo_root / "instructions"
    return {
        "r2": Release(
            "r2",
            instructions / "r2" / "core",
            {"release": "r2", "deterministic_hooks": False},
        ),
        "r3": Release(
            "r3",
            instructions / "r3" / "core",
            {"release": "r3", "deterministic_hooks": True},
        ),
    }


@dataclass(frozen=True)
class StandaloneSpec:
    name: str
    source_plugin: str
    destination: Path
    subfolder: str
    excluded_source_folder: str
    pre_cleanup: tuple[str, ...] = ()
    pre_move_files: tuple[tuple[str, str, str, str], ...] = ()
    rename_folders: tuple[tuple[str, str], ...] = ()
    rename_files: tuple[tuple[str, str], ...] = ()
    regenerated_indexes: tuple[tuple[str, str | None], ...] = ()
    post_cleanup: tuple[str, ...] = ()
    copilot_instructions: bool = False
    cursor_instructions: bool = False
    inject_indexes: tuple[tuple[str, str], ...] = ()


@dataclass(frozen=True)
class PluginSyncSpec:
    name: str
    destination: Path
    preserved_folder: str
    preserved_files: tuple[str, ...] = ()
    normalize_models: bool = False
    copilot_models: bool = False
    cursor_models: bool = False
    codex_models: bool = False
    rename_agents: bool = False
    rename_folders: tuple[tuple[str, str], ...] = ()
    rename_files: tuple[tuple[str, str], ...] = ()
    pre_copy_folders: tuple[tuple[str, str], ...] = ()
    pre_move_files: tuple[tuple[str, str, str, str], ...] = ()
    generated_indexes: tuple[str, ...] = ()
    include_bootstrap_in_hooks: bool = True
    include_indexes_in_hooks: bool = True
    templates: tuple[str, ...] = ()
    hook_subdir: Path | None = None
    runtime_asset_subdirs: tuple[Path, ...] = ()


def _get_plugin_specs(repo_root: Path, plugins_dir: Path | None = None) -> list[PluginSyncSpec]:
    plugins_dir = plugins_dir if plugins_dir is not None else repo_root / "plugins"
    return [
        PluginSyncSpec(
            name="core-claude",
            destination=plugins_dir / "core-claude",
            preserved_folder=".claude-plugin",
            preserved_files=("hooks",),
            normalize_models=True,
            generated_indexes=("rules", "workflows"),
            templates=("hooks/hooks.json.tmpl",),
            hook_subdir=Path("hooks"),
        ),
        PluginSyncSpec(
            name="core-cursor",
            destination=plugins_dir / "core-cursor",
            preserved_folder=".cursor-plugin",
            preserved_files=("hooks", "hooks.json.tmpl"),
            cursor_models=True,
            rename_folders=(("workflows", "commands"),),
            rename_files=((r"rules/(.+)\.md", r"\1.mdc"),),
            generated_indexes=("rules", "commands"),
            templates=("hooks/hooks.json.tmpl", "hooks.json.tmpl"),
            hook_subdir=Path("hooks"),
        ),
        PluginSyncSpec(
            name="core-copilot",
            destination=plugins_dir / "core-copilot",
            preserved_folder=".github",
            preserved_files=("hooks",),
            copilot_models=True,
            rename_agents=True,
            rename_folders=(("workflows", "commands"),),
            generated_indexes=("rules", "commands"),
            templates=(".github/plugin/hooks.json.tmpl", "hooks/hooks.json.tmpl"),
            hook_subdir=Path("hooks"),
        ),
        PluginSyncSpec(
            name="core-codex",
            destination=plugins_dir / "core-codex",
            preserved_folder=".codex-plugin",
            codex_models=True,
            generated_indexes=("rules", "workflows"),
            templates=(".codex-plugin/hooks.json.tmpl",),
            hook_subdir=Path(".codex") / "hooks",
        ),
    ]


def normalize_claude_model(value: str) -> str:
    lowered = value.strip().lower()
    if lowered in ALLOWED_CLAUDE_MODELS:
        return lowered
    if "opus" in lowered:
        return CLAUDE_MODEL_MAP["opus"]
    if "sonnet" in lowered:
        return CLAUDE_MODEL_MAP["sonnet"]
    if "haiku" in lowered:
        return CLAUDE_MODEL_MAP["haiku"]
    return "inherit"


def _normalize_by_map(value: str, model_map: dict[str, str]) -> str:
    first = value.split(",")[0].strip().lower()
    for key, mapped in model_map.items():
        if key in first:
            return mapped
    return first


def normalize_copilot_model(value: str) -> str:
    return _normalize_by_map(value, COPILOT_MODEL_MAP)


def normalize_cursor_model(value: str) -> str:
    return _normalize_by_map(value, CURSOR_MODEL_MAP)


def normalize_codex_model(value: str) -> tuple[str | None, str | None]:
    for raw_candidate in value.split(","):
        candidate = raw_candidate.strip()
        if not candidate.startswith("gpt-"):
            continue

        base, separator, tail = candidate.rpartition("-")
        if separator and tail in {"low", "medium", "high", "minimal", "xhigh"} and base.startswith("gpt-"):
            effort = tail if tail in {"low", "medium", "high"} else None
            return base, effort

        return candidate, None

    return None, None


def rewrite_frontmatter_models(content: str, normalizer: Callable[[str], str] = normalize_claude_model) -> str:
    if not content.startswith("---\n"):
        return content

    end = content.find("\n---\n", 4)
    if end == -1:
        return content

    frontmatter = content[4:end]

    def replace_model(match: re.Match[str]) -> str:
        prefix = match.group("prefix")
        value = match.group("value")
        suffix = match.group("suffix")
        return f"{prefix}{normalizer(value)}{suffix}"

    updated = re.sub(
        r"(?m)^(?P<prefix>model:\s*)(?P<value>.*?)(?P<suffix>\s*)$",
        replace_model,
        frontmatter,
    )
    return f"---\n{updated}{content[end:]}"


def rewrite_codex_frontmatter_models(content: str) -> str:
    if not content.startswith("---\n"):
        return content

    end = content.find("\n---\n", 4)
    if end == -1:
        return content

    frontmatter = content[4:end]
    rewritten_lines: list[str] = []

    for line in frontmatter.splitlines():
        if line.startswith("model:"):
            model, effort = normalize_codex_model(line.split(":", 1)[1].strip())
            if model:
                rewritten_lines.append(f"model: {model}")
                if effort:
                    rewritten_lines.append(f"model_reasoning_effort: {effort}")
            continue

        if line.startswith("model_reasoning_effort:"):
            continue

        rewritten_lines.append(line)

    rewritten_frontmatter = "\n".join(rewritten_lines)
    return f"---\n{rewritten_frontmatter}{content[end:]}"


def reset_generated_tree(
    destination: Path,
    preserved_folder: str,
    preserved_files: tuple[str, ...] = (),
) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    preserved = {preserved_folder, *preserved_files}
    deleted_count = 0
    for child in destination.iterdir():
        if child.name in preserved:
            continue
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()
        deleted_count += 1

    print(
        f"      deleted {deleted_count} item(s) from {destination} preserving {', '.join(sorted(preserved))}",
        flush=True,
    )


def copy_core_tree(spec: PluginSyncSpec, core_source: Path) -> dict[str, str]:
    destination = spec.destination
    copied_count = 0
    renamed_count = 0

    if spec.codex_models:
        normalizer = None
    elif spec.copilot_models:
        normalizer = normalize_copilot_model
    elif spec.cursor_models:
        normalizer = normalize_cursor_model
    else:
        normalizer = normalize_claude_model

    should_normalize = spec.normalize_models or spec.copilot_models or spec.cursor_models or spec.codex_models
    folder_renames: dict[str, str] = dict(spec.rename_folders)

    # pre_copy_folders: copy source folders under alternate names before the rename pass.
    # Only model frontmatter is normalized; no path_renames content rewriting, no file renames.
    for src_folder, tgt_folder in spec.pre_copy_folders:
        src_path = core_source / src_folder
        if not src_path.is_dir():
            continue
        tgt_path = destination / tgt_folder
        if tgt_path.exists():
            shutil.rmtree(tgt_path)
        shutil.copytree(src_path, tgt_path)
        normalized = 0
        if should_normalize:
            for md_file in sorted(tgt_path.rglob("*.md")):
                content = md_file.read_text(encoding="utf-8")
                if spec.codex_models:
                    content = rewrite_codex_frontmatter_models(content)
                else:
                    content = rewrite_frontmatter_models(content, normalizer=normalizer)
                md_file.write_text(content, encoding="utf-8")
                normalized += 1
        print(
            f"      pre-copied {src_folder}/ → {tgt_folder}/"
            + (f" ({normalized} model-normalized)" if normalized else ""),
            flush=True,
        )

    # Build path_renames: maps source-relative path → final destination-relative path.
    # Covers both folder renames and regex file renames so content rewriting is precise.
    path_renames: dict[str, str] = {}
    if folder_renames or spec.rename_files:
        for src in sorted(core_source.rglob("*")):
            if src.is_dir():
                continue
            rel = src.relative_to(core_source)
            source_rel = "/".join(rel.parts)
            parts = list(rel.parts)
            if folder_renames:
                parts[0] = folder_renames.get(parts[0], parts[0])
            intermediate_rel = "/".join(parts)
            final_rel = (
                _apply_rename_files(intermediate_rel, spec.rename_files)
                if spec.rename_files else None
            ) or intermediate_rel
            if final_rel != source_rel:
                path_renames[source_rel] = final_rel
    # Add folder-level entries so bare "workflows/" references in instruction text are also updated
    for old_folder, new_folder in folder_renames.items():
        path_renames[f"{old_folder}/"] = f"{new_folder}/"

    for source_file in sorted(core_source.rglob("*")):
        if source_file.name == ".DS_Store":
            continue

        relative_path = source_file.relative_to(core_source)
        if folder_renames:
            parts = list(relative_path.parts)
            parts[0] = folder_renames.get(parts[0], parts[0])
            target = destination / Path(*parts)
        else:
            target = destination / relative_path

        if source_file.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue

        if str(relative_path) in EXCLUDED_RULE_FILES:
            continue

        # Rename agents/*.md → agents/*.agent.md for Copilot
        if spec.rename_agents and _is_agent_file(relative_path):
            target = target.with_suffix(".agent.md")
            renamed_count += 1

        # Rename files using regex patterns (e.g. rules/*.md → rules/*.mdc for Cursor)
        if spec.rename_files:
            dest_rel = "/".join(target.relative_to(destination).parts)
            new_rel = _apply_rename_files(dest_rel, spec.rename_files)
            if new_rel:
                target = destination / new_rel
                renamed_count += 1

        target.parent.mkdir(parents=True, exist_ok=True)

        if source_file.suffix == ".md" and (should_normalize or path_renames):
            source_content = source_file.read_text(encoding="utf-8")
            if should_normalize:
                if spec.codex_models:
                    rewritten = rewrite_codex_frontmatter_models(source_content)
                else:
                    rewritten = rewrite_frontmatter_models(source_content, normalizer=normalizer)
            else:
                rewritten = source_content
            for old, new in path_renames.items():
                rewritten = rewritten.replace(old, new)
            target.write_text(rewritten, encoding="utf-8")
            shutil.copystat(source_file, target, follow_symlinks=True)
            copied_count += 1
            continue

        shutil.copy2(source_file, target)
        copied_count += 1

    msg = f"      copied {copied_count} item(s) to {destination}"
    if renamed_count:
        msg += f" (renamed {renamed_count} file(s))"
    print(msg, flush=True)
    return path_renames


def _extract_frontmatter_field(content: str, field: str) -> str:
    """Extract a field value from YAML frontmatter."""
    if not content.startswith("---\n"):
        return ""
    end = content.find("\n---\n", 4)
    if end == -1:
        return ""
    frontmatter = content[4:end]
    match = re.search(rf"(?m)^{field}:\s*(.+)$", frontmatter)
    return match.group(1).strip() if match else ""


def _extract_frontmatter_and_body(content: str) -> tuple[str, str]:
    if not content.startswith("---\n"):
        return "", content

    end = content.find("\n---\n", 4)
    if end == -1:
        return "", content

    return content[4:end], content[end + len("\n---\n") :]


def strip_frontmatter(content: str) -> str:
    _, body = _extract_frontmatter_and_body(content)
    return body


def json_escape_for_additional_context(content: str) -> str:
    content = content.replace("\\", "\\\\")
    content = content.replace('"', '\\"')
    content = content.replace("\n", "\\n")
    content = content.replace("\r", "\\r")
    content = content.replace("\t", "\\t")
    return content


def _bash_single_quote_escape(content: str) -> str:
    """Escape single quotes for safe embedding inside a bash single-quoted string."""
    return content.replace("'", "'\\''")


def _ps_single_quote_escape(content: str) -> str:
    """Escape single quotes for safe embedding inside a PowerShell single-quoted string."""
    return content.replace("'", "''")


def _bash_lock(n: int) -> str:
    cleanup = (
        'find /tmp -maxdepth 1 -name "rosetta-bs-*.lock" -mmin +1 -delete 2>/dev/null; '
        if n == 0 else ""
    )
    return (
        f"{cleanup}"
        f"INPUT=$(cat); "
        f"SESSION_ID=$(printf '%s' \"$INPUT\" | sed -n 's/.*\"session_id\":\"\\([^\"]*\\)\".*/\\1/p'); "
        f'LOCK="/tmp/rosetta-bs-${{SESSION_ID:-$$}}-{n}.lock"; '
        f'if [ -f "$LOCK" ]; then exit 0; fi; touch "$LOCK"'
    )


def _ps_lock(n: int) -> str:
    cleanup = (
        'Get-ChildItem "$env:TEMP\\rosetta-bs-*-0.lock" -ErrorAction SilentlyContinue | '
        'Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-1) } | '
        'Remove-Item -Force -ErrorAction SilentlyContinue; '
        if n == 0 else ""
    )
    return (
        f"{cleanup}"
        f"$Inp = [Console]::In.ReadToEnd(); "
        f'$Sid = if ($Inp -match \'"session_id":"([^"]*)"\') {{ $Matches[1] }} '
        f"else {{ [System.Diagnostics.Process]::GetCurrentProcess().Id }}; "
        f'$Lk = "$env:TEMP\\rosetta-bs-$Sid-{n}.lock"; '
        f"if (Test-Path $Lk) {{ exit 0 }}; "
        f"New-Item -Path $Lk -ItemType File -Force | Out-Null"
    )


_BOOTSTRAP_FILES: tuple[str, ...] = (
    # plugin-files-mode variants MUST stay FIRST in this tuple.
    # `build_bootstrap_replacements` attaches BOOTSTRAP_PREFIX to the first
    # bootstrap-classified entry it finds per plugin; reordering this list
    # would silently move the prefix onto a different file.
    # Hooks read from each plugin's own destination; missing variants are
    # silently skipped per plugin.
    "rules/plugin-files-mode.md",     # claude, codex, copilot
    "rules/plugin-files-mode.mdc",    # cursor
    # bootstrap-* rules
    "rules/bootstrap-core-policy.md",
    "rules/bootstrap-core-policy.mdc",
    "rules/bootstrap-execution-policy.md",
    "rules/bootstrap-execution-policy.mdc",
    "rules/bootstrap-hitl-questioning.md",
    "rules/bootstrap-hitl-questioning.mdc",
    "rules/bootstrap-guardrails.md",
    "rules/bootstrap-guardrails.mdc",
    "rules/bootstrap-rosetta-files.md",
    "rules/bootstrap-rosetta-files.mdc",
    # indexes
    "rules/INDEX.md",
    "workflows/INDEX.md",   # claude, codex
    "commands/INDEX.md",    # cursor, copilot
)

_PLUGIN_PATH_HOOKS: dict[str, dict] = {
    "core-claude": {"type": "command", "command": 'printf \'%s\' "{\\\"hookSpecificOutput\\\":{\\\"hookEventName\\\":\\\"SessionStart\\\",\\\"additionalContext\\\":\\\"Rosetta Plugin Path: ${CLAUDE_PLUGIN_ROOT}\\\"}}"', "once": True},
    "core-codex": {
        "type": "command",
        "command": (
            'workspace_root="$PWD"; '
            'while [ "$workspace_root" != "/" ] && '
            '[ ! -f "$workspace_root/.agents/rules/bootstrap-rosetta-files.md" ]; do '
            'workspace_root="$(dirname "$workspace_root")"; done; '
            'if [ -f "$workspace_root/.agents/rules/bootstrap-rosetta-files.md" ]; then '
            'printf \'%s\' "{\\\"hookSpecificOutput\\\":{\\\"hookEventName\\\":\\\"SessionStart\\\",\\\"additionalContext\\\":\\\"Rosetta Plugin Path: $workspace_root/.agents\\\"}}"; fi'
        ),
        "statusMessage": "Loading Rosetta bootstrap",
        "timeout": 30,
    },
    "core-copilot": {
        "type": "command",
        "bash": (
            'for base in "$HOME/.vscode/agent-plugins" '
            '"$HOME/.local/share/Code/agentPlugins"; do '
            'root="$base/github.com/griddynamics/rosetta/plugins/core-copilot"; '
            'if [ -f "$root/commands/coding-flow.md" ]; then '
            'printf \'%s\' "{\\\"hookSpecificOutput\\\":{\\\"hookEventName\\\":\\\"SessionStart\\\",\\\"additionalContext\\\":\\\"Rosetta Plugin Path: $root\\\"}}"; '
            'break; fi; done'
        ),
        "powershell": (
            '$root = "$env:LOCALAPPDATA\\Code\\agentPlugins\\github.com\\griddynamics\\rosetta\\plugins\\core-copilot"; '
            'if (Test-Path "$root\\commands\\coding-flow.md") '
            '{ Write-Output (\'{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Rosetta Plugin Path: \' + $root + \'"}}\') }'
        ),
    },
    "core-cursor": {"type": "command", "command": 'printf \'{"additional_context":"Rosetta Plugin Path: %s"}\' "${CURSOR_PROJECT_DIR}"'},
}

def build_bootstrap_replacements(
    plugin_destinations: dict[str, Path],
    plugin_flags: dict[str, tuple[bool, bool]],
) -> tuple[dict[str, str], int]:
    """Build per-plugin bootstrap-hook payloads, reading each plugin's own files.

    For each plugin in `plugin_destinations`, iterate `_BOOTSTRAP_FILES` and read
    those that exist under the plugin's destination. Missing variants are silently
    skipped (one plugin's layout is not another's). `BOOTSTRAP_PREFIX` is applied
    to the first *bootstrap-classified* entry found per plugin.

    `plugin_flags` maps plugin name → (include_bootstrap, include_indexes); each
    entry is classified "bootstrap" or "index" by path and appended only when the
    corresponding flag is True for that plugin.

    Returns (replacements dict, violation count).
    """
    violations = 0
    errors: list[str] = []
    plugin_entries: dict[str, list[dict]] = {name: [] for name in plugin_destinations}

    for plugin_name, dest in plugin_destinations.items():
        inc_bs, inc_idx = plugin_flags.get(plugin_name, (True, True))
        prefix_applied = False
        entries = plugin_entries[plugin_name]

        for rel_file in _BOOTSTRAP_FILES:
            src = dest / rel_file
            if not src.is_file():
                continue  # silent — most variants are not present in any given plugin

            kind = "index" if rel_file.endswith("/INDEX.md") else "bootstrap"
            if kind == "bootstrap" and not inc_bs:
                continue
            if kind == "index" and not inc_idx:
                continue

            body = strip_frontmatter(src.read_text(encoding="utf-8"))
            if kind == "bootstrap" and not prefix_applied:
                text = BOOTSTRAP_PREFIX + body
                prefix_applied = True
            else:
                text = body
            escaped = json_escape_for_additional_context(text)
            bash_escaped = _bash_single_quote_escape(escaped)
            ps_escaped = _ps_single_quote_escape(escaped)

            if len(escaped) > 10000:
                errors.append(
                    f"ERROR: {plugin_name} {rel_file} additionalContext is {len(escaped)} chars (max 10000)"
                )
                violations += 1

            n_lock = len(entries)  # unique per-plugin lock index for copilot
            if plugin_name == "core-claude":
                entries.append({
                    "type": "command",
                    "command": f'printf \'%s\' \'{{"hookSpecificOutput":{{"hookEventName":"SessionStart","additionalContext":"{bash_escaped}"}}}}\'',
                    "once": True,
                })
            elif plugin_name == "core-codex":
                entries.append({
                    "type": "command",
                    "command": f'printf \'%s\' \'{{"hookSpecificOutput":{{"hookEventName":"SessionStart","additionalContext":"{bash_escaped}"}}}}\'',
                    "statusMessage": "Loading Rosetta bootstrap",
                    "timeout": 30,
                })
            elif plugin_name == "core-cursor":
                entries.append({
                    "type": "command",
                    "command": f'printf \'%s\' \'{{"additional_context":"{bash_escaped}"}}\'',
                })
            elif plugin_name == "core-copilot":
                entries.append({
                    "type": "command",
                    "bash": f'{_bash_lock(n_lock)}; printf \'%s\' \'{{"hookSpecificOutput":{{"hookEventName":"SessionStart","additionalContext":"{bash_escaped}"}}}}\'',
                    "powershell": f'{_ps_lock(n_lock)}; Write-Output \'{{"hookSpecificOutput":{{"hookEventName":"SessionStart","additionalContext":"{ps_escaped}"}}}}\'',
                })

    for plugin_name, entries in plugin_entries.items():
        path_hook = _PLUGIN_PATH_HOOKS.get(plugin_name)
        if path_hook:
            entries.append(path_hook)

    def _inner(entries: list[dict]) -> str:
        return json.dumps(entries, ensure_ascii=False)[1:-1]

    # Keys are template-engine context variables (brace-free, lowercase). Templates
    # inject them raw with triple-stache, e.g. {{{bootstrap_hooks_claude}}}.
    replacements = {
        "bootstrap_hooks_claude":  _inner(plugin_entries.get("core-claude", [])),
        "bootstrap_hooks_codex":   _inner(plugin_entries.get("core-codex", [])),
        "bootstrap_hooks_cursor":  _inner(plugin_entries.get("core-cursor", [])),
        "bootstrap_hooks_copilot": _inner(plugin_entries.get("core-copilot", [])),
    }

    for err in errors:
        print(err, file=sys.stderr)

    print(
        f"      built per-plugin hook payloads: "
        + ", ".join(f"{name}={len(entries)}" for name, entries in plugin_entries.items()),
        flush=True,
    )
    return replacements, violations


_TEMPLATE_COMPILER = Compiler()


def process_templates(
    dest_dir: Path,
    templates: tuple[str, ...],
    context: dict[str, object],
) -> None:
    """Render Handlebars .tmpl files with `context`, write output (path minus .tmpl suffix).

    Templates use triple-stache for raw JSON injection (e.g. {{{bootstrap_hooks_claude}}})
    and release-driven conditionals (e.g. {{#if deterministic_hooks}} … {{/if}}). `context`
    carries the release `template_vars` plus the per-plugin bootstrap-hook JSON values.
    """
    for tmpl_rel in templates:
        tmpl_path = dest_dir / tmpl_rel
        if not tmpl_path.is_file():
            print(f"WARNING: {tmpl_path} not found, skipping", file=sys.stderr)
            continue

        template = _TEMPLATE_COMPILER.compile(tmpl_path.read_text(encoding="utf-8"))
        rendered = str(template(context))

        output_path = tmpl_path.with_suffix("")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(rendered, encoding="utf-8")
        print(f"      processed {tmpl_rel}", flush=True)


def _toml_quote(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def _toml_multiline(value: str) -> str:
    escaped = value.replace('"""', '\\"\\"\\"')
    return f'"""\n{escaped}\n"""'


def generate_folder_index(destination: Path, folder_name: str, required_tag: str | None = None) -> None:
    """Generate <folder>/INDEX.md listing markdown files with descriptions."""
    target_dir = destination / folder_name
    if not target_dir.is_dir():
        return

    entries: list[tuple[str, str]] = []
    for item in sorted(target_dir.iterdir()):
        if item.name == "INDEX.md" or item.suffix not in (".md", ".mdc"):
            continue
        content = item.read_text(encoding="utf-8")
        if required_tag is not None:
            raw_tags = _extract_frontmatter_field(content, "tags")
            if required_tag not in raw_tags:
                continue
        description = _extract_frontmatter_field(content, "description")
        if not description:
            description = item.stem.replace("-", " ").title()
        entries.append((item.name, description))

    if not entries:
        return

    _FOLDER_TITLE_ALIASES: dict[str, str] = {"commands": "Workflows", "prompts": "Workflows"}
    display_name = _FOLDER_TITLE_ALIASES.get(folder_name, folder_name.title())
    lines = [
        f"# Rosetta {display_name} Index",
        "",
        "All paths are relative to Rosetta Plugin Path.",
        "",
    ]
    for filename, description in entries:
        lines.append(f"- `{folder_name}/{filename}`: {description}")
    lines.append("")

    index_path = target_dir / "INDEX.md"
    index_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"      generated {folder_name}/INDEX.md with {len(entries)} entries", flush=True)


def _replace_tree(source: Path, target: Path) -> None:
    if target.exists():
        if target.is_dir():
            shutil.rmtree(target)
        else:
            target.unlink()

    target.parent.mkdir(parents=True, exist_ok=True)
    if source.is_dir():
        shutil.copytree(source, target)
    else:
        shutil.copy2(source, target)


def generate_codex_subagents(destination: Path, core_source: Path) -> None:
    subagents_dir = destination / ".codex" / "agents"
    subagents_dir.mkdir(parents=True, exist_ok=True)

    generated_count = 0
    for source_file in sorted((core_source / "agents").glob("*.md")):
        content = source_file.read_text(encoding="utf-8")
        frontmatter, body = _extract_frontmatter_and_body(content)
        if not frontmatter:
            continue

        name = _extract_frontmatter_field(content, "name")
        description = _extract_frontmatter_field(content, "description")
        readonly = _extract_frontmatter_field(content, "readonly").lower() == "true"
        raw_model = _extract_frontmatter_field(content, "model")
        model, effort = normalize_codex_model(raw_model)

        toml_lines = [
            f"name = {_toml_quote(name or source_file.stem)}",
            f"description = {_toml_quote(description or source_file.stem.replace('-', ' ').title())}",
            f"developer_instructions = {_toml_multiline(body.strip())}",
        ]

        if model:
            toml_lines.append(f"model = {_toml_quote(model)}")
        if effort:
            toml_lines.append(f"model_reasoning_effort = {_toml_quote(effort)}")

        toml_lines.append(
            'sandbox_mode = "read-only"' if readonly else 'sandbox_mode = "workspace-write"'
        )

        target = subagents_dir / f"{source_file.stem}.toml"
        target.write_text("\n".join(toml_lines) + "\n", encoding="utf-8")
        generated_count += 1

    legacy_agents_dir = destination / "agents"
    if legacy_agents_dir.is_dir():
        shutil.rmtree(legacy_agents_dir)

    print(f"      generated .codex/agents with {generated_count} subagent(s)", flush=True)


def generate_copilot_runtime_layout(destination: Path) -> None:
    plugin_dir = destination / ".github" / "plugin"
    copied = 0
    for filename in ("hooks.json", ".mcp.json"):
        source = plugin_dir / filename
        if source.is_file():
            shutil.copy2(source, destination / filename)
            copied += 1
    print(f"      copied {copied} config(s) from .github/plugin/ to plugin root", flush=True)


def generate_codex_runtime_layout(destination: Path) -> None:
    source_hooks = destination / ".codex-plugin" / "hooks.json"
    codex_hooks = destination / ".codex" / "hooks.json"
    if source_hooks.is_file():
        _replace_tree(source_hooks, codex_hooks)
        print("      copied .codex/hooks.json for core-codex", flush=True)

    reserved_dirs = {".agents", ".codex", ".codex-plugin"}
    for child in sorted(destination.iterdir()):
        if not child.is_dir() or child.name in reserved_dirs:
            continue

        target_dir = destination / ".agents" / child.name
        _replace_tree(child, target_dir)
        shutil.rmtree(child)
        print(f"      moved {child.name} to .agents/{child.name} for core-codex", flush=True)

    agents_path = destination / "agents"
    if agents_path.exists():
        if agents_path.is_dir():
            shutil.rmtree(agents_path)
        else:
            agents_path.unlink()


def _is_agent_file(relative_path: Path) -> bool:
    """Check if a relative path is an agent markdown file (agents/<name>.md)."""
    parts = relative_path.parts
    return (
        len(parts) == 2
        and parts[0] == "agents"
        and relative_path.suffix == ".md"
    )


def _apply_rename_files(dest_rel: str, rename_files: tuple[tuple[str, str], ...]) -> str | None:
    for pattern, replacement in rename_files:
        if re.fullmatch(pattern, dest_rel):
            folder = dest_rel.rsplit("/", 1)[0] if "/" in dest_rel else ""
            new_filename = re.sub(pattern, replacement, dest_rel)
            return f"{folder}/{new_filename}" if folder else new_filename
    return None


def _inject_index_content(subfolder: Path, index_folder: str, target_rel: str) -> None:
    index_content = (subfolder / index_folder / "INDEX.md").read_text(encoding="utf-8")
    target = subfolder / target_rel
    content = target.read_text(encoding="utf-8")
    closing_tag = "</plugin_files_mode>"
    content = content.replace(closing_tag, f"\n{index_content.strip()}\n\n{closing_tag}")
    target.write_text(content, encoding="utf-8")
    print(f"      injected {index_folder}/INDEX.md into {target_rel}", flush=True)


def _inject_plugin_instructions(
    subfolder: Path,
    target_rel: str,
    plugin_root: str,
    workflow_folder: str,
    workflow_ext: str,
) -> None:
    target = subfolder / target_rel
    content = target.read_text(encoding="utf-8")
    insert_text = (
        f'Rosetta plugin root: "{plugin_root}". You MUST FOLLOW ALL bootstrap* and plugin* '
        f'instructions and execute every prep step in order. After prep steps, '
        f'you MUST select a workflow and execute it. All workflows (commands) '
        f'are stored in "{plugin_root}/{workflow_folder}/<workflowtag>{workflow_ext}". '
        f'Example "{plugin_root}/{workflow_folder}/coding-flow{workflow_ext}".'
    )
    closing_tag = "</plugin_files_mode>"
    content = content.replace(closing_tag, f"{insert_text}\n{closing_tag}")
    target.write_text(content, encoding="utf-8")
    print(f"      injected plugin instructions into {target_rel}", flush=True)


def _generate_standalone_plugin_json(source: Path, spec: StandaloneSpec) -> None:
    plugin_json_path = next(source.rglob("plugin.json"), None)
    version = "0.0.0"
    if plugin_json_path:
        version = json.loads(plugin_json_path.read_text(encoding="utf-8")).get("version", version)
    data = {"name": spec.name, "version": version}
    (spec.destination / "plugin.json").write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"      generated plugin.json (version: {version})", flush=True)


def generate_standalone_plugin(spec: StandaloneSpec, plugins_root: Path) -> None:
    source = plugins_root / spec.source_plugin
    if spec.destination.exists():
        shutil.rmtree(spec.destination)
    spec.destination.mkdir(parents=True)

    subfolder_path = spec.destination / spec.subfolder
    subfolder_path.mkdir(parents=True)

    copied = 0
    for item in sorted(source.iterdir()):
        if item.name == spec.excluded_source_folder:
            continue
        if item.is_dir() and item.name == spec.subfolder:
            # Source plugin contains a directory matching the standalone's subfolder name.
            # Merge its contents directly into subfolder_path instead of nesting them as
            # <subfolder>/<subfolder>/. Defensive: handles any future runtime-layout step
            # that might place files in a folder whose name equals the standalone target.
            shutil.copytree(item, subfolder_path, dirs_exist_ok=True)
        elif item.is_dir():
            target = subfolder_path / item.name
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            target = subfolder_path / item.name
            shutil.copy2(item, target)
        copied += 1

    for rel in spec.pre_cleanup:
        path = subfolder_path / rel
        if path.is_dir():
            shutil.rmtree(path)
        elif path.is_file():
            path.unlink()

    path_renames: dict[str, str] = {}

    for glob_pattern, target_dir, name_matcher, name_replacement in spec.pre_move_files:
        target_path = subfolder_path / target_dir
        target_path.mkdir(parents=True, exist_ok=True)
        moved = 0
        for src in sorted(subfolder_path.glob(glob_pattern)):
            new_name = re.sub(name_matcher, name_replacement, src.name)
            old_rel = "/".join(src.relative_to(subfolder_path).parts)
            new_rel = f"{target_dir}/{new_name}"
            shutil.move(str(src), str(target_path / new_name))
            path_renames[old_rel] = new_rel
            moved += 1
        if moved:
            print(f"      moved {moved} file(s) {glob_pattern} → {target_dir}/", flush=True)

    for src_folder, dst_folder in spec.rename_folders:
        src_dir = subfolder_path / src_folder
        if not src_dir.is_dir():
            continue
        dst_dir = subfolder_path / dst_folder
        if dst_dir.exists():
            shutil.rmtree(dst_dir)
        shutil.move(str(src_dir), str(dst_dir))
        path_renames[f"{src_folder}/"] = f"{dst_folder}/"
        print(f"      renamed folder {src_folder}/ → {dst_folder}/", flush=True)

    if spec.rename_files:
        renamed = 0
        for src in sorted(subfolder_path.rglob("*.md")):
            if src.name == "INDEX.md":
                continue
            rel = "/".join(src.relative_to(subfolder_path).parts)
            new_rel = _apply_rename_files(rel, spec.rename_files)
            if new_rel and new_rel != rel:
                dst = subfolder_path / new_rel
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(src), str(dst))
                path_renames[rel] = new_rel
                renamed += 1
        if renamed:
            print(f"      renamed {renamed} file(s) by suffix patterns", flush=True)

    if path_renames:
        rewritten = 0
        for md_file in sorted(subfolder_path.rglob("*.md")):
            content = md_file.read_text(encoding="utf-8")
            new_content = content
            for old, new in path_renames.items():
                new_content = new_content.replace(old, new)
            if new_content != content:
                md_file.write_text(new_content, encoding="utf-8")
                rewritten += 1
        if rewritten:
            print(f"      rewrote path refs in {rewritten} markdown file(s)", flush=True)

    for folder_name, required_tag in spec.regenerated_indexes:
        generate_folder_index(subfolder_path, folder_name, required_tag=required_tag)

    if spec.copilot_instructions:
        _inject_plugin_instructions(
            subfolder_path,
            target_rel="instructions/plugin-files-mode.instructions.md",
            plugin_root=".github",
            workflow_folder="prompts",
            workflow_ext=".prompt.md",
        )

    if spec.cursor_instructions:
        _inject_plugin_instructions(
            subfolder_path,
            target_rel="rules/plugin-files-mode.mdc",
            plugin_root=".cursor",
            workflow_folder="commands",
            workflow_ext=".md",
        )

    for index_folder, target_rel in spec.inject_indexes:
        _inject_index_content(subfolder_path, index_folder, target_rel)

    for rel in spec.post_cleanup:
        path = subfolder_path / rel
        if path.is_dir():
            shutil.rmtree(path)
        elif path.is_file():
            path.unlink()

    _generate_standalone_plugin_json(source, spec)
    print(f"      copied {copied} item(s) into {spec.subfolder}/", flush=True)


def sync_generated_plugins(
    repo_root: Path,
    release: str = DEFAULT_RELEASE,
    output_dir: Path | None = None,
) -> int:
    plugins_dir = output_dir if output_dir is not None else repo_root / "plugins"
    releases = _get_releases(repo_root)
    if release not in releases:
        print(
            f"ERROR: unknown release '{release}' (known: {', '.join(sorted(releases))})",
            file=sys.stderr,
        )
        return 1
    release_cfg = releases[release]

    core_source = release_cfg.source
    if not core_source.is_dir():
        print(f"ERROR: Core source folder not found: {core_source}", file=sys.stderr)
        return 1

    deterministic_hooks = bool(release_cfg.template_vars.get("deterministic_hooks", False))
    print(f"   release={release_cfg.name} source={core_source} output={plugins_dir} deterministic_hooks={deterministic_hooks}", flush=True)

    plugin_specs = _get_plugin_specs(repo_root, plugins_dir)

    plugin_flags = {
        spec.name: (spec.include_bootstrap_in_hooks, spec.include_indexes_in_hooks)
        for spec in plugin_specs
    }

    # Pass 1: materialize every plugin's destination tree (reset → copy → pre_move → indexes).
    # All destinations must exist before bootstrap-hook payloads can be read per-plugin.
    path_renames_by_spec: dict[str, dict[str, str]] = {}
    for spec in plugin_specs:
        print(f"   syncing {spec.name}", flush=True)
        reset_generated_tree(spec.destination, spec.preserved_folder, spec.preserved_files)
        path_renames_by_spec[spec.name] = copy_core_tree(spec, core_source)
        for glob_pattern, target_dir, name_matcher, name_replacement in spec.pre_move_files:
            target_path = spec.destination / target_dir
            target_path.mkdir(parents=True, exist_ok=True)
            moved = 0
            for src in sorted(spec.destination.glob(glob_pattern)):
                new_name = re.sub(name_matcher, name_replacement, src.name)
                shutil.move(str(src), str(target_path / new_name))
                moved += 1
            if moved:
                print(f"      moved {moved} file(s) {glob_pattern} → {target_dir}/", flush=True)
        for folder_name in spec.generated_indexes:
            tag = "workflow" if folder_name in ("workflows", "commands", "prompts") else None
            generate_folder_index(spec.destination, folder_name, required_tag=tag)

    plugin_destinations = {spec.name: spec.destination for spec in plugin_specs}
    replacements, total_violations = build_bootstrap_replacements(plugin_destinations, plugin_flags)

    # Pass 2: render templates (using each plugin's captured path_renames) and run runtime layouts.
    # `replacements` holds only string bootstrap values, so path_renames apply cleanly to them;
    # the release `template_vars` (release name, deterministic_hooks bool) are merged in afterward
    # and never passed through string rewriting.
    for spec in plugin_specs:
        if spec.templates:
            path_renames = path_renames_by_spec.get(spec.name, {})
            bootstrap_values = dict(replacements)
            if path_renames:
                bootstrap_values = {}
                for k, v in replacements.items():
                    for old, new in path_renames.items():
                        v = v.replace(old, new)
                    bootstrap_values[k] = v
            context: dict[str, object] = {**release_cfg.template_vars, **bootstrap_values}
            process_templates(spec.destination, spec.templates, context)
        if spec.name == "core-copilot":
            generate_copilot_runtime_layout(spec.destination)
        if spec.name == "core-codex":
            generate_codex_subagents(spec.destination, core_source)
            generate_codex_runtime_layout(spec.destination)

    # Sync hook bundles into main plugins BEFORE generating standalones so the bundles
    # are present in source plugins when generate_standalone_plugin reads from them.
    # Releases without deterministic hooks (e.g. r2) reference no .js, so the bundle sync
    # is skipped entirely for them. If hook sync fails, record the error and continue —
    # generation must run to completion so all problems surface in a single run.
    if deterministic_hooks:
        hook_sync_result = sync_hooks_into_plugins(repo_root, plugins_dir)
    else:
        hook_sync_result = 0
        _clean_hook_bundles(repo_root, plugins_dir)
        print("      skipped hook-bundle sync (deterministic_hooks=false)", flush=True)

    standalone_specs = [
        StandaloneSpec(
            name="core-cursor-standalone",
            source_plugin="core-cursor",
            destination=plugins_dir / "core-cursor-standalone",
            subfolder=".cursor",
            excluded_source_folder=".cursor-plugin",
            pre_cleanup=("templates", "hooks/hooks.json.tmpl", "hooks/hooks.json", "hooks.json.tmpl"),
            cursor_instructions=True,
            inject_indexes=(
                ("commands", "rules/plugin-files-mode.mdc"),
            ),
        ),
        StandaloneSpec(
            name="core-copilot-standalone",
            source_plugin="core-copilot",
            destination=plugins_dir / "core-copilot-standalone",
            subfolder=".github",
            excluded_source_folder=".github",
            pre_cleanup=(".mcp.json", "hooks.json", "templates", "hooks/hooks.json.tmpl"),
            pre_move_files=(
                ("rules/bootstrap-*.md",       "instructions", r"(.+)\.md", r"\1.instructions.md"),
                ("rules/plugin-files-mode.md", "instructions", r"(.+)\.md", r"\1.instructions.md"),
            ),
            rename_folders=(("commands", "prompts"),),
            rename_files=((r"prompts/(.+)\.md", r"\1.prompt.md"),),
            regenerated_indexes=(
                ("rules",   None),
                ("prompts", "workflow"),
            ),
            copilot_instructions=True,
            inject_indexes=(
                ("prompts", "instructions/plugin-files-mode.instructions.md"),
                ("rules",   "instructions/plugin-files-mode.instructions.md"),
            ),
        ),
    ]

    for spec in standalone_specs:
        print(f"   generating {spec.name}", flush=True)
        generate_standalone_plugin(spec, plugins_dir)

    # Non-zero exit reflects any error from any phase (bootstrap-payload violations
    # or hook-sync failure). Generation always runs to completion regardless.
    return 1 if (total_violations or hook_sync_result != 0) else 0


def _clean_hook_bundles(repo_root: Path, plugins_dir: Path | None = None) -> None:
    """Remove compiled hook bundle ``.js`` from each plugin's hook dir.

    Releases without deterministic hooks (e.g. r2) reference no ``.js``, but the hook
    folder is preserved across resync — so stale bundles from a prior deterministic
    generation must be cleared to keep the plugin lean. ``hooks.json`` / ``hooks.json.tmpl``
    are kept (not ``.js``).
    """
    removed = 0
    for spec in _get_plugin_specs(repo_root, plugins_dir):
        if spec.hook_subdir is None:
            continue
        targets = [spec.destination / spec.hook_subdir]
        targets += [spec.destination / sub for sub in spec.runtime_asset_subdirs]
        for target in targets:
            if not target.is_dir():
                continue
            for js_file in target.glob("*.js"):
                js_file.unlink()
                removed += 1
    print(f"      removed {removed} stale hook bundle(s) for non-deterministic release", flush=True)


def sync_hooks_into_plugins(repo_root: Path, plugins_dir: Path | None = None) -> int:
    hooks_bundles_dist = repo_root / "hooks" / "dist" / "bundles"
    hooks_shell_dist = repo_root / "hooks" / "dist" / "shell"

    if not hooks_bundles_dist.is_dir() or not hooks_shell_dist.is_dir():
        print(
            "ERROR: hooks build output missing — run `npm --prefix hooks run build`",
            file=sys.stderr,
        )
        return 1

    for spec in _get_plugin_specs(repo_root, plugins_dir):
        if spec.hook_subdir is None:
            continue
        bundle_src = hooks_bundles_dist / spec.name
        if not bundle_src.is_dir():
            print(f"      skipped {spec.destination.name}: no bundle at dist/bundles/{spec.name}", flush=True)
            continue
        target = spec.destination / spec.hook_subdir
        if target.is_symlink():
            target.unlink()  # remove old symlink into instructions/

        # Preserve files not managed by the hook bundle (e.g. hooks.json, plugin.json).
        # Compute the set of filenames the bundle + shell will supply, then save everything else.
        managed_names = (
            {f.name for f in bundle_src.rglob("*") if f.is_file() and f.name != ".gitkeep"}
            | {f.name for f in hooks_shell_dist.rglob("*") if f.is_file() and f.name != ".gitkeep"}
        )
        preserved: dict[str, bytes] = {}
        if target.is_dir():
            for entry in target.iterdir():
                if entry.is_file() and entry.name not in managed_names and entry.name != ".gitkeep":
                    preserved[entry.name] = entry.read_bytes()

        shutil.rmtree(target, ignore_errors=True)
        shutil.copytree(bundle_src, target, dirs_exist_ok=True)
        shutil.copytree(hooks_shell_dist, target, dirs_exist_ok=True, ignore=shutil.ignore_patterns(".gitkeep"))

        for fname, content in preserved.items():
            (target / fname).write_bytes(content)

        print(f"      synced hooks into {spec.destination.name}/{spec.hook_subdir}", flush=True)

        for mirror_subdir in spec.runtime_asset_subdirs:
            mirror_target = spec.destination / mirror_subdir
            mirror_target.mkdir(parents=True, exist_ok=True)
            for fname in managed_names:
                src_file = target / fname
                if src_file.is_file():
                    shutil.copy2(src_file, mirror_target / fname)
            print(f"      mirrored hook assets into {spec.destination.name}/{mirror_subdir}", flush=True)

    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="plugin_generator",
        description="Generate IDE plugin folders from a Rosetta instructions release.",
    )
    parser.add_argument(
        "--release",
        default=DEFAULT_RELEASE,
        help=f"Instructions release to generate from (default: {DEFAULT_RELEASE}).",
    )
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parent.parent,
        help="Repository root (default: the repo containing this script).",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Directory to write generated plugins into (default: <repo-root>/plugins).",
    )
    args = parser.parse_args(argv)
    return sync_generated_plugins(args.repo_root, release=args.release, output_dir=args.output_dir)


if __name__ == "__main__":
    raise SystemExit(main())
