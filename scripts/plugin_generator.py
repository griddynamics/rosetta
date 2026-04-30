#!/usr/bin/env python3
"""Plugin generator: syncs instruction sources into IDE plugin folders."""

from __future__ import annotations

import json
import re
import shutil
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

ALLOWED_CLAUDE_MODELS = {"opus", "sonnet", "haiku", "inherit"}

EXCLUDED_RULE_FILES = {"rules/bootstrap.md", "rules/local-files-mode.md"}

BOOTSTRAP_PREFIX = (
    "ALWAYS MUST FULLY READ THIS ENTIRE CONTEXT BEFORE PROCEEDING FROM FILE PATH PROVIDED"
    " ESPECIALLY IF TRUNCATED/PREVIEWED. DO IT NOW! THEN PROCEED.\n"
    "Rosetta get_context_instructions:\n"
)

COPILOT_MODEL_MAP: dict[str, str] = {
    "opus": "claude opus 4.6",
    "sonnet": "claude sonnet 4.6",
    "haiku": "claude haiku 4.5",
}


@dataclass(frozen=True)
class PluginSyncSpec:
    name: str
    destination: Path
    preserved_folder: str
    preserved_files: tuple[str, ...] = ()
    normalize_models: bool = False
    copilot_models: bool = False
    codex_models: bool = False
    rename_agents: bool = False
    generated_indexes: tuple[str, ...] = ()
    templates: tuple[str, ...] = ()


def normalize_claude_model(value: str) -> str:
    lowered = value.strip().lower()
    if lowered in ALLOWED_CLAUDE_MODELS:
        return lowered
    if "opus" in lowered:
        return "opus"
    if "sonnet" in lowered:
        return "sonnet"
    if "haiku" in lowered:
        return "haiku"
    return "inherit"


def normalize_copilot_model(value: str) -> str:
    lowered = value.strip().lower()
    for key, mapped in COPILOT_MODEL_MAP.items():
        if key in lowered:
            return mapped
    return lowered


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


def copy_core_tree(spec: PluginSyncSpec, core_source: Path) -> None:
    destination = spec.destination
    copied_count = 0
    renamed_count = 0

    if spec.codex_models:
        normalizer = None
    elif spec.copilot_models:
        normalizer = normalize_copilot_model
    else:
        normalizer = normalize_claude_model

    should_normalize = spec.normalize_models or spec.copilot_models or spec.codex_models

    for source_file in sorted(core_source.rglob("*")):
        if source_file.name == ".DS_Store":
            continue

        relative_path = source_file.relative_to(core_source)
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

        target.parent.mkdir(parents=True, exist_ok=True)

        if should_normalize and source_file.suffix == ".md":
            source_content = source_file.read_text(encoding="utf-8")
            if spec.codex_models:
                rewritten = rewrite_codex_frontmatter_models(source_content)
            else:
                rewritten = rewrite_frontmatter_models(
                    source_content,
                    normalizer=normalizer,
                )
            target.write_text(rewritten, encoding="utf-8")
            shutil.copystat(source_file, target, follow_symlinks=True)
            copied_count += 1
            continue

        shutil.copy2(source_file, target)
        copied_count += 1

    msg = f"      copied {copied_count} item(s) to {destination}"
    if renamed_count:
        msg += f" (renamed {renamed_count} agent(s) to .agent.md)"
    print(msg, flush=True)


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
    "rules/plugin-files-mode.md",
    "rules/bootstrap-core-policy.md",
    "rules/bootstrap-execution-policy.md",
    "rules/bootstrap-guardrails.md",
    "rules/bootstrap-rosetta-files.md",
    "rules/INDEX.md",
    "workflows/INDEX.md",
)

