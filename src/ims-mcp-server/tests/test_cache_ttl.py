"""Unit tests for tool-level response cache (cachetools-based)."""

from unittest.mock import Mock, patch

import pytest
from cachetools import TTLCache


def test_tool_cache_is_ttl_cache():
    """Test that the tool cache is a cachetools.TTLCache."""
    from ims_mcp.server import _TOOL_CACHE
    assert isinstance(_TOOL_CACHE, TTLCache)


def test_tool_cache_maxsize():
    """Test cache maxsize is 256."""
    from ims_mcp.server import _TOOL_CACHE
    assert _TOOL_CACHE.maxsize == 256


def test_tool_cache_ttl_matches_constant():
    """Test cache TTL matches DOC_CACHE_TTL_SECONDS."""
    from ims_mcp.server import _TOOL_CACHE
    from ims_mcp.constants import DOC_CACHE_TTL_SECONDS
    assert _TOOL_CACHE.ttl == DOC_CACHE_TTL_SECONDS


def test_tool_cache_key_includes_config_fingerprint():
    """Test that cache key includes server_url and instruction_dataset."""
    from ims_mcp.server import _tool_cache_key, _CONFIG_FINGERPRINT
    key = _tool_cache_key("test_tool", query="hello")
    assert key[0] == _CONFIG_FINGERPRINT


def test_tool_cache_key_stable_for_same_params():
    """Test that same params produce the same cache key."""
    from ims_mcp.server import _tool_cache_key
    k1 = _tool_cache_key("tool_a", query="hello", tags=["a", "b"])
    k2 = _tool_cache_key("tool_a", query="hello", tags=["a", "b"])
    assert k1 == k2


def test_tool_cache_key_different_for_different_params():
    """Test that different params produce different cache keys."""
    from ims_mcp.server import _tool_cache_key
    k1 = _tool_cache_key("tool_a", query="hello")
    k2 = _tool_cache_key("tool_a", query="world")
    assert k1 != k2


def test_tool_cache_key_different_for_different_tools():
    """Test that different tool names produce different cache keys."""
    from ims_mcp.server import _tool_cache_key
    k1 = _tool_cache_key("tool_a", query="hello")
    k2 = _tool_cache_key("tool_b", query="hello")
    assert k1 != k2


def test_tool_cache_key_sorted_params():
    """Test that parameter order doesn't affect the cache key."""
    from ims_mcp.server import _tool_cache_key
    k1 = _tool_cache_key("tool_a", query="hello", tags=["a"])
    k2 = _tool_cache_key("tool_a", tags=["a"], query="hello")
    assert k1 == k2


def test_tool_cache_key_lists_become_tuples():
    """Test that list values are converted to tuples for hashability."""
    from ims_mcp.server import _tool_cache_key
    key = _tool_cache_key("tool_a", tags=["a", "b"])
    # Should not raise — tuples are hashable, lists are not
    hash(key)


def test_tool_cache_key_none_params():
    """Test that None params are included in key (not skipped)."""
    from ims_mcp.server import _tool_cache_key
    k1 = _tool_cache_key("tool_a", query=None)
    k2 = _tool_cache_key("tool_a", query="hello")
    assert k1 != k2


@pytest.mark.asyncio
async def test_get_context_instructions_caches_result():
    """Test that get_context_instructions caches the result in _TOOL_CACHE."""
    from ims_mcp.server import get_context_instructions, _TOOL_CACHE, _tool_cache_key
    from ims_mcp.constants import TOOL_GET_CONTEXT_INSTRUCTIONS

    mock_result = "bootstrap instructions content"

    with patch("ims_mcp.server._RAGFLOW", Mock()), \
         patch("ims_mcp.server._build_call_context", return_value=Mock()), \
         patch("ims_mcp.server._retry_once", return_value=mock_result), \
         patch("ims_mcp.server._log"):

        _TOOL_CACHE.clear()
        result = await get_context_instructions()

        assert result == mock_result
        cache_key = _tool_cache_key(TOOL_GET_CONTEXT_INSTRUCTIONS)
        assert _TOOL_CACHE.get(cache_key) == mock_result
        _TOOL_CACHE.clear()


@pytest.mark.asyncio
async def test_get_context_instructions_returns_cached_when_fresh():
    """Test that get_context_instructions returns cached value when fresh."""
    from ims_mcp.server import get_context_instructions, _TOOL_CACHE, _tool_cache_key
    from ims_mcp.constants import TOOL_GET_CONTEXT_INSTRUCTIONS

    cached_content = "cached bootstrap instructions"

    with patch("ims_mcp.server._RAGFLOW", Mock()), \
         patch("ims_mcp.server._retry_once") as mock_retry:

        _TOOL_CACHE.clear()
        cache_key = _tool_cache_key(TOOL_GET_CONTEXT_INSTRUCTIONS)
        _TOOL_CACHE[cache_key] = cached_content

        result = await get_context_instructions()

        assert result == cached_content
        mock_retry.assert_not_called()
        _TOOL_CACHE.clear()


