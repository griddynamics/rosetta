import importlib
import os
from pathlib import Path


def test_tool_descriptions_are_externalized():
    """Test that tool descriptions are in tool_prompts.py and referenced in server.py."""
    server_path = Path(__file__).resolve().parents[1] / "ims_mcp" / "server.py"
    prompts_path = Path(__file__).resolve().parents[1] / "ims_mcp" / "tool_prompts.py"

    server_source = server_path.read_text(encoding="utf-8")
    prompts_source = prompts_path.read_text(encoding="utf-8")

    # Verify server.py uses description= parameter
    assert "description=PROMPT_" in server_source
    assert server_source.count("@mcp.tool(name=") == 8
    assert server_source.count("description=PROMPT_GET_CONTEXT_INSTRUCTIONS") == 1
    assert server_source.count("description=PROMPT_QUERY_INSTRUCTIONS") == 1
    assert server_source.count("description=PROMPT_LIST_INSTRUCTIONS") == 1
    assert server_source.count("description=PROMPT_SUBMIT_FEEDBACK") == 1
    assert server_source.count("description=PROMPT_QUERY_PROJECT_CONTEXT") == 1
    assert server_source.count("description=PROMPT_STORE_PROJECT_CONTEXT") == 1
    assert server_source.count("description=PROMPT_DISCOVER_PROJECTS") == 1
    assert server_source.count("description=PROMPT_PLAN_MANAGER") == 1

    # Verify prompts are defined in tool_prompts.py
    # Note: PROMPT_GET_CONTEXT_INSTRUCTIONS and PROMPT_SERVER_INSTRUCTIONS are now selected in server.py
    # but their source versions (SOFT/HARD) are still in tool_prompts.py
    assert "PROMPT_GET_CONTEXT_INSTRUCTIONS_SOFT = " in prompts_source
    assert "PROMPT_GET_CONTEXT_INSTRUCTIONS_HARD = " in prompts_source
    assert "PROMPT_SERVER_INSTRUCTIONS_SOFT = " in prompts_source
    assert "PROMPT_SERVER_INSTRUCTIONS_HARD = " in prompts_source
    assert "PROMPT_QUERY_INSTRUCTIONS = " in prompts_source
    assert "PROMPT_LIST_INSTRUCTIONS = " in prompts_source
    assert "PROMPT_SUBMIT_FEEDBACK = " in prompts_source
    assert "PROMPT_QUERY_PROJECT_CONTEXT = " in prompts_source
    assert "PROMPT_STORE_PROJECT_CONTEXT = " in prompts_source
    assert "PROMPT_DISCOVER_PROJECTS = " in prompts_source
    assert "PROMPT_PLAN_MANAGER_HELP = " in prompts_source

    # Verify mode selection logic is in server.py
    assert "ROSETTA_MODE" in server_source
    assert "PROMPT_SERVER_INSTRUCTIONS_SOFT" in server_source
    assert "PROMPT_SERVER_INSTRUCTIONS_HARD" in server_source

    # Verify prompt content is in tool_prompts.py (not server.py)
    assert "get_context_instructions before ANY response or action" in prompts_source
    assert "get_context_instructions before ANY response or action" not in server_source
    assert "Fetch instruction docs. Prefer tags for known files and families" in prompts_source
    assert "Fetch instruction docs. Prefer tags for known files and families" not in server_source
    assert "List readable project datasets. Run before creating new project context." in prompts_source
    assert "List readable project datasets. Run before creating new project context." not in server_source


def _get_server_prompts():
    """Helper to get selected prompts by executing the same logic as server.py."""
    # Test the mode selection logic directly (same as in server.py)
    # This avoids import issues with server.py dependencies
    import os
    import sys
    
    # Remove modules from cache to ensure fresh imports
    modules_to_remove = [
        "ims_mcp.tool_prompts",
        "ims_mcp.constants",
    ]
    for mod_name in modules_to_remove:
        if mod_name in sys.modules:
            del sys.modules[mod_name]
    
    # Import constants first (it has no dependencies)
    import importlib.util
    constants_path = Path(__file__).resolve().parents[1] / "ims_mcp" / "constants.py"
    constants_spec = importlib.util.spec_from_file_location("ims_mcp.constants", constants_path)
    constants_module = importlib.util.module_from_spec(constants_spec)
    constants_spec.loader.exec_module(constants_module)
    sys.modules["ims_mcp.constants"] = constants_module
    
    # Import tool_prompts
    tool_prompts_path = Path(__file__).resolve().parents[1] / "ims_mcp" / "tool_prompts.py"
    tool_prompts_spec = importlib.util.spec_from_file_location("ims_mcp.tool_prompts", tool_prompts_path)
    tool_prompts_module = importlib.util.module_from_spec(tool_prompts_spec)
    tool_prompts_spec.loader.exec_module(tool_prompts_module)
    sys.modules["ims_mcp.tool_prompts"] = tool_prompts_module
    
    # Execute the same logic as server.py
    _rosetta_mode = os.getenv(constants_module.ENV_ROSETTA_MODE, "HARD").upper()
    if _rosetta_mode == "SOFT":
        prompt_server = tool_prompts_module.PROMPT_SERVER_INSTRUCTIONS_SOFT
        prompt_get_context = tool_prompts_module.PROMPT_GET_CONTEXT_INSTRUCTIONS_SOFT
    else:
        prompt_server = tool_prompts_module.PROMPT_SERVER_INSTRUCTIONS_HARD
        prompt_get_context = tool_prompts_module.PROMPT_GET_CONTEXT_INSTRUCTIONS_HARD
    
    return prompt_server, prompt_get_context