_PLUGIN_PATH_HOOKS: dict[str, dict] = {
    "core-claude": {"type": "command", "command": 'printf \'%s\' "{\\\"hookSpecificOutput\\\":{\\\"hookEventName\\\":\\\"SessionStart\\\",\\\"additionalContext\\\":\\\"Rosetta Core Plugin Path: ${CLAUDE_PLUGIN_ROOT}\\\"}}"', "once": True},
    "core-codex": {
        "type": "command",
        "command": (
            'workspace_root="$PWD"; '
            'while [ "$workspace_root" != "/" ] && '
            '[ ! -f "$workspace_root/.agents/rules/bootstrap-rosetta-files.md" ]; do '
            'workspace_root="$(dirname "$workspace_root")"; done; '
            'if [ -f "$workspace_root/.agents/rules/bootstrap-rosetta-files.md" ]; then '
            'printf \'%s\' "{\\\"hookSpecificOutput\\\":{\\\"hookEventName\\\":\\\"SessionStart\\\",\\\"additionalContext\\\":\\\"Rosetta Core Plugin Path: $workspace_root/.agents\\\"}}"; fi'
        ),
        "statusMessage": "Loading Rosetta bootstrap",
        "timeout": 30,
    },
    "core-copilot": {
        "type": "command",
        "bash": (
            'for base in "$HOME/Library/Application Support/Code/agentPlugins" '
            '"$HOME/.local/share/Code/agentPlugins"; do '
            'root="$base/github.com/griddynamics/rosetta/plugins/core-copilot"; '
            'if [ -f "$root/rules/bootstrap-rosetta-files.md" ]; then '
            'printf \'%s\' "{\\\"hookSpecificOutput\\\":{\\\"hookEventName\\\":\\\"SessionStart\\\",\\\"additionalContext\\\":\\\"Rosetta Core Plugin Path: $root\\\"}}"; '
            'break; fi; done'
        ),
        "powershell": (
            '$root = "$env:LOCALAPPDATA\\Code\\agentPlugins\\github.com\\griddynamics\\rosetta\\plugins\\core-copilot"; '
            'if (Test-Path "$root\\rules\\bootstrap-rosetta-files.md") '
            '{ Write-Output (\'{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Rosetta Core Plugin Path: \' + $root + \'"}}\') }'
        ),
    },
    "core-cursor": {"type": "command", "command": 'printf \'{"additional_context":"Rosetta Core Plugin Path: %s"}\' "${CURSOR_PROJECT_DIR}"'},
}

def build_bootstrap_replacements(dest_dir: Path) -> tuple[dict[str, str], int]:
    """Read bootstrap files once, build all platform-specific placeholder values.

    Returns (replacements dict, violation count).
    """
    violations = 0
    errors: list[str] = []
    claude_entries: list[dict] = []
    codex_entries: list[dict] = []
    cursor_entries: list[dict] = []
    copilot_entries: list[dict] = []

    for n, rel_file in enumerate(_BOOTSTRAP_FILES):
        src = dest_dir / rel_file
        if not src.is_file():
            print(f"WARNING: {src} not found, skipping", file=sys.stderr)
            continue

        content = src.read_text(encoding="utf-8")
        body = strip_frontmatter(content)
        text = (BOOTSTRAP_PREFIX + body) if n == 0 else body
        escaped = json_escape_for_additional_context(text)
        bash_escaped = _bash_single_quote_escape(escaped)
        ps_escaped = _ps_single_quote_escape(escaped)

        if len(escaped) > 10000:
            errors.append(f"ERROR: {rel_file} additionalContext is {len(escaped)} chars (max 10000)")
            violations += 1

        claude_entries.append({
            "type": "command",
            "command": f'printf \'%s\' \'{{"hookSpecificOutput":{{"hookEventName":"SessionStart","additionalContext":"{bash_escaped}"}}}}\'',
            "once": True,
        })
        codex_entries.append({
            "type": "command",
            "command": f'printf \'%s\' \'{{"hookSpecificOutput":{{"hookEventName":"SessionStart","additionalContext":"{bash_escaped}"}}}}\'',
            "statusMessage": "Loading Rosetta bootstrap",
            "timeout": 30,
        })
        cursor_entries.append({
            "type": "command",
            "command": f'printf \'%s\' \'{{"additional_context":"{bash_escaped}"}}\'',
        })
        copilot_entries.append({
            "type": "command",
            "bash": f'{_bash_lock(n)}; printf \'%s\' \'{{"hookSpecificOutput":{{"hookEventName":"SessionStart","additionalContext":"{bash_escaped}"}}}}\'',
            "powershell": f'{_ps_lock(n)}; Write-Output \'{{"hookSpecificOutput":{{"hookEventName":"SessionStart","additionalContext":"{ps_escaped}"}}}}\'',
        })

    for entries, name in (
        (claude_entries, "core-claude"),
        (codex_entries, "core-codex"),
        (copilot_entries, "core-copilot"),
        (cursor_entries, "core-cursor"),
    ):
        path_hook = _PLUGIN_PATH_HOOKS.get(name)
        if path_hook:
            entries.append(path_hook)

    def _inner(entries: list[dict]) -> str:
        return json.dumps(entries, ensure_ascii=False)[1:-1]

    replacements = {
        "{{BOOTSTRAP_HOOKS_CLAUDE}}": _inner(claude_entries),
        "{{BOOTSTRAP_HOOKS_CODEX}}": _inner(codex_entries),
        "{{BOOTSTRAP_HOOKS_CURSOR}}": _inner(cursor_entries),
        "{{BOOTSTRAP_HOOKS_COPILOT}}": _inner(copilot_entries),
    }

    for err in errors:
        print(err, file=sys.stderr)

    print(f"      built {len(replacements)} template replacements from {len(_BOOTSTRAP_FILES)} bootstrap files", flush=True)
    return replacements, violations