@pytest.mark.asyncio
async def test_get_context_instructions_reloads_when_cache_empty():
    """Test that get_context_instructions reloads when cache is empty."""
    from ims_mcp.server import get_context_instructions, _TOOL_CACHE

    new_content = "new bootstrap instructions"

    with patch("ims_mcp.server._RAGFLOW", Mock()), \
         patch("ims_mcp.server._build_call_context", return_value=Mock()), \
         patch("ims_mcp.server._retry_once", return_value=new_content), \
         patch("ims_mcp.server._log"):

        _TOOL_CACHE.clear()
        result = await get_context_instructions()

        assert result == new_content
        _TOOL_CACHE.clear()


@pytest.mark.asyncio
async def test_get_context_instructions_does_not_cache_errors():
    """Test that errors are not cached."""
    from ims_mcp.server import get_context_instructions, _TOOL_CACHE, _tool_cache_key
    from ims_mcp.constants import TOOL_GET_CONTEXT_INSTRUCTIONS

    error_result = "Error: something went wrong"

    with patch("ims_mcp.server._RAGFLOW", Mock()), \
         patch("ims_mcp.server._build_call_context", return_value=Mock()), \
         patch("ims_mcp.server._retry_once", return_value=error_result), \
         patch("ims_mcp.server._log"):

        _TOOL_CACHE.clear()
        result = await get_context_instructions()

        assert result == error_result
        cache_key = _tool_cache_key(TOOL_GET_CONTEXT_INSTRUCTIONS)
        assert _TOOL_CACHE.get(cache_key) is None
        _TOOL_CACHE.clear()


@pytest.mark.asyncio
async def test_query_instructions_caches_result():
    """Test that query_instructions caches its result."""
    from ims_mcp.server import query_instructions, _TOOL_CACHE, _tool_cache_key
    from ims_mcp.constants import TOOL_QUERY_INSTRUCTIONS

    mock_result = "query result content"

    with patch("ims_mcp.server._RAGFLOW", Mock()), \
         patch("ims_mcp.server._build_call_context", return_value=Mock()), \
         patch("ims_mcp.server._retry_once", return_value=mock_result), \
         patch("ims_mcp.server._log"):

        _TOOL_CACHE.clear()
        result = await query_instructions(tags=["coding-flow"])

        assert result == mock_result
        cache_key = _tool_cache_key(TOOL_QUERY_INSTRUCTIONS, query=None, tags=["coding-flow"])
        assert _TOOL_CACHE.get(cache_key) == mock_result
        _TOOL_CACHE.clear()


@pytest.mark.asyncio
async def test_query_instructions_returns_cached():
    """Test that query_instructions returns cached value on repeat call."""
    from ims_mcp.server import query_instructions, _TOOL_CACHE, _tool_cache_key
    from ims_mcp.constants import TOOL_QUERY_INSTRUCTIONS

    cached_content = "cached query result"

    with patch("ims_mcp.server._RAGFLOW", Mock()), \
         patch("ims_mcp.server._retry_once") as mock_retry:

        _TOOL_CACHE.clear()
        cache_key = _tool_cache_key(TOOL_QUERY_INSTRUCTIONS, query=None, tags=["coding-flow"])
        _TOOL_CACHE[cache_key] = cached_content

        result = await query_instructions(tags=["coding-flow"])

        assert result == cached_content
        mock_retry.assert_not_called()
        _TOOL_CACHE.clear()


@pytest.mark.asyncio
async def test_list_instructions_caches_result():
    """Test that list_instructions caches its result."""
    from ims_mcp.server import list_instructions, _TOOL_CACHE, _tool_cache_key
    from ims_mcp.constants import TOOL_LIST_INSTRUCTIONS

    mock_result = "listing content"

    with patch("ims_mcp.server._RAGFLOW", Mock()), \
         patch("ims_mcp.server._build_call_context", return_value=Mock()), \
         patch("ims_mcp.server._retry_once", return_value=mock_result), \
         patch("ims_mcp.server._log"):

        _TOOL_CACHE.clear()
        result = await list_instructions(full_path_from_root="skills")

        assert result == mock_result
        cache_key = _tool_cache_key(TOOL_LIST_INSTRUCTIONS, full_path_from_root="skills", format=None)
        assert _TOOL_CACHE.get(cache_key) == mock_result
        _TOOL_CACHE.clear()


@pytest.mark.asyncio
async def test_list_instructions_returns_cached():
    """Test that list_instructions returns cached value on repeat call."""
    from ims_mcp.server import list_instructions, _TOOL_CACHE, _tool_cache_key
    from ims_mcp.constants import TOOL_LIST_INSTRUCTIONS

    cached_content = "cached listing"

    with patch("ims_mcp.server._RAGFLOW", Mock()), \
         patch("ims_mcp.server._retry_once") as mock_retry:

        _TOOL_CACHE.clear()
        cache_key = _tool_cache_key(TOOL_LIST_INSTRUCTIONS, full_path_from_root="all", format=None)
        _TOOL_CACHE[cache_key] = cached_content

        result = await list_instructions(full_path_from_root="all")

        assert result == cached_content
        mock_retry.assert_not_called()
        _TOOL_CACHE.clear()
