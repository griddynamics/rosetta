from ims_mcp.tools.resources import normalize_resource_path


def test_normalize_resource_path_slashes_and_whitespace():
    assert normalize_resource_path("  /skills/planning/SKILL.md  ") == "skills/planning/SKILL.md"


def test_normalize_resource_path_backslashes():
    assert normalize_resource_path(r"\skills\planning\SKILL.md") == "skills/planning/SKILL.md"


def test_normalize_resource_path_preserves_double_slash_for_validation():
    assert normalize_resource_path("skills//planning/SKILL.md") == "skills//planning/SKILL.md"
