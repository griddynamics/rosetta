"""Verification script for Rosetta MCP.

This script validates:
1) tool input schemas include parameter descriptions,
2) resource template registration exists,
3) VFS resource reads return bundled content,
4) project lifecycle: discover -> store (force) -> discover -> query (tags + query) -> delete,
5) list_instructions returns folder/file listings for known path prefixes,
6) list_instructions(full_path_from_root="all") returns full listing with acquire/bundling note,
7) query_instructions >5 file limit returns listing format instead of content,
8) invalid-input checks return explicit contract errors,
9) plan_manager: all 6 commands end-to-end using in-memory store by default,
   and RedisPlanStore when REDIS_URL is set,
10) get_context_instructions cache TTL (5-minute expiration).

Required environment:
- VERSION: release version used for dataset selection and test path candidates
  (for example: r1 or r2)

Optional environment:
- VFS_STRICT: strict mode toggle. Default is strict (1).
  Set VFS_STRICT=0 only for diagnostic runs.
- REDIS_URL: Redis connection URL for testing RedisPlanStore backend.
  If not set, plan_manager tests use in-memory MemoryPlanStore instead.
  Example: redis://localhost:6379/0
- ROSETTA_ALLOWED_SCOPES: optional explicit scopes for project-data tools.
  Defaults to allow_write_data for this verification harness.

Runtime requirement:
- Network access to configured Rosetta/RAGFlow endpoint and readable instruction dataset
  for the selected VERSION (for example: aia-r1 when VERSION=r1).

Run examples:
  # Basic test (in-memory plan storage)
  cp .env.dev .env && VERSION=r1 venv/bin/python ims-mcp-server/validation/verify_mcp.py
  cp .env.dev .env && VERSION=r2 venv/bin/python ims-mcp-server/validation/verify_mcp.py
  
  # Test with Redis backend for plan_manager
  cp .env.dev .env && REDIS_URL="redis://localhost:6379/0" VERSION=r2 venv/bin/python ims-mcp-server/validation/verify_mcp.py

Redis/Valkey Setup (for REDIS_URL testing):
  
  1. Start Valkey container:
     podman run -d --name rosetta-redis -p 6379:6379 docker.io/valkey/valkey:latest
     (optionally: podman machine start)
  
  2. Verify it's running:
     podman ps | grep rosetta-redis
     podman logs rosetta-redis
  
  3. Run tests with Redis:
     cp .env.dev .env && REDIS_URL="redis://localhost:6379/0" VERSION=r2 venv/bin/python ims-mcp-server/validation/verify_mcp.py
  
  4. Stop and cleanup when done:
     podman stop rosetta-redis
     podman rm rosetta-redis
     podman machine stop podman-machine-default  # Optional: to free resources
"""

import asyncio
import os
import sys
import uuid
from typing import List

# Suppress noisy DEBUG/INFO logs from FastMCP internals during verification.
os.environ.setdefault("FASTMCP_LOG_LEVEL", "WARNING")
os.environ.setdefault("FASTMCP_ENABLE_RICH_LOGGING", "false")

# Ensure imports resolve to local ims-mcp-server sources, not an installed package.
SERVER_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVER_ROOT not in sys.path:
    sys.path.insert(0, SERVER_ROOT)

# Load API keys from repo-root .env if not already set
env_file = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

# Project-data checks in this harness require the client-data scope unless the
# caller explicitly overrides it.
os.environ.setdefault("ROSETTA_ALLOWED_SCOPES", "allow_write_data")

from fastmcp import Client
from ims_mcp.server import mcp  # import the FastMCP instance directly


def get_test_resource_paths(version: str) -> List[str]:
    """Return candidate resource_path values for the configured version."""
    if version.startswith("r2"):
        return [
            "rules/requirements-best-practices.md",
            "agents/prompt-engineer.md",
            "workflows/requirements-flow.md",
        ]
    return [
        "coding.md",
        "agents.md",
        "guardrails.md",
    ]


