"""Tests for instruction retrieval tools, specifically list_instructions."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, Mock

import pytest

from ims_mcp.tools.instructions import list_instructions, _resource_path, _frontmatter_description


class MockDocument:
    """Mock document with resource_path in meta_fields."""
    
    def __init__(self, doc_id: str, resource_path: str):
        self.id = doc_id
        self.meta_fields = {"resource_path": resource_path}


class TestListInstructions:
    """Test list_instructions function with flat format."""

    @pytest.fixture
    def mock_call_ctx(self):
        """Create mock CallContext."""
        ctx = Mock()
        ctx.config = Mock()
        ctx.config.instruction_dataset = "aia-r2"
        ctx.authorizer = Mock()
        ctx.authorizer.can_read = Mock(return_value=True)
        ctx.dataset_lookup = Mock()
        ctx.dataset_lookup.get_id = Mock(return_value="dataset-id-123")
        ctx.dataset_lookup.get_dataset = Mock(return_value=Mock())
        ctx.ragflow = Mock()
        ctx.user_email = "test@example.com"
        return ctx

    @pytest.fixture
    def mock_doc_cache(self):
        """Create mock InstructionDocCache."""
        cache = Mock()
        return cache

    @pytest.fixture
    def mock_bundler(self):
        """Create mock Bundler."""
        bundler = Mock()
        bundler.format_as_listing = Mock(return_value="<mock_listing/>")
        bundler.format_children_listing = Mock(return_value="<mock_children/>")
        return bundler

    @pytest.fixture
    def sample_docs(self):
        """Create sample documents for testing."""
        return [
            MockDocument("1", "skills/coding/SKILL.md"),
            MockDocument("2", "skills/testing/SKILL.md"),
            MockDocument("3", "workflows/coding-flow.md"),
            MockDocument("4", "workflows/testing-flow.md"),
            MockDocument("5", "rules/bootstrap.md"),
            MockDocument("6", "skills/coding/assets/template.md"),
        ]

    @pytest.mark.asyncio
    async def test_flat_format_all_case(self, mock_call_ctx, mock_doc_cache, mock_bundler, sample_docs):
        """Test flat format with 'all' prefix."""
        mock_call_ctx.ragflow.get_dataset = Mock(return_value=Mock())
        mock_doc_cache.get_all_docs_async = AsyncMock(return_value=sample_docs)

        result = await list_instructions(
            call_ctx=mock_call_ctx,
            doc_cache=mock_doc_cache,
            bundler=mock_bundler,
            full_path_from_root="all",
            format="flat",
        )

        assert "List of all instruction files" in result
        assert "Use 2-part/3-part tags to load specific content" in result
        assert "skills/coding/SKILL.md" in result
        assert "workflows/coding-flow.md" in result
        assert "rules/bootstrap.md" in result
        # Verify paths are sorted
        lines = result.split("\n")
        paths = [line for line in lines if line and not line.startswith("List of")]
        assert paths == sorted(paths)

    @pytest.mark.asyncio
    async def test_flat_format_root_prefix(self, mock_call_ctx, mock_doc_cache, mock_bundler, sample_docs):
        """Test flat format with empty/root prefix."""
        mock_call_ctx.ragflow.get_dataset = Mock(return_value=Mock())
        mock_doc_cache.get_all_docs_async = AsyncMock(return_value=sample_docs)

        result = await list_instructions(
            call_ctx=mock_call_ctx,
            doc_cache=mock_doc_cache,
            bundler=mock_bundler,
            full_path_from_root="",
            format="flat",
        )

        assert 'List of immediate folders of "/"' in result
        assert 'List of immediate files of "/"' in result
        assert "skills" in result
        assert "workflows" in result
        assert "rules" in result
        # Should not contain nested files
        assert "skills/coding/SKILL.md" not in result

    @pytest.mark.asyncio
    async def test_flat_format_skills_prefix(self, mock_call_ctx, mock_doc_cache, mock_bundler, sample_docs):
        """Test flat format with 'skills' prefix."""
        mock_call_ctx.ragflow.get_dataset = Mock(return_value=Mock())
        mock_doc_cache.get_all_docs_async = AsyncMock(return_value=sample_docs)

        result = await list_instructions(
            call_ctx=mock_call_ctx,
            doc_cache=mock_doc_cache,
            bundler=mock_bundler,
            full_path_from_root="skills",
            format="flat",
        )

        assert 'List of immediate folders of "skills"' in result
        assert 'List of immediate files of "skills"' in result
        assert "skills/coding" in result
        assert "skills/testing" in result
        # Should not contain nested files
        assert "skills/coding/SKILL.md" not in result

    @pytest.mark.asyncio
    async def test_flat_format_nested_prefix(self, mock_call_ctx, mock_doc_cache, mock_bundler, sample_docs):
        """Test flat format with nested prefix 'skills/coding'."""
        mock_call_ctx.ragflow.get_dataset = Mock(return_value=Mock())
        mock_doc_cache.get_all_docs_async = AsyncMock(return_value=sample_docs)

        result = await list_instructions(
            call_ctx=mock_call_ctx,
            doc_cache=mock_doc_cache,
            bundler=mock_bundler,
            full_path_from_root="skills/coding",
            format="flat",
        )

        assert 'List of immediate folders of "skills/coding"' in result
        assert 'List of immediate files of "skills/coding"' in result
        assert "skills/coding/assets" in result
        assert "skills/coding/SKILL.md" in result
        # Should not contain deeply nested files
        assert "skills/coding/assets/template.md" not in result

    @pytest.mark.asyncio
    async def test_xml_format_default(self, mock_call_ctx, mock_doc_cache, mock_bundler, sample_docs):
        """Test XML format (default) returns bundler output."""
        mock_call_ctx.ragflow.get_dataset = Mock(return_value=Mock())
        mock_doc_cache.get_all_docs_async = AsyncMock(return_value=sample_docs)

        result = await list_instructions(
            call_ctx=mock_call_ctx,
            doc_cache=mock_doc_cache,
            bundler=mock_bundler,
            full_path_from_root="skills",
            format="XML",
        )

        assert "<mock_children/>" in result
        assert "List of immediate children" in result

    @pytest.mark.asyncio
    async def test_xml_format_all_case(self, mock_call_ctx, mock_doc_cache, mock_bundler, sample_docs):
        """Test XML format with 'all' prefix."""
        mock_call_ctx.ragflow.get_dataset = Mock(return_value=Mock())
        mock_doc_cache.get_all_docs_async = AsyncMock(return_value=sample_docs)

        result = await list_instructions(
            call_ctx=mock_call_ctx,
            doc_cache=mock_doc_cache,
            bundler=mock_bundler,
            full_path_from_root="all",
            format="XML",
        )

        assert "<mock_listing/>" in result
        assert "List of all instruction files" in result

    @pytest.mark.asyncio
    async def test_no_children_found(self, mock_call_ctx, mock_doc_cache, mock_bundler):
        """Test when no children are found for prefix."""
        mock_call_ctx.ragflow.get_dataset = Mock(return_value=Mock())
        mock_doc_cache.get_all_docs_async = AsyncMock(return_value=[])

        result = await list_instructions(
            call_ctx=mock_call_ctx,
            doc_cache=mock_doc_cache,
            bundler=mock_bundler,
            full_path_from_root="nonexistent",
            format="flat",
        )

        assert "No children found" in result

    @pytest.mark.asyncio
    async def test_no_files_for_all(self, mock_call_ctx, mock_doc_cache, mock_bundler):
        """Test when no instruction files are found for 'all' case."""
        mock_call_ctx.ragflow.get_dataset = Mock(return_value=Mock())
        mock_doc_cache.get_all_docs_async = AsyncMock(return_value=[])

        result = await list_instructions(
            call_ctx=mock_call_ctx,
            doc_cache=mock_doc_cache,
            bundler=mock_bundler,
            full_path_from_root="all",
            format="flat",
        )

        assert "No instruction files found" in result

    @pytest.mark.asyncio
    async def test_invalid_format(self, mock_call_ctx, mock_doc_cache, mock_bundler, sample_docs):
        """Test with invalid format parameter."""
        mock_call_ctx.ragflow.get_dataset = Mock(return_value=Mock())
        mock_doc_cache.get_all_docs_async = AsyncMock(return_value=sample_docs)

        result = await list_instructions(
            call_ctx=mock_call_ctx,
            doc_cache=mock_doc_cache,
            bundler=mock_bundler,
            full_path_from_root="skills",
            format="invalid",
        )

        assert "Error:" in result
        assert "format" in result.lower()

    @pytest.mark.asyncio
    async def test_permission_denied(self, mock_call_ctx, mock_doc_cache, mock_bundler):
        """Test when user doesn't have permission to read."""
        mock_call_ctx.authorizer.can_read = Mock(return_value=False)

        result = await list_instructions(
            call_ctx=mock_call_ctx,
            doc_cache=mock_doc_cache,
            bundler=mock_bundler,
            full_path_from_root="skills",
            format="flat",
        )

        assert "Error:" in result
        assert "not permitted" in result

    @pytest.mark.asyncio
    async def test_dataset_not_found(self, mock_call_ctx, mock_doc_cache, mock_bundler):
        """Test when dataset is not found."""
        mock_call_ctx.dataset_lookup.get_dataset = Mock(return_value=None)

        result = await list_instructions(
            call_ctx=mock_call_ctx,
            doc_cache=mock_doc_cache,
            bundler=mock_bundler,
            full_path_from_root="skills",
            format="flat",
        )

        assert "Error:" in result
        assert "dataset not found" in result

    @pytest.mark.asyncio
    async def test_deduplication_in_all_case(self, mock_call_ctx, mock_doc_cache, mock_bundler):
        """Test that duplicate paths are deduplicated in 'all' case."""
        # Create docs with duplicate resource paths
        duplicate_docs = [
            MockDocument("1", "skills/coding/SKILL.md"),
            MockDocument("2", "skills/coding/SKILL.md"),  # Duplicate
            MockDocument("3", "workflows/test.md"),
        ]
        mock_call_ctx.ragflow.get_dataset = Mock(return_value=Mock())
        mock_doc_cache.get_all_docs_async = AsyncMock(return_value=duplicate_docs)

        result = await list_instructions(
            call_ctx=mock_call_ctx,
            doc_cache=mock_doc_cache,
            bundler=mock_bundler,
            full_path_from_root="all",
            format="flat",
        )

        # Count occurrences of the duplicate path
        assert result.count("skills/coding/SKILL.md") == 1

    @pytest.mark.asyncio
    async def test_docs_without_resource_path(self, mock_call_ctx, mock_doc_cache, mock_bundler):
        """Test that documents without resource_path are filtered out."""
        docs_with_missing_paths = [
            MockDocument("1", "skills/coding/SKILL.md"),
            MockDocument("2", ""),  # Empty resource path
            Mock(id="3", meta_fields={}),  # No resource_path key
        ]
        mock_call_ctx.ragflow.get_dataset = Mock(return_value=Mock())
        mock_doc_cache.get_all_docs_async = AsyncMock(return_value=docs_with_missing_paths)

        result = await list_instructions(
            call_ctx=mock_call_ctx,
            doc_cache=mock_doc_cache,
            bundler=mock_bundler,
            full_path_from_root="all",
            format="flat",
        )

        assert "skills/coding/SKILL.md" in result
        lines = result.split("\n")
        paths = [line for line in lines if line and not line.startswith("List of")]
        # Should only have one path
        assert len(paths) == 1


