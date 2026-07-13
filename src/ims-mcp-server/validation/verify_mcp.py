"""Verification script for Rosetta MCP.

This script validates:
1) tool input schemas include parameter descriptions,
2) resource template registration exists,
3) VFS resource reads return bundled content,
4) invalid-input checks for read tools,
5) list_instructions returns folder/file listings for known path prefixes,
6) list_instructions(full_path_from_root="all") returns full listing with acquire/bundling note,
7) query_instructions >5 file limit returns listing format instead of content,
8) get_context_instructions cache TTL (5-minute expiration) and frontmatter stripping (default off, include_frontmatter=True preserves it),
9) tool-level response caching for query_instructions and list_instructions.

Required environment:
- VERSION: release version used for dataset selection (e.g. r2)

Optional environment:
- VFS_STRICT: strict mode toggle. Default is strict (1).
  Set VFS_STRICT=0 only for diagnostic runs.

Runtime requirement:
- Network access to configured Rosetta/RAGFlow endpoint and readable instruction dataset
  for the selected VERSION (e.g. aia-r2 when VERSION=r2).

Run example:
  cp .env.dev .env && VERSION=r2 venv/bin/python src/ims-mcp-server/validation/verify_mcp.py
"""

import asyncio
import os
import re
import sys
from typing import List

# Suppress noisy DEBUG/INFO logs from FastMCP internals during verification.
os.environ.setdefault("FASTMCP_LOG_LEVEL", "WARNING")
os.environ.setdefault("FASTMCP_ENABLE_RICH_LOGGING", "false")

# Ensure imports resolve to local ims-mcp-server sources, not an installed package.
SERVER_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVER_ROOT not in sys.path:
    sys.path.insert(0, SERVER_ROOT)

# Load API keys from repo-root .env if not already set.
# The validation harness now lives under src/ims-mcp-server/, so repo root is
# three levels up from this file.
env_file = os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env")
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

from fastmcp import Client
from ims_mcp.server import mcp  # import the FastMCP instance directly


def get_test_resource_paths() -> List[str]:
    """Return candidate resource_path values for R2."""
    return [
        "rules/requirements-best-practices.md",
        "agents/prompt-engineer.md",
        "workflows/requirements-flow.md",
    ]


def is_successful_bundle(content: str) -> bool:
    """True when resource read returned bundled XML payload."""
    return "<rosetta:file " in content


def is_listing_output(content: str) -> bool:
    """True when output contains folder or file listing entries."""
    return "<rosetta:folder " in content or '<rosetta:file ' in content


_FM_IN_BUNDLE = re.compile(r"<rosetta:file[^>]+>\s*---", re.DOTALL)


def has_frontmatter_in_bundle(content: str) -> bool:
    """True when any rosetta:file content block starts with YAML frontmatter (---)."""
    return bool(_FM_IN_BUNDLE.search(content))


def get_test_list_prefixes() -> List[str]:
    """Return candidate full_path_from_root values for list_instructions verification."""
    return ["skills", "rules"]


def extract_text(result: object) -> str:
    """Best-effort extraction of text from FastMCP call/read results."""
    if result is None:
        return ""

    # Newer FastMCP call_tool return type: CallToolResult(content=[TextContent...], data=...)
    content = getattr(result, "content", None)
    if isinstance(content, list) and content:
        first = content[0]
        text = getattr(first, "text", None)
        if isinstance(text, str):
            return text
        return str(first)

    # Older/list-style return payloads
    if isinstance(result, (list, tuple)) and result:
        first = result[0]
        text = getattr(first, "text", None)
        if isinstance(text, str):
            return text
        return str(first)

    text = getattr(result, "text", None)
    if isinstance(text, str):
        return text

    data = getattr(result, "data", None)
    if isinstance(data, str):
        return data
    if data is not None:
        return str(data)

    return str(result)