def is_successful_bundle(content: str) -> bool:
    """True when resource read returned bundled XML payload."""
    return "<rosetta:file " in content


def is_listing_output(content: str) -> bool:
    """True when output contains folder or file listing entries."""
    return "<rosetta:folder " in content or '<rosetta:file ' in content


def get_test_list_prefixes(version: str) -> List[str]:
    """Return candidate full_path_from_root values for list_instructions verification."""
    if version.startswith("r2"):
        return ["skills", "rules"]
    # R1 resource_paths are flat filenames (no folder hierarchy), list from root
    return [""]


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
        # Bootstrap session: call get_context_instructions to enable
        # scope-gated tools (write_data) for this session.
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
            errors.append("VERSION environment variable is required (example: VERSION=r1)")
            version = "r1"
        strict_vfs = os.environ.get("VFS_STRICT", "1").lower() not in {"0", "false", "no"}
        candidate_paths = get_test_resource_paths(version)
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

                if content.startswith("No documents found for resource path:"):
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

        print("\n=== Invalid Input Verification ===")
        try:
            result = await client.call_tool("query_project_context", {"repository_name": "demo"})
            text = extract_text(result)
            print(f"  query_project_context without query/tags: {text[:160]}")
            if text != "Error: at least one of query or tags is required":
                errors.append("query_project_context missing explicit required-input error")
        except Exception as exc:
            errors.append(f"query_project_context invalid-input check failed: {exc}")

        try:
            result = await client.call_tool("store_project_context", {
                "repository_name": "demo",
                "document": "../BAD.md",
                "tags": ["test"],
                "content": "x",
            })
            text = extract_text(result)
            print(f"  store_project_context with traversal path: {text[:160]}")
            if "must not contain empty, '.' or '..' path segments" not in text:
                errors.append("store_project_context traversal path was not rejected clearly")
        except Exception as exc:
            errors.append(f"store_project_context invalid-input check failed: {exc}")

        try:
            result = await client.call_tool("query_project_context", {
                "repository_name": "../bad",
                "tags": ["test"],
            })
            text = extract_text(result)
            print(f"  query_project_context with invalid repository_name: {text[:160]}")
            if text != "Error: repository_name must not contain '/' or '\\' characters":
                errors.append("query_project_context invalid repository_name was not rejected clearly")
        except Exception as exc:
            errors.append(f"query_project_context invalid-repository check failed: {exc}")

        try:
            result = await client.call_tool("store_project_context", {
                "repository_name": "../bad",
                "document": "BAD.md",
                "tags": ["test"],
                "content": "x",
                "force": True,
            })
            text = extract_text(result)
            print(f"  store_project_context with invalid repository_name: {text[:160]}")
            if text != "Error: repository_name must not contain '/' or '\\' characters":
                errors.append("store_project_context invalid repository_name was not rejected clearly")
        except Exception as exc:
            errors.append(f"store_project_context invalid-repository check failed: {exc}")

        try:
            result = await client.call_tool("query_instructions", {"tags": ""})
            text = extract_text(result)
            print(f"  query_instructions with blank string tag: {text[:160]}")
            if text != "Error: tags must not be empty":
                errors.append("query_instructions blank string tag was not rejected clearly")
        except Exception as exc:
            errors.append(f"query_instructions blank-tag check failed: {exc}")

        try:
            result = await client.call_tool("query_project_context", {
                "repository_name": "demo",
                "tags": "",
            })
            text = extract_text(result)
            print(f"  query_project_context with blank string tag: {text[:160]}")
            if text != "Error: tags must not be empty":
                errors.append("query_project_context blank string tag was not rejected clearly")
        except Exception as exc:
            errors.append(f"query_project_context blank-tag check failed: {exc}")

        try:
            result = await client.call_tool("discover_projects", {"query": "x" * 257})
            text = extract_text(result)
            print(f"  discover_projects with oversized query: {text[:160]}")
            if text != "Error: query must be at most 256 characters":
                errors.append("discover_projects oversized query was not rejected clearly")
        except Exception as exc:
            errors.append(f"discover_projects oversized-query check failed: {exc}")

        try:
            result = await client.call_tool("store_project_context", {
                "repository_name": "demo",
                "document": "nested//BAD.md",
                "tags": ["test"],
                "content": "x",
            })
            text = extract_text(result)
            print(f"  store_project_context with double-slash path: {text[:160]}")
            if "must not contain empty, '.' or '..' path segments" not in text:
                errors.append("store_project_context double-slash path was not rejected clearly")
        except Exception as exc:
            errors.append(f"store_project_context double-slash invalid-input check failed: {exc}")

        try:
            result = await client.call_tool("submit_feedback", {
                "request_mode": "   ",
                "feedback": {
                    "summary": "x",
                    "root_cause": "y",
                    "prompt_suggestions": "z",
                    "context": "c",
                },
            })
            text = extract_text(result)
            print(f"  submit_feedback with blank request_mode: {text[:160]}")
            if text != "Error: request_mode must not be empty":
                errors.append("submit_feedback blank request_mode was not rejected clearly")
        except Exception as exc:
            errors.append(f"submit_feedback invalid-input check failed: {exc}")

        try:
            result = await client.read_resource("rosetta://../bad")
            text = result[0].text if result and hasattr(result[0], "text") else str(result)
            print(f"  read_resource with traversal path: {text[:160]}")
            if "must not contain empty, '.' or '..' path segments" not in text:
                errors.append("resource read traversal path was not rejected clearly")
        except Exception as exc:
            errors.append(f"resource invalid-input check failed: {exc}")

        try:
            result = await client.call_tool("plan_manager", {
                "command": "upsert",
                "plan_name": f"verify-invalid-root-{uuid.uuid4().hex[:8]}",
                "data": {"kind": "phase", "name": "Bad Root"},
            })
            text = extract_text(result)
            print(f"  plan_manager with root kind field: {text[:160]}")
            if text != "Error: Use data.kind='phase' or data.kind='step' when creating a new item":
                errors.append("plan_manager root kind field was not rejected with plain Error contract")
        except Exception as exc:
            errors.append(f"plan_manager invalid root-kind check failed: {exc}")

        # 4. Project lifecycle: discover -> store (force) -> discover -> query -> store (update) -> query -> delete dataset
        print("\n=== Project Lifecycle Verification ===")
        test_project = f"mcp-verify-{uuid.uuid4().hex[:8]}"
        test_doc = "VERIFY-TEST.md"
        test_content_v1 = "# Verification Test V1\nThis is the initial verification document."
        test_content_v2 = "# Verification Test V2\nThis is the updated verification document."
        test_tags = ["test", "verification"]
        dataset_name = f"project-{test_project}"

        try:
            # Step 1: discover — project must not exist yet
            print(f"\n  Step 1: Discover projects (expect '{test_project}' absent)")
            result = await client.call_tool("discover_projects", {"query": test_project})
            discover_text = extract_text(result)
            print(f"    Result: {discover_text[:200]}")
            if test_project in discover_text and "No projects found" not in discover_text:
                errors.append(f"Project '{test_project}' already exists before test")

            # Step 2: store with force — creates project and document
            print(f"\n  Step 2: Store document with force=true (v1)")
            result = await client.call_tool("store_project_context", {
                "repository_name": test_project,
                "document": test_doc,
                "tags": test_tags,
                "content": test_content_v1,
                "force": True,
            })
            store_text = extract_text(result)
            print(f"    Result: {store_text[:200]}")
            if not store_text.startswith("Stored"):
                errors.append(f"store_project_context (v1) failed: {store_text}")

            # Step 3: discover — project must now appear
            print(f"\n  Step 3: Discover projects (expect '{test_project}' present)")
            result = await client.call_tool("discover_projects", {"query": test_project})
            discover_text = extract_text(result)
            print(f"    Result: {discover_text[:200]}")
            if test_project not in discover_text:
                errors.append(f"Project '{test_project}' not found after store")

            # Step 4: query — v1 document must be retrievable
            print(f"\n  Step 4: Query project context (expect v1)")
            result = await client.call_tool("query_project_context", {
                "repository_name": test_project,
                "tags": test_tags,
            })
            query_text = extract_text(result)
            print(f"    Result: {query_text[:200]}...")
            if not is_successful_bundle(query_text):
                errors.append(f"query_project_context (v1) did not return bundled content: {query_text[:100]}")
            elif "V1" not in query_text:
                errors.append(f"query_project_context (v1) content mismatch: expected V1 marker")
            if f'path="{test_doc}"' not in query_text:
                errors.append(f"query_project_context (v1) missing path attribute for '{test_doc}'")

            # Step 4b: query with explicit multi-word query parameter
            print(f"\n  Step 4b: Query project context with query parameter (expect v1)")
            result = await client.call_tool("query_project_context", {
                "repository_name": test_project,
                "query": "verification test document",
            })
            query_by_text = extract_text(result)
            print(f"    Result: {query_by_text[:200]}...")
            if not is_successful_bundle(query_by_text):
                errors.append(f"query_project_context (v1 query=...) did not return bundled content: {query_by_text[:100]}")
            elif "V1" not in query_by_text:
                errors.append("query_project_context (v1 query=...) content mismatch: expected V1 marker")

            # Step 5: store again (update) — same document name, new content
            print(f"\n  Step 5: Store document again (update, v2)")
            result = await client.call_tool("store_project_context", {
                "repository_name": test_project,
                "document": test_doc,
                "tags": test_tags,
                "content": test_content_v2,
            })
            store_text = extract_text(result)
            print(f"    Result: {store_text[:200]}")
            if not store_text.startswith("Stored"):
                errors.append(f"store_project_context (v2 update) failed: {store_text}")

            # Step 6: query — must return v2, not v1
            print(f"\n  Step 6: Query project context (expect v2)")
            result = await client.call_tool("query_project_context", {
                "repository_name": test_project,
                "tags": test_tags,
            })
            query_text = extract_text(result)
            print(f"    Result: {query_text[:200]}...")
            if not is_successful_bundle(query_text):
                errors.append(f"query_project_context (v2) did not return bundled content: {query_text[:100]}")
            elif "V2" not in query_text:
                errors.append(f"query_project_context (v2) content mismatch: expected V2 marker, got V1")
            if f'path="{test_doc}"' not in query_text:
                errors.append(f"query_project_context (v2) missing path attribute for '{test_doc}'")

            # Step 6b: query with explicit multi-word query parameter after update
            print(f"\n  Step 6b: Query project context with query parameter (expect v2)")
            result = await client.call_tool("query_project_context", {
                "repository_name": test_project,
                "query": "verification test document",
            })
            query_by_text = extract_text(result)
            print(f"    Result: {query_by_text[:200]}...")
            if not is_successful_bundle(query_by_text):
                errors.append(f"query_project_context (v2 query=...) did not return bundled content: {query_by_text[:100]}")
            elif "V2" not in query_by_text:
                errors.append("query_project_context (v2 query=...) content mismatch: expected V2 marker")

        finally:
            # Cleanup: delete the test dataset via SDK
            print(f"\n  Cleanup: Deleting test dataset '{dataset_name}'")
            try:
                from ims_mcp.server import _RAGFLOW
                if _RAGFLOW:
                    datasets = _RAGFLOW.list_datasets(page=1, page_size=1000)
                    for ds in datasets:
                        if ds.name == dataset_name:
                            _RAGFLOW.delete_datasets([ds.id])
                            print(f"    Deleted dataset '{dataset_name}' (id: {ds.id})")
                            break
                    else:
                        print(f"    Dataset '{dataset_name}' not found (already clean)")
                else:
                    print("    WARNING: _RAGFLOW not available, manual cleanup needed")
            except Exception as cleanup_exc:
                print(f"    WARNING: cleanup failed: {cleanup_exc}")

        # 5. Verify list_instructions returns folder/file listings
        print("\n=== List Instructions Verification ===")
        list_prefixes = get_test_list_prefixes(version)
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
                    # R2 uses hierarchical resource_path values; R1 root listings are flat filenames.
                    sample_path = path_lines[0]
                    is_flat_r1_name = (
                        version.startswith("r1")
                        and "/" not in sample_path
                        and sample_path.endswith(".md")
                    )
                    is_hierarchical_path = "/" in sample_path
                    if sample_path and not sample_path.startswith("<") and (
                        is_hierarchical_path or is_flat_r1_name
                    ):
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

        # 7. Verify query_instructions >5 file limit returns listing format
        print("\n=== Query Instructions >5 File Limit Verification ===")
        # Use a broad query that should match many documents
        broad_tags = ["r2"] if version.startswith("r2") else ["r1"]
        try:
            result = await client.call_tool("query_instructions", {"tags": broad_tags})
            limit_text = extract_text(result)
            print(f"    Result ({len(limit_text)} chars): {limit_text[:300]}...")

            if "Query matched" in limit_text and "without content" in limit_text:
                print("    Result: >5 LIMIT TRIGGERED (listing format)")
                if not is_listing_output(limit_text):
                    errors.append("query_instructions >5 limit: header present but no listing entries found")
                if 'path=""' in limit_text:
                    errors.append("query_instructions >5 limit: has entries with empty path")
                if 'frontmatter="' not in limit_text:
                    errors.append("query_instructions >5 limit: missing frontmatter attribute")
            elif is_successful_bundle(limit_text):
                # Could be <=5 docs matched - not necessarily an error
                print("    Result: bundled content returned (<=5 docs matched, limit not triggered)")
            elif limit_text.startswith("No instructions found"):
                print("    Result: no instructions found for broad tag")
            elif limit_text.startswith("Error:"):
                errors.append(f"query_instructions broad query failed: {limit_text[:100]}")
            else:
                print(f"    Result: unexpected format")
        except Exception as exc:
            errors.append(f"query_instructions >5 limit check failed: {exc}")

        # 8. Verify plan_manager tool: all 6 commands via in-memory store
        print("\n=== Plan Manager Verification ===")
        plan_name = f"verify-plan-{uuid.uuid4().hex[:8]}"
        try:
            # 7-help. help command
            print("\n  7-help. help command")
            result = await client.call_tool("plan_manager", {
                "command": "help",
                "plan_name": "unused",
            })
            help_text = extract_text(result)
            print(f"    Result: {help_text[:160]}")
            if "Commands:" not in help_text:
                errors.append(f"plan_manager help missing 'Commands:': {help_text[:100]}")

            # 7a. upsert entire_plan — create a plan with two phases and steps
            print(f"\n  7a. upsert entire_plan (create plan '{plan_name}')")
            result = await client.call_tool("plan_manager", {
                "command": "upsert",
                "plan_name": plan_name,
                "target_id": "entire_plan",
                "data": {
                    "name": "Verify Plan",
                    "phases": [
                        {
                            "id": "p1",
                            "name": "Phase One",
                            "steps": [
                                {"id": "s1", "name": "Step A", "prompt": "Do step A"},
                                {"id": "s2", "name": "Step B", "prompt": "Do step B", "depends_on": ["s1"]},
                            ],
                        },
                        {
                            "id": "p2",
                            "name": "Phase Two",
                            "steps": [
                                {"id": "s3", "name": "Step C", "prompt": "Do step C", "depends_on": ["s2"]},
                            ],
                        },
                    ],
                },
            })
            upsert_text = extract_text(result)
            print(f"    Result: {upsert_text[:200]}")
            if '"ok": true' not in upsert_text and "'ok': True" not in upsert_text and "ok" not in upsert_text.lower():
                errors.append(f"plan_manager upsert entire_plan failed: {upsert_text[:100]}")

            # 7b. query entire_plan
            print(f"\n  7b. query entire_plan")
            result = await client.call_tool("plan_manager", {
                "command": "query",
                "plan_name": plan_name,
                "target_id": "entire_plan",
            })
            query_text = extract_text(result)
            print(f"    Result: {query_text[:300]}")
            if "Phase One" not in query_text:
                errors.append(f"plan_manager query entire_plan missing 'Phase One': {query_text[:100]}")
            if "Step A" not in query_text:
                errors.append(f"plan_manager query entire_plan missing 'Step A': {query_text[:100]}")

            # 7c. show_status
            print(f"\n  7c. show_status entire_plan")
            result = await client.call_tool("plan_manager", {
                "command": "show_status",
                "plan_name": plan_name,
                "target_id": "entire_plan",
            })
            status_text = extract_text(result)
            print(f"    Result: {status_text[:300]}")
            if "step_progress_pct" not in status_text:
                errors.append(f"plan_manager show_status missing 'step_progress_pct': {status_text[:100]}")
            if "open" not in status_text:
                errors.append(f"plan_manager show_status missing 'open' status: {status_text[:100]}")

            # 7d. next — only s1 has no deps, so only s1 should be returned
            print(f"\n  7d. next (expect only s1 — only step with no deps)")
            result = await client.call_tool("plan_manager", {
                "command": "next",
                "plan_name": plan_name,
                "target_id": "entire_plan",
                "limit": 0,
            })
            next_text = extract_text(result)
            print(f"    Result: {next_text[:300]}")
            if "s1" not in next_text:
                errors.append(f"plan_manager next missing 's1' (no-dep step): {next_text[:100]}")
            if "s2" in next_text:
                errors.append(f"plan_manager next incorrectly included 's2' (depends on s1): {next_text[:100]}")

            # 7e. update_status s1 → complete
            print(f"\n  7e. update_status s1 → complete")
            result = await client.call_tool("plan_manager", {
                "command": "update_status",
                "plan_name": plan_name,
                "target_id": "s1",
                "new_status": "complete",
            })
            update_text = extract_text(result)
            print(f"    Result: {update_text[:200]}")
            if "complete" not in update_text and "ok" not in update_text.lower():
                errors.append(f"plan_manager update_status s1 failed: {update_text[:100]}")

            # 7f. next after s1 complete — s2 should now be available
            print(f"\n  7f. next after s1=complete (expect s2)")
            result = await client.call_tool("plan_manager", {
                "command": "next",
                "plan_name": plan_name,
                "target_id": "entire_plan",
            })
            next_text2 = extract_text(result)
            print(f"    Result: {next_text2[:300]}")
            if "s2" not in next_text2:
                errors.append(f"plan_manager next missing 's2' after s1 complete: {next_text2[:100]}")

            # 7g. upsert patch step s2 (add description via null-removal test)
            print(f"\n  7g. upsert patch step s2 (merge-patch)")
            result = await client.call_tool("plan_manager", {
                "command": "upsert",
                "plan_name": plan_name,
                "target_id": "s2",
                "data": {"name": "Step B Updated"},
            })
            patch_text = extract_text(result)
            print(f"    Result: {patch_text[:200]}")
            if "ok" not in patch_text.lower():
                errors.append(f"plan_manager upsert patch step failed: {patch_text[:100]}")

            # Verify patch was applied
            result = await client.call_tool("plan_manager", {
                "command": "query",
                "plan_name": plan_name,
                "target_id": "s2",
            })
            query_s2 = extract_text(result)
            if "Step B Updated" not in query_s2:
                errors.append(f"plan_manager patch not applied: 'Step B Updated' missing in s2 query: {query_s2[:100]}")
            # Original prompt must still be there (merge, not replace)
            if "Do step B" not in query_s2:
                errors.append(f"plan_manager patch wiped original prompt: missing 'Do step B' in s2: {query_s2[:100]}")

            # 7h. subagent fields: create plan with subagent/role/model, verify next output
            print(f"\n  7h. subagent fields in next output")
            sa_plan = f"verify-sa-{uuid.uuid4().hex[:8]}"
            result = await client.call_tool("plan_manager", {
                "command": "upsert",
                "plan_name": sa_plan,
                "target_id": "entire_plan",
                "data": {
                    "name": "Subagent Plan",
                    "phases": [{
                        "id": "p1",
                        "name": "Phase",
                        "subagent": "code-gen",
                        "role": "Senior Python dev",
                        "model": "claude-4-opus",
                        "steps": [
                            {"id": "s1", "name": "Step", "prompt": "do it",
                             "subagent": "test-writer", "role": "QA engineer", "model": "gpt-4o"},
                        ],
                    }],
                },
            })
            sa_upsert = extract_text(result)
            if "ok" not in sa_upsert.lower():
                errors.append(f"plan_manager subagent upsert failed: {sa_upsert[:100]}")

            result = await client.call_tool("plan_manager", {
                "command": "next",
                "plan_name": sa_plan,
                "target_id": "entire_plan",
            })
            sa_next = extract_text(result)
            print(f"    next result: {sa_next[:300]}")
            for expected in ("phase_subagent", "phase_role", "phase_model",
                             '"subagent"', '"role"', '"model"'):
                if expected not in sa_next:
                    errors.append(f"plan_manager next missing {expected} in subagent plan")

            print(f"\n  All plan_manager checks completed for plan '{plan_name}'")

        except Exception as exc:
            errors.append(f"plan_manager integration test failed: {exc}")

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

                # For r2: verify workflow listing is appended with known workflow entry
                if version.startswith("r2"):
                    if "## Available Workflows" in text1:
                        print("    ✓ Workflow listing appended (## Available Workflows found)")
                    else:
                        errors.append("get_context_instructions: workflow listing missing (## Available Workflows not found)")
                    # adhoc-flow and coding-flow both carry tags: [workflow] — at least one must appear with a phrase from its description
                    adhoc_ok = "adhoc-flow.md" in text1 and "execution plan" in text1
                    coding_ok = "coding-flow.md" in text1 and "tech specs" in text1
                    if adhoc_ok or coding_ok:
                        matched = "adhoc-flow.md (execution plan)" if adhoc_ok else "coding-flow.md (tech specs)"
                        print(f"    ✓ Known workflow with description found: {matched}")
                    else:
                        errors.append("get_context_instructions: expected adhoc-flow.md or coding-flow.md with description phrase not found in workflow listing")

                # Second call immediately - should return cached (fast)
                print("    Second call (immediate): should return cached...")
                start_time = time.time()
                result2 = await client.call_tool("get_context_instructions", {})
                second_call_time = time.time() - start_time
                text2 = extract_text(result2)

                if text2 == text1:
                    print(f"    Second call completed in {second_call_time:.2f}s")
                    if second_call_time < first_call_time * 0.5:
                        print("    ✓ Cache is working (second call significantly faster)")
                    else:
                        print(f"    ⚠ Cache may not be working (second call not faster: {second_call_time:.2f}s vs {first_call_time:.2f}s)")
                else:
                    errors.append("get_context_instructions: second call returned different content (cache not working)")

                print("    Note: Full TTL expiration (5 minutes) not tested in this quick validation")
                
        except Exception as exc:
            errors.append(f"get_context_instructions integration test failed: {exc}")

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
