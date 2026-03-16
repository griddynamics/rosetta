"""Document data model with frontmatter-aware metadata extraction."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import hashlib
import uuid
from typing import List, Optional, cast

from ..typing_utils import JsonDict, JsonValue

try:
    import frontmatter
except Exception:  # pragma: no cover - guarded at runtime
    frontmatter = None


def _is_r2_or_later(release: str) -> bool:
    """Check if release is r2 or later (r2, r3, r2.5, etc.)."""
    if not release or not release.startswith("r"):
        return False
    try:
        version = float(release[1:])
        return version >= 2
    except ValueError:
        return False


@dataclass
class DocumentData:
    ims_doc_id: str
    file_path: Path
    content: bytes
    is_text: bool
    content_str: str | None
    tags: list[str]
    domain: str
    release: str
    doc_title: str
    original_path: str
    sort_order: int | None
    content_hash: str
    line_count: int | None = None
    resource_path: str | None = None
    frontmatter: JsonDict | None = None

    @classmethod
    def from_file(
        cls,
        file_path: Path,
        workspace_root: Path,
        file_extensions_text: List[str] | None = None,
        publish_root: Path | None = None,
    ) -> "DocumentData":
        del publish_root  # Publish scope is physical; metadata paths are normalized from file path.
        if file_extensions_text is None:
            # All extensions that contain human-readable text (code, config, markup).
            # Used ONLY for is_text detection (read as UTF-8 string), NOT as upload filter.
            file_extensions_text = [
                # Markdown / text
                ".md", ".mdx", ".txt", ".rst",
                # Web / markup
                ".htm", ".html", ".xml", ".yml", ".yaml", ".json", ".jsonl", ".ldjson",
                ".csv", ".ini", ".rtf",
                # Text data formats
                ".toml", ".cfg", ".conf", ".properties", ".env", ".log",
                # Shell / scripts
                ".sh", ".bash", ".zsh", ".fish", ".ps1", ".psm1", ".bat", ".cmd",
                # Code (all languages RAGFlow accepts + common extras)
                ".py", ".js", ".ts", ".java", ".c", ".cpp", ".h", ".php", ".go",
                ".cs", ".kt", ".sql", ".rb", ".rs", ".swift", ".r",
                ".jsx", ".tsx", ".vue", ".scss", ".css", ".less", ".sass",
                ".lua", ".pl", ".pm", ".groovy", ".gradle", ".scala",
                ".tf", ".hcl", ".dockerfile",
            ]

        ims_doc_id = cls._generate_doc_id(file_path, workspace_root)
        content = file_path.read_bytes()
        is_text = file_path.suffix.lower() in file_extensions_text

        content_str = None
        if is_text:
            try:
                content_str = content.decode("utf-8")
            except UnicodeDecodeError:
                content_str = content.decode("utf-8", errors="ignore")

        # Count lines platform-independently: \r\n, \n\r, \r, \n all count as separators
        line_count = None
        if content_str is not None:
            import re as _re
            line_count = len(_re.split(r'\r\n|\n\r|\r|\n', content_str))

        instr_rel = cls._path_relative_to_instructions(file_path)
        parsed_path = cls._parse_instructions_path(instr_rel)
        path_tags, domain, release = cls._extract_path_metadata(
            file_path=file_path,
            workspace_root=workspace_root,
            instr_rel=instr_rel,
            parsed_path=parsed_path,
        )
        frontmatter_tags, sort_order, fm_dict = cls._extract_frontmatter_metadata(file_path, content_str)
        tags = cls._merge_tags(path_tags, frontmatter_tags)

        # instructions-relative path is the single source of truth for path-like metadata fields
        original_path = instr_rel if instr_rel else file_path.name
        resource_path = cls._compute_resource_path(parsed_path)
        doc_title = cls._compute_doc_title(parsed_path, file_path.name)

        content_hash = cls._calculate_hash(
            content_str if content_str is not None else str(len(content)),
            tags,
            domain,
            release,
            doc_title,
            doc_title,
            sort_order,
            original_path,
            resource_path,
        )

        return cls(
            ims_doc_id=ims_doc_id,
            file_path=file_path,
            content=content,
            is_text=is_text,
            content_str=content_str,
            tags=tags,
            domain=domain,
            release=release,
            doc_title=doc_title,
            original_path=original_path,
            sort_order=sort_order,
            content_hash=content_hash,
            line_count=line_count,
            resource_path=resource_path,
            frontmatter=fm_dict,
        )

    @staticmethod
    def _generate_doc_id(file_path: Path, workspace_root: Path) -> str:
        try:
            rel_path = file_path.relative_to(workspace_root)
        except ValueError:
            rel_path = file_path

        path_str = str(rel_path).replace("\\", "/")
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"rulesofpower.{path_str}"))

    @staticmethod
    def _path_relative_to_instructions(file_path: Path) -> Optional[str]:
        """Get path relative to the first 'instructions' folder in the absolute path.

        Uses the topmost (first) 'instructions' folder if multiple exist.

        Examples:
            /ws/instructions/r2/core/agents/planner.md -> r2/core/agents/planner.md
            /ws/instructions/agents/r1/coding.md -> agents/r1/coding.md
            /ws/other/file.md -> None
        """
        parts = file_path.resolve().parts
        for i, part in enumerate(parts):
            if part == "instructions":
                remaining = parts[i + 1:]
                if remaining:
                    return "/".join(remaining)
                return None
        return None

    @dataclass
    class ParsedInstructionsPath:
        """Decomposed instructions-relative path.

        For R2 path r2/core/agents/coding.md:
          release="r2", org="core",
          rest=("agents", "coding.md"), filename="coding.md"

        For R1 path agents/r1/coding.md:
          release="r1", org=None,
          rest=("coding.md",), filename="coding.md"
        """
        release: str              # release folder (r1, r2, ...)
        org: Optional[str]        # org folder (R2+ only, e.g. "core")
        rest: tuple[str, ...]     # remaining path parts after org (R2+) or release (R1)
        filename: str             # bare filename

    @classmethod
    def _parse_instructions_path(cls, instr_rel: Optional[str]) -> Optional["DocumentData.ParsedInstructionsPath"]:
        """Decompose instructions-relative path into semantic parts."""
        if not instr_rel:
            return None

        parts = tuple(instr_rel.split("/"))
        release = next((part for part in parts if cls._is_release_tag(part)), "")
        if not release:
            return None

        release_idx = list(parts).index(release)
        after_release = parts[release_idx + 1:]
        filename = parts[-1]

        if _is_r2_or_later(release) and len(after_release) >= 2:
            org = after_release[0]
            rest = after_release[1:]
        else:
            org = None
            rest = after_release if after_release else (filename,)

        return cls.ParsedInstructionsPath(
            release=release,
            org=org,
            rest=rest,
            filename=filename,
        )

    @staticmethod
    def _compute_doc_title(parsed_path: Optional["DocumentData.ParsedInstructionsPath"], fallback_filename: str) -> str:
        """Compute document title.

        R2+: instructions-relative path minus release version.
              e.g. r2/core/agents/coding.md -> core/agents/coding.md
        R1:   bare filename (e.g. coding.md)
        No instructions folder: bare filename
        """
        if not parsed_path or not _is_r2_or_later(parsed_path.release):
            return fallback_filename

        if parsed_path.org:
            return "/".join((parsed_path.org, *parsed_path.rest))
        return fallback_filename

    @staticmethod
    def _compute_resource_path(parsed_path: Optional["DocumentData.ParsedInstructionsPath"]) -> Optional[str]:
        """Compute resource_path: logical path stripped of release (and org for R2+).

        R2+: strip release and org → e.g. r2/core/skills/planning/SKILL.md -> skills/planning/SKILL.md
        R1:  strip everything up to and including release → e.g. agents/r1/coding.md -> coding.md
        """
        if not parsed_path:
            return None

        if _is_r2_or_later(parsed_path.release):
            return "/".join(parsed_path.rest) if parsed_path.rest else parsed_path.filename
        return "/".join(parsed_path.rest) if parsed_path.rest else parsed_path.filename

    @staticmethod
    def _is_release_tag(tag: str) -> bool:
        return bool(tag) and tag.startswith("r") and tag[1:].replace(".", "").isdigit()

    @classmethod
    def _extract_path_metadata(
        cls,
        file_path: Path,
        workspace_root: Path,
        instr_rel: Optional[str] = None,
        parsed_path: Optional["DocumentData.ParsedInstructionsPath"] = None,
    ) -> tuple[List[str], str, str]:
        if instr_rel:
            normalized_parts = ("instructions", *instr_rel.split("/"))
            return cls._extract_path_metadata_from_parts(normalized_parts, parsed_path)

        try:
            rel_path = file_path.relative_to(workspace_root)
        except ValueError:
            return ([], "general", "")

        return cls._extract_path_metadata_from_parts(rel_path.parts, parsed_path)

    @classmethod
    def _extract_path_metadata_from_parts(
        cls,
        path_parts: tuple[str, ...],
        parsed_path: Optional["DocumentData.ParsedInstructionsPath"] = None
    ) -> tuple[List[str], str, str]:
        parts = path_parts[:-1]
        domain = parts[0] if parts else "general"
        tags = list(parts) if parts else []
        filename = path_parts[-1] if path_parts else ""
        if filename:
            tags.append(filename)

        release = ""
        for tag in tags:
            if cls._is_release_tag(tag):
                release = tag
                break

        # R2+ domain: folder after release in path
        if _is_r2_or_later(release) and release in parts:
            release_idx = list(parts).index(release)
            if release_idx + 1 < len(parts):
                domain = parts[release_idx + 1]

        # Two-part and three-part tags: based on resource_path (parsed_path.rest)
        # Use parsed_path.rest if available, otherwise fall back to full path parts
        resource_parts = parsed_path.rest if parsed_path else None
        
        if resource_parts:
            # Two-part tag: <parent>/<filename> from resource_path
            if len(resource_parts) >= 2:
                two_part = f"{resource_parts[-2]}/{resource_parts[-1]}"
                if two_part not in tags:
                    tags.append(two_part)

            # Three-part tag: <grandparent>/<parent>/<filename> from resource_path
            if len(resource_parts) >= 3:
                three_part = f"{resource_parts[-3]}/{resource_parts[-2]}/{resource_parts[-1]}"
                if three_part not in tags:
                    tags.append(three_part)
        else:
            # Fallback: use full path parts (for non-instructions files)
            if len(parts) >= 1 and filename:
                two_part = f"{parts[-1]}/{filename}"
                if two_part not in tags:
                    tags.append(two_part)

            if len(parts) >= 2 and filename:
                three_part = f"{parts[-2]}/{parts[-1]}/{filename}"
                if three_part not in tags:
                    tags.append(three_part)

        return (tags, domain, release)

    @staticmethod
    def _extract_frontmatter_metadata(file_path: Path, content_str: str | None) -> tuple[list[str], int | None, JsonDict | None]:
        if not content_str or file_path.suffix.lower() not in {".md", ".markdown"}:
            return [], None, None
        if frontmatter is None:
            return [], None, None

        try:
            post = frontmatter.loads(content_str)
        except Exception as e:
            print(f"  ⚠️  Failed to parse frontmatter in {file_path}: {e}")
            return [], None, None

        fm_dict = dict(post.metadata) if post.metadata else None

        tags_value = post.metadata.get("tags", [])
        if isinstance(tags_value, str):
            fm_tags = [item.strip() for item in tags_value.split(",") if item.strip()]
        elif isinstance(tags_value, list):
            fm_tags = [str(item).strip() for item in tags_value if str(item).strip()]
        else:
            fm_tags = []

        sort_order_raw = post.metadata.get("sort_order")
        sort_order: Optional[int] = None
        if sort_order_raw is not None:
            try:
                sort_order = int(sort_order_raw)
            except (TypeError, ValueError):
                sort_order = None

        return fm_tags, sort_order, fm_dict

    @staticmethod
    def _merge_tags(path_tags: list[str], frontmatter_tags: list[str]) -> list[str]:
        merged: list[str] = []
        seen: set[str] = set()
        for tag in [*path_tags, *frontmatter_tags]:
            normalized = tag.lower()
            if normalized in seen:
                continue
            seen.add(normalized)
            merged.append(tag)
        return merged

    @staticmethod
    def _calculate_hash(
        content: str,
        tags: list[str],
        domain: str,
        release: str,
        title: str,
        doc_name: str,
        sort_order: int | None,
        original_path: str = "",
        resource_path: str | None = None,
    ) -> str:
        sorted_tags = ",".join(sorted(tags, key=str.lower))
        hash_input = (
            f"{content}|tags:{sorted_tags}|domain:{domain}|release:{release}|title:{title}"
            f"|doc_name:{doc_name}"
            f"|sort_order:{sort_order if sort_order is not None else ''}"
            f"|original_path:{original_path}"
            f"|resource_path:{resource_path if resource_path is not None else ''}"
        )
        return hashlib.md5(hash_input.encode("utf-8")).hexdigest()

    def to_metadata_dict(self) -> JsonDict:
        meta: JsonDict = {
            "tags": self.tags,
            "domain": self.domain,
            "release": self.release,
            "content_hash": self.content_hash,
            "ims_doc_id": self.ims_doc_id,
            "original_path": self.original_path,
            "doc_title": self.doc_title,
            "sort_order": self.sort_order,
        }
        if self.line_count is not None:
            meta["line_count"] = self.line_count
        if self.resource_path is not None:
            meta["resource_path"] = self.resource_path
        if self.frontmatter is not None:
            meta["frontmatter"] = cast(JsonValue, self.frontmatter)
        return meta