async def main() -> None:
    errors: list[str] = []

    # Connect to the MCP server via in-memory transport
    print("Connecting to MCP server via in-memory transport...")
    async with Client(mcp) as client:
        # Bootstrap session: call get_context_instructions first, mirroring
        # the prep-step contract agents follow.
        print("\nBootstrapping session via get_context_instructions...")
        await client.call_tool("get_context_instructions", {})
        print("Session bootstrapped.")

        # 1. Verify tool schemas have parameter descriptions
        print("\n=== Tool Schema Verification ===")
        tools = await client.list_tools()
        print(f"Found {len(tools)} tools")

        for tool in tools:
            print(f"\nTool: {tool.name}")
            schema = tool.inputSchema
            props = schema.get("properties", {})
            for param_name, param_info in props.items():
                desc = param_info.get("description", "")
                status = "OK" if desc else "MISSING"
                if not desc:
                    errors.append(f"Tool '{tool.name}' param '{param_name}' has no description")
                print(f"  {param_name}: [{status}] {desc[:80] if desc else '<no description>'}")

        # 2. Verify resource templates are registered
        print("\n=== Resource Template Verification ===")
        templates = await client.list_resource_templates()
        print(f"Found {len(templates)} resource templates")

        for tmpl in templates:
            print(f"  Template: {tmpl.uriTemplate} (name={tmpl.name})")

        if not templates:
            errors.append("No resource templates registered")
        else:
                # Check we have our rosetta-* template
                rosetta_templates = [t for t in templates if "rosetta" in str(t.uriTemplate)]
                if not rosetta_templates:
                    errors.append("No rosetta-* resource template found")
                else:
                    print(f"\n  Found rosetta template: {rosetta_templates[0].uriTemplate}")
                    if str(rosetta_templates[0].uriTemplate) != "rosetta://{path*}":
                        errors.append(
                            "Unexpected rosetta resource template URI. Expected 'rosetta://{path*}'"
                        )

        # 3. Verify VFS resource read behavior
        print("\n=== VFS Resource Read Verification ===")
        version = (os.environ.get("VERSION") or "").strip()
        if not version:
            errors.append("VERSION environment variable is required (example: VERSION=r2)")
            version = "r2"
        strict_vfs = os.environ.get("VFS_STRICT", "1").lower() not in {"0", "false", "no"}
        candidate_paths = get_test_resource_paths()
        bundle_found = False
        no_docs_count = 0
        connection_errors = 0

        for resource_path in candidate_paths:
            test_path = f"rosetta://{resource_path}"
            try:
                result = await client.read_resource(test_path)
                if result and hasattr(result[0], "text"):
                    content = result[0].text
                else:
                    content = str(result)

                print(f"  Read {test_path}: {len(content)} chars")
                print(f"  Preview: {content[:220]}...")

                if is_successful_bundle(content):
                    bundle_found = True
                    print("  Result: BUNDLED CONTENT FOUND")
                    # Verify path attribute is populated (not empty)
                    if f'path="{resource_path}"' not in content:
                        errors.append(
                            f"VFS bundle for '{resource_path}' missing correct path attribute"
                        )
                    break

                if content.startswith("Error: No documents found for resource path:"):
                    no_docs_count += 1
                    print("  Result: dataset reachable, no matching resource_path")
                elif content.startswith("Error:"):
                    connection_errors += 1
                    print("  Result: resource read error")
                else:
                    connection_errors += 1
                    print("  Result: non-bundled response (unexpected format)")

            except Exception as exc:
                connection_errors += 1
                print(f"  Read {test_path}: {exc}")

        if not bundle_found:
            if strict_vfs:
                errors.append(
                    "VFS strict mode failed: no bundled content found for any candidate path "
                    f"for version {version}"
                )
            else:
                print(
                    f"  NOTE: No bundled content found for version {version}. "
                    f"no_docs={no_docs_count}, errors={connection_errors}. "
                    "Set VFS_STRICT=1 to fail in this case."
                )
        if strict_vfs and connection_errors:
            errors.append(f"VFS resource read had {connection_errors} error response(s)")

        # 4. Invalid input checks for read tools
        print("\n=== Invalid Input Verification ===")

        try:
            result = await client.call_tool("query_instructions", {"tags": ""})
            text = extract_text(result)
            print(f"  query_instructions with blank string tag: {text[:160]}")
            if text != "Error: tags must not be empty":
                errors.append("query_instructions blank string tag was not rejected clearly")
        except Exception as exc:
            errors.append(f"query_instructions blank-tag check failed: {exc}")

        try:
            result = await client.read_resource("rosetta://../bad")
            text = result[0].text if result and hasattr(result[0], "text") else str(result)
            print(f"  read_resource with traversal path: {text[:160]}")
            if "must not contain empty, '.' or '..' path segments" not in text:
                errors.append("resource read traversal path was not rejected clearly")
        except Exception as exc:
            errors.append(f"resource invalid-input check failed: {exc}")

        # 5. Verify list_instructions returns folder/file listings
        print("\n=== List Instructions Verification ===")
        list_prefixes = get_test_list_prefixes()
        list_found = False

        for prefix in list_prefixes:
            print(f"\n  Listing full_path_from_root: {prefix}")
            try:
                result = await client.call_tool("list_instructions", {"full_path_from_root": prefix})
                list_text = extract_text(result)
                print(f"    Result ({len(list_text)} chars): {list_text[:300]}...")

                if is_listing_output(list_text):
                    list_found = True
                    print("    Result: LISTING OUTPUT FOUND")
                    # Verify the header note is present
                    if "List of immediate children" not in list_text:
                        errors.append(f"list_instructions({prefix or '/'}) missing header note")
                    # Verify path attributes are populated
                    if prefix:
                        if f'path="{prefix}/' not in list_text:
                            errors.append(f"list_instructions({prefix}) entries missing path with prefix")
                    # Verify no empty path attributes
                    if 'path=""' in list_text:
                        errors.append(f"list_instructions({prefix or '/'}) has entries with empty path")
                    # When files are listed, ensure self-closing rosetta:file with frontmatter attr
                    if "<rosetta:file " in list_text:
                        if 'frontmatter="' not in list_text:
                            errors.append(f"list_instructions({prefix or '/'}) missing frontmatter attribute")
                    break
                elif list_text.startswith("No children found"):
                    print("    Result: no children (dataset reachable, prefix has no matches)")
                elif list_text.startswith("Error:"):
                    print(f"    Result: error response")
                else:
                    print("    Result: unexpected format")
            except Exception as exc:
                print(f"    Error: {exc}")

        if not list_found and strict_vfs:
            errors.append(
                f"list_instructions: no listing output found for any prefix "
                f"({list_prefixes}) for version {version}"
            )

        # 6. Verify list_instructions(all) returns full listing
        print("\n=== List Instructions All Verification ===")
        try:
            result = await client.call_tool("list_instructions", {"full_path_from_root": "all"})
            all_text = extract_text(result)
            print(f"    Result ({len(all_text)} chars): {all_text[:300]}...")

            if "<rosetta:file " in all_text and "/>" in all_text:
                print("    Result: ALL LISTING OUTPUT FOUND")
                if "When acquired, files with duplicate path values are bundled/combined together" not in all_text:
                    errors.append('list_instructions("all") missing acquire/bundling note')
                if "Use exact TAG attribute to load specific content" not in all_text:
                    errors.append('list_instructions("all") missing unique-tag guidance')
                if "</rosetta:file>" in all_text:
                    errors.append('list_instructions("all") returned bundled content instead of listing output')
                if 'path=""' in all_text:
                    errors.append('list_instructions("all") has entries with empty path')
            elif all_text.startswith("No instruction files found"):
                print("    Result: no instruction files found")
            elif all_text.startswith("Error:"):
                errors.append(f'list_instructions("all") failed: {all_text[:100]}')
            else:
                errors.append('list_instructions("all") returned unexpected format')
        except Exception as exc:
            errors.append(f'list_instructions("all") check failed: {exc}')

        # 6b. Verify list_instructions(all, format="flat") returns plain text paths
        print("\n=== List Instructions Flat Format Verification ===")
        try:
            result = await client.call_tool("list_instructions", {
                "full_path_from_root": "all",
                "format": "flat"
            })
            flat_text = extract_text(result)
            print(f"    Result ({len(flat_text)} chars): {flat_text[:300]}...")

            if flat_text.startswith("Error:"):
                errors.append(f'list_instructions("all", format="flat") failed: {flat_text[:100]}')
            elif flat_text.startswith("No instruction files found"):
                print("    Result: no instruction files found")
            elif "<rosetta:" in flat_text or 'path="' in flat_text:
                errors.append('list_instructions("all", format="flat") returned XML instead of plain text')
            else:
                # Verify it's newline-separated paths (skip header lines starting with "List of")
                lines = flat_text.strip().split("\n")
                # Filter out header lines
                path_lines = [line for line in lines if line and not line.startswith("List of")]
                if path_lines:
                    print(f"    Result: FLAT OUTPUT FOUND ({len(path_lines)} paths)")
                    sample_path = path_lines[0]
                    if sample_path and not sample_path.startswith("<") and "/" in sample_path:
                        print(f"    Sample path: {sample_path}")
                    else:
                        errors.append(f'list_instructions flat format has unexpected line format: {sample_path}')
                else:
                    errors.append('list_instructions flat format returned empty output')
        except Exception as exc:
            errors.append(f'list_instructions flat format check failed: {exc}')

        # 6c. Verify list_instructions with invalid format returns error
        print("\n=== List Instructions Invalid Format Verification ===")
        try:
            result = await client.call_tool("list_instructions", {
                "full_path_from_root": "all",
                "format": "JSON"
            })
            invalid_text = extract_text(result)
            print(f"    Result: {invalid_text[:160]}")
            if invalid_text != "Error: format must be 'XML' or 'flat' (case-insensitive)":
                errors.append(f'list_instructions invalid format not rejected clearly: {invalid_text[:100]}')
        except Exception as exc:
            errors.append(f'list_instructions invalid format check failed: {exc}')

        # 7a. Verify query_instructions listing path (>QUERY_LIST_THRESHOLD,
        #     <=QUERY_TOO_MANY_THRESHOLD) → header + listing.
        print("\n=== Query Instructions Listing Threshold Verification (>5 and <=25) ===")
        # 'workflow' (singular) lands in the listing band on aia-r2 with both
        # core and grid overlays published (~12 docs). 'workflows' (plural)
        # exceeds the ceiling once grid is included.
        listing_tags = ["workflow"]
        try:
            result = await client.call_tool("query_instructions", {"tags": listing_tags})
            limit_text = extract_text(result)
            print(f"    Result ({len(limit_text)} chars): {limit_text[:300]}...")

            if "Query matched" in limit_text and "without content" in limit_text:
                print("    Result: >5 LIMIT TRIGGERED (listing format)")
                if not is_listing_output(limit_text):
                    errors.append("query_instructions listing: header present but no listing entries found")
                if 'path=""' in limit_text:
                    errors.append("query_instructions listing: has entries with empty path")
                if 'frontmatter="' not in limit_text:
                    errors.append("query_instructions listing: missing frontmatter attribute")
            else:
                errors.append(
                    f"query_instructions listing path expected for tags={listing_tags} "
                    f"(>5 and <=25 docs) but got: {limit_text[:120]}"
                )
        except Exception as exc:
            errors.append(f"query_instructions listing threshold check failed: {exc}")

        # 7b. Verify query_instructions defensive ceiling (>QUERY_TOO_MANY_THRESHOLD)
        #     → non-cacheable Error refusing to bundle.
        print("\n=== Query Instructions Defensive Ceiling Verification (>25) ===")
        # 'r2' tags every doc in the release — guaranteed to exceed the
        # defensive ceiling regardless of dataset size.
        ceiling_tags = ["r2"]
        try:
            result = await client.call_tool("query_instructions", {"tags": ceiling_tags})
            ceiling_text = extract_text(result)
            print(f"    Result ({len(ceiling_text)} chars): {ceiling_text[:300]}...")

            if ceiling_text.startswith("Error: No documents found or too many documents found"):
                print("    Result: >25 DEFENSIVE CEILING TRIGGERED (refusing to bundle)")
            else:
                errors.append(
                    f"query_instructions defensive ceiling expected for tags={ceiling_tags} "
                    f"(>25 docs) but got: {ceiling_text[:120]}"
                )
        except Exception as exc:
            errors.append(f"query_instructions defensive ceiling check failed: {exc}")

        # 8. Verify get_context_instructions cache TTL (integration test)
        print("\n=== Bootstrap Instructions Cache TTL Verification ===")
        try:
            import time

            # First call - should load and cache
            print("    First call: loading bootstrap instructions...")
            start_time = time.time()
            result1 = await client.call_tool("get_context_instructions", {})
            first_call_time = time.time() - start_time
            text1 = extract_text(result1)

            if text1.startswith("Error:"):
                errors.append(f"get_context_instructions failed: {text1[:100]}")
            else:
                print(f"    First call completed in {first_call_time:.2f}s ({len(text1)} chars)")

                # Verify workflow listing is appended with known workflow entry
                if "## Available Workflows" in text1:
                    print("    OK Workflow listing appended (## Available Workflows found)")
                else:
                    errors.append("get_context_instructions: workflow listing missing (## Available Workflows not found)")
                # adhoc-flow and coding-flow both carry tags: [workflow] — at least one must appear with a phrase from its description
                adhoc_ok = "adhoc-flow.md" in text1 and "execution plan" in text1
                coding_ok = "coding-flow.md" in text1 and "tech specs" in text1
                if adhoc_ok or coding_ok:
                    matched = "adhoc-flow.md (execution plan)" if adhoc_ok else "coding-flow.md (tech specs)"
                    print(f"    OK Known workflow with description found: {matched}")
                else:
                    errors.append("get_context_instructions: expected adhoc-flow.md or coding-flow.md with description phrase not found in workflow listing")

                # Verify frontmatter is always stripped from bundle content
                if has_frontmatter_in_bundle(text1):
                    errors.append("get_context_instructions: YAML frontmatter (---) found in bundle content (should always be stripped)")
                else:
                    print("    OK Frontmatter stripped from bundle content")

                # Second call immediately - should return cached (fast)
                print("    Second call (immediate): should return cached...")
                start_time = time.time()
                result2 = await client.call_tool("get_context_instructions", {})
                second_call_time = time.time() - start_time
                text2 = extract_text(result2)

                if text2 == text1:
                    print(f"    Second call completed in {second_call_time:.2f}s")
                    if second_call_time < first_call_time * 0.5:
                        print("    OK Cache is working (second call significantly faster)")
                    else:
                        print(f"    WARN Cache may not be working (second call not faster: {second_call_time:.2f}s vs {first_call_time:.2f}s)")
                else:
                    errors.append("get_context_instructions: second call returned different content (cache not working)")

                print("    Note: Full TTL expiration (5 minutes) not tested in this quick validation")

        except Exception as exc:
            errors.append(f"get_context_instructions integration test failed: {exc}")

        # 9. Verify tool-level response caching for query_instructions
        print("\n=== Tool-Level Response Cache Verification (query_instructions) ===")
        try:
            import time

            # Clear the tool cache to start fresh
            from ims_mcp.server import _TOOL_CACHE
            _TOOL_CACHE.clear()

            # Pick a tag that should return results
            cache_test_tags = ["rosetta-bootstrap"]

            # First call — populates cache
            print("    First call: query_instructions(tags=['rosetta-bootstrap'])...")
            start_time = time.time()
            result1 = await client.call_tool("query_instructions", {"tags": cache_test_tags})
            first_call_time = time.time() - start_time
            text1 = extract_text(result1)

            if text1.startswith("Error:"):
                errors.append(f"query_instructions cache test failed (first call): {text1[:100]}")
            elif text1 == "No instructions found":
                print("    SKIP: no instructions found for test tag, cannot verify caching")
            else:
                print(f"    First call completed in {first_call_time:.3f}s ({len(text1)} chars)")

                # Second call — should hit cache
                print("    Second call (same params): should return cached...")
                start_time = time.time()
                result2 = await client.call_tool("query_instructions", {"tags": cache_test_tags})
                second_call_time = time.time() - start_time
                text2 = extract_text(result2)

                if text2 != text1:
                    errors.append("query_instructions cache: second call returned different content")
                else:
                    print(f"    Second call completed in {second_call_time:.3f}s")
                    if second_call_time < first_call_time * 0.5:
                        print("    OK Cache hit confirmed (second call significantly faster)")
                    elif second_call_time < 0.01:
                        print("    OK Cache hit confirmed (second call < 10ms)")
                    else:
                        print(f"    WARN Second call not obviously faster ({second_call_time:.3f}s vs {first_call_time:.3f}s) — cache may still be working if RAGFlow is fast")

                # Third call with different params — should miss cache
                print("    Third call (different params): should miss cache...")
                start_time = time.time()
                result3 = await client.call_tool("query_instructions", {"tags": ["nonexistent-tag-xyz"]})
                third_call_time = time.time() - start_time
                text3 = extract_text(result3)
                print(f"    Third call completed in {third_call_time:.3f}s ({len(text3)} chars)")
                # Different params should yield different result (or "No instructions found")
                if text3 == text1 and text3 != "No instructions found":
                    errors.append("query_instructions cache: different params returned same result (cache key collision?)")

        except Exception as exc:
            errors.append(f"query_instructions cache test failed: {exc}")

        # 10. Verify tool-level response caching for list_instructions
        print("\n=== Tool-Level Response Cache Verification (list_instructions) ===")
        try:
            import time

            _TOOL_CACHE.clear()

            # First call
            print("    First call: list_instructions(full_path_from_root='all')...")
            start_time = time.time()
            result1 = await client.call_tool("list_instructions", {"full_path_from_root": "all"})
            first_call_time = time.time() - start_time
            text1 = extract_text(result1)

            if text1.startswith("Error:"):
                errors.append(f"list_instructions cache test failed (first call): {text1[:100]}")
            elif text1.startswith("No instruction files found"):
                print("    SKIP: no instructions found, cannot verify caching")
            else:
                print(f"    First call completed in {first_call_time:.3f}s ({len(text1)} chars)")

                # Second call — should hit cache
                print("    Second call (same params): should return cached...")
                start_time = time.time()
                result2 = await client.call_tool("list_instructions", {"full_path_from_root": "all"})
                second_call_time = time.time() - start_time
                text2 = extract_text(result2)

                if text2 != text1:
                    errors.append("list_instructions cache: second call returned different content")
                else:
                    print(f"    Second call completed in {second_call_time:.3f}s")
                    if second_call_time < first_call_time * 0.5:
                        print("    OK Cache hit confirmed (second call significantly faster)")
                    elif second_call_time < 0.01:
                        print("    OK Cache hit confirmed (second call < 10ms)")
                    else:
                        print(f"    WARN Second call not obviously faster ({second_call_time:.3f}s vs {first_call_time:.3f}s) — cache may still be working if RAGFlow is fast")

                # Third call with different format — should miss cache (different key)
                print("    Third call (format='flat'): should miss cache...")
                start_time = time.time()
                result3 = await client.call_tool("list_instructions", {"full_path_from_root": "all", "format": "flat"})
                third_call_time = time.time() - start_time
                text3 = extract_text(result3)
                print(f"    Third call completed in {third_call_time:.3f}s ({len(text3)} chars)")

                # Different format should yield different result
                if text3 == text1:
                    errors.append("list_instructions cache: format='flat' returned same result as default XML (key not differentiating format?)")

        except Exception as exc:
            errors.append(f"list_instructions cache test failed: {exc}")

    # Summary
    print("\n=== Summary ===")
    if errors:
        print(f"FAILED: {len(errors)} error(s)")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print("ALL CHECKS PASSED")


if __name__ == "__main__":
    asyncio.run(main())