def process_templates(
    dest_dir: Path,
    templates: tuple[str, ...],
    replacements: dict[str, str],
) -> None:
    """Replace all known placeholders in .tmpl files, write output (path minus .tmpl suffix)."""
    for tmpl_rel in templates:
        tmpl_path = dest_dir / tmpl_rel
        if not tmpl_path.is_file():
            print(f"WARNING: {tmpl_path} not found, skipping", file=sys.stderr)
            continue

        text = tmpl_path.read_text(encoding="utf-8")
        for placeholder, value in replacements.items():
            text = text.replace(placeholder, value)

        output_path = tmpl_path.with_suffix("")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(text, encoding="utf-8")
        print(f"      processed {tmpl_rel}", flush=True)


def _toml_quote(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def _toml_multiline(value: str) -> str:
    escaped = value.replace('"""', '\\"\\"\\"')
    return f'"""\n{escaped}\n"""'


def generate_folder_index(destination: Path, folder_name: str) -> None:
    """Generate <folder>/INDEX.md listing markdown files with descriptions."""
    target_dir = destination / folder_name
    if not target_dir.is_dir():
        return

    entries: list[tuple[str, str]] = []
    for item in sorted(target_dir.iterdir()):
        if item.name == "INDEX.md" or item.suffix != ".md":
            continue
        content = item.read_text(encoding="utf-8")
        description = _extract_frontmatter_field(content, "description")
        if not description:
            description = item.stem.replace("-", " ").title()
        entries.append((item.name, description))

    if not entries:
        return

    lines = [
        f"# Rosetta {folder_name.title()} Index",
        "",
        "All paths are relative to Rosetta Core Plugin Path.",
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


def sync_generated_plugins(repo_root: Path) -> int:
    core_source = repo_root / "instructions" / "r2" / "core"
    if not core_source.is_dir():
        print(f"ERROR: Core source folder not found: {core_source}", file=sys.stderr)
        return 1

    plugin_specs = [
        PluginSyncSpec(
            name="core-claude",
            destination=repo_root / "plugins" / "core-claude",
            preserved_folder=".claude-plugin",
            preserved_files=("hooks",),
            normalize_models=True,
            generated_indexes=("rules", "workflows"),
            templates=("hooks/hooks.json.tmpl",),
        ),
        PluginSyncSpec(
            name="core-cursor",
            destination=repo_root / "plugins" / "core-cursor",
            preserved_folder=".cursor-plugin",
            preserved_files=("hooks",),
            generated_indexes=("rules", "workflows"),
            templates=("hooks/hooks.json.tmpl",),
        ),
        PluginSyncSpec(
            name="core-copilot",
            destination=repo_root / "plugins" / "core-copilot",
            preserved_folder=".github",
            copilot_models=True,
            rename_agents=True,
            generated_indexes=("rules", "workflows"),
            templates=(".github/plugin/hooks.json.tmpl",),
        ),
        PluginSyncSpec(
            name="core-codex",
            destination=repo_root / "plugins" / "core-codex",
            preserved_folder=".codex-plugin",
            codex_models=True,
            generated_indexes=("rules", "workflows"),
            templates=(".codex-plugin/hooks.json.tmpl",),
        ),
    ]

    replacements: dict[str, str] | None = None
    total_violations = 0
    for spec in plugin_specs:
        print(f"   syncing {spec.name}", flush=True)
        reset_generated_tree(spec.destination, spec.preserved_folder, spec.preserved_files)
        copy_core_tree(spec, core_source)
        for folder_name in spec.generated_indexes:
            generate_folder_index(spec.destination, folder_name)
        if replacements is None:
            replacements, total_violations = build_bootstrap_replacements(spec.destination)
        if spec.templates:
            process_templates(spec.destination, spec.templates, replacements)
        if spec.name == "core-copilot":
            generate_copilot_runtime_layout(spec.destination)
        if spec.name == "core-codex":
            generate_codex_subagents(spec.destination, core_source)
            generate_codex_runtime_layout(spec.destination)
    return 1 if total_violations else 0