class TestResourcePathHelper:
    """Test _resource_path helper function."""

    def test_resource_path_from_dict(self):
        """Test extracting resource_path from dict meta_fields."""
        doc = MockDocument("1", "skills/test.md")
        assert _resource_path(doc) == "skills/test.md"

    def test_resource_path_empty(self):
        """Test handling of empty resource_path."""
        doc = Mock(id="1", meta_fields={"resource_path": ""})
        assert _resource_path(doc) == ""

    def test_resource_path_none(self):
        """Test handling of None resource_path."""
        doc = Mock(id="1", meta_fields={"resource_path": None})
        assert _resource_path(doc) == ""

    def test_resource_path_missing_key(self):
        """Test handling of missing resource_path key."""
        doc = Mock(id="1", meta_fields={})
        assert _resource_path(doc) == ""


class TestFrontmatterDescriptionHelper:
    """Test _frontmatter_description dual-key reader (fm and legacy frontmatter)."""

    def test_reads_fm_key_json_string(self):
        """New shape: 'fm' key with JSON-encoded string."""
        import json
        doc = Mock(meta_fields={"fm": json.dumps({"description": "My description"})})
        assert _frontmatter_description(doc) == "My description"

    def test_reads_legacy_frontmatter_dict(self):
        """Legacy shape: 'frontmatter' key with dict value."""
        doc = Mock(meta_fields={"frontmatter": {"description": "Legacy dict desc"}})
        assert _frontmatter_description(doc) == "Legacy dict desc"

    def test_reads_legacy_frontmatter_string(self):
        """Legacy shape: 'frontmatter' key with JSON string value."""
        import json
        doc = Mock(meta_fields={"frontmatter": json.dumps({"description": "Legacy str desc"})})
        assert _frontmatter_description(doc) == "Legacy str desc"

    def test_fm_takes_precedence_over_legacy_frontmatter(self):
        """When both 'fm' and 'frontmatter' present, 'fm' wins."""
        import json
        doc = Mock(meta_fields={
            "fm": json.dumps({"description": "FM description"}),
            "frontmatter": {"description": "Legacy description"},
        })
        assert _frontmatter_description(doc) == "FM description"

    def test_returns_empty_when_no_frontmatter_keys(self):
        """No frontmatter data at all."""
        doc = Mock(meta_fields={"tags": ["a"], "ims_doc_id": "x"})
        assert _frontmatter_description(doc) == ""

    def test_returns_empty_when_description_missing(self):
        """'fm' key present but no 'description' field in the dict."""
        import json
        doc = Mock(meta_fields={"fm": json.dumps({"title": "Title only"})})
        assert _frontmatter_description(doc) == ""