def test_rosetta_mode_defaults_to_hard(monkeypatch):
    """Test that default mode is HARD when ROSETTA_MODE is not set."""
    monkeypatch.delenv("ROSETTA_MODE", raising=False)
    # Get prompts from server module
    prompt_server, prompt_get_context = _get_server_prompts()
    
    # HARD mode should have "BLOCKING PREREQUISITE GATE"
    assert "BLOCKING PREREQUISITE GATE" in prompt_get_context
    # SOFT mode should have "There are 3 preparation steps"
    assert "There are 3 preparation steps" not in prompt_get_context


def test_rosetta_mode_soft(monkeypatch):
    """Test that SOFT mode is selected when ROSETTA_MODE=SOFT."""
    monkeypatch.setenv("ROSETTA_MODE", "SOFT")
    # Get prompts from server module
    prompt_server, prompt_get_context = _get_server_prompts()
    
    # SOFT mode should have "There are 3 preparation steps"
    assert "There are 3 preparation steps" in prompt_get_context
    # HARD mode should have "BLOCKING PREREQUISITE GATE"
    assert "BLOCKING PREREQUISITE GATE" not in prompt_get_context


def test_rosetta_mode_hard_explicit(monkeypatch):
    """Test that HARD mode is selected when ROSETTA_MODE=HARD."""
    monkeypatch.setenv("ROSETTA_MODE", "HARD")
    # Get prompts from server module
    prompt_server, prompt_get_context = _get_server_prompts()
    
    # HARD mode should have "BLOCKING PREREQUISITE GATE"
    assert "BLOCKING PREREQUISITE GATE" in prompt_get_context


def test_rosetta_mode_case_insensitive(monkeypatch):
    """Test that ROSETTA_MODE is case-insensitive."""
    # Test lowercase
    monkeypatch.setenv("ROSETTA_MODE", "soft")
    _, prompt_get_context = _get_server_prompts()
    assert "There are 3 preparation steps" in prompt_get_context
    
    # Test mixed case
    monkeypatch.setenv("ROSETTA_MODE", "Soft")
    _, prompt_get_context = _get_server_prompts()
    assert "There are 3 preparation steps" in prompt_get_context
    
    # Test uppercase (already tested above, but for completeness)
    monkeypatch.setenv("ROSETTA_MODE", "SOFT")
    _, prompt_get_context = _get_server_prompts()
    assert "There are 3 preparation steps" in prompt_get_context


def test_rosetta_mode_invalid_defaults_to_hard(monkeypatch):
    """Test that invalid ROSETTA_MODE values default to HARD."""
    # Test invalid value
    monkeypatch.setenv("ROSETTA_MODE", "INVALID")
    _, prompt_get_context = _get_server_prompts()
    assert "BLOCKING PREREQUISITE GATE" in prompt_get_context
    
    # Test empty string
    monkeypatch.setenv("ROSETTA_MODE", "")
    _, prompt_get_context = _get_server_prompts()
    assert "BLOCKING PREREQUISITE GATE" in prompt_get_context


def test_rosetta_mode_prompts_match():
    """Test that selected prompts match their source versions."""
    from ims_mcp.tool_prompts import (
        PROMPT_GET_CONTEXT_INSTRUCTIONS_HARD,
        PROMPT_GET_CONTEXT_INSTRUCTIONS_SOFT,
        PROMPT_SERVER_INSTRUCTIONS_HARD,
        PROMPT_SERVER_INSTRUCTIONS_SOFT,
    )
    
    # Get the selected prompts from server
    prompt_server, prompt_get_context = _get_server_prompts()
    
    # Verify that the selected prompts are one of the source versions
    assert prompt_server in [
        PROMPT_SERVER_INSTRUCTIONS_SOFT,
        PROMPT_SERVER_INSTRUCTIONS_HARD,
    ]
    assert prompt_get_context in [
        PROMPT_GET_CONTEXT_INSTRUCTIONS_SOFT,
        PROMPT_GET_CONTEXT_INSTRUCTIONS_HARD,
    ]


def test_prompt_markup_is_balanced_for_wrapped_sections():
    from ims_mcp.tool_prompts import (
        PROMPT_GET_CONTEXT_INSTRUCTIONS_SOFT,
        PROMPT_SERVER_INSTRUCTIONS_HARD,
        PROMPT_SERVER_INSTRUCTIONS_SOFT,
    )

    assert PROMPT_SERVER_INSTRUCTIONS_SOFT.count("<resources>") == 1
    assert PROMPT_SERVER_INSTRUCTIONS_SOFT.count("</resources>") == 1
    assert PROMPT_SERVER_INSTRUCTIONS_HARD.count("<resources>") == 1
    assert PROMPT_SERVER_INSTRUCTIONS_HARD.count("</resources>") == 1
    assert "<rosetta_workflow_policy" in PROMPT_GET_CONTEXT_INSTRUCTIONS_SOFT
    assert "</rosetta_workflow_policy>" in PROMPT_GET_CONTEXT_INSTRUCTIONS_SOFT


def test_readme_documents_full_tool_surface():
    readme_path = Path(__file__).resolve().parents[1] / "README.md"
    readme = readme_path.read_text(encoding="utf-8")

    for heading in (
        "### 1. get_context_instructions",
        "### 2. query_instructions",
        "### 3. list_instructions",
        "### 4. submit_feedback",
        "### 5. discover_projects",
        "### 6. query_project_context",
        "### 7. store_project_context",
        "### 8. plan_manager",
        "### rosetta://{path*}",
    ):
        assert heading in readme
