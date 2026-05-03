"""Bundle documents into XML payloads."""

from __future__ import annotations

import json
from collections.abc import Sequence
from typing import cast
from xml.sax.saxutils import escape as xml_escape

from ims_mcp.clients.document import DocumentClient
from ims_mcp.constants import (
    DEFAULT_SORT_ORDER,
    XML_CONTENT_NOT_LOADED,
    XML_FILE_CLOSE,
    XML_FILE_LIST_CLOSE,
    XML_FILE_LIST_OPEN,
    XML_FILE_OPEN,
    XML_FOLDER_LIST,
    XML_FRONTMATTER_CLOSE,
    XML_FRONTMATTER_OPEN,
)
from ims_mcp.typing_utils import DocumentLike, JsonObject, JsonValue, as_json_object


class Bundler:
    def __init__(self, document_client: DocumentClient):
        self._documents = document_client

    @staticmethod
    def _unwrap_base(obj: object) -> JsonValue:
        """Convert ragflow_sdk Base objects to plain dicts recursively."""
        if isinstance(obj, dict):
            return {str(k): Bundler._unwrap_base(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [Bundler._unwrap_base(item) for item in obj]
        if not isinstance(obj, (str, int, float, bool, type(None))) and hasattr(obj, "__dict__"):
            return {str(k): Bundler._unwrap_base(v) for k, v in vars(obj).items() if k != "rag"}
        return cast(JsonValue, obj)

    @staticmethod
    def _meta(doc: DocumentLike) -> JsonObject:
        meta = getattr(doc, "meta_fields", {}) or {}
        if isinstance(meta, dict):
            return as_json_object(meta)
        # SDK object — extract all known fields, unwrapping nested Base objects.
        # Both "fm" (current key) and "frontmatter" (legacy) are extracted so
        # docs published before and after the key rename remain readable.
        result: JsonObject = {}
        for key in ("tags", "sort_order", "resource_path", "fm", "frontmatter",
                     "domain", "release", "content_hash", "ims_doc_id",
                     "original_path", "doc_title", "line_count"):
            val = getattr(meta, key, None)
            if val is not None:
                result[key] = Bundler._unwrap_base(val)
        return result

    @staticmethod
    def _sort_key(doc: DocumentLike) -> tuple[int, str]:
        meta = Bundler._meta(doc)
        raw = meta.get("sort_order", DEFAULT_SORT_ORDER)
        try:
            sort_order = int(raw) if isinstance(raw, (str, int, float)) else DEFAULT_SORT_ORDER
        except (TypeError, ValueError):
            sort_order = DEFAULT_SORT_ORDER
        return sort_order, (doc.name or "")

    @staticmethod
    def _resource_path(doc: DocumentLike) -> str:
        meta = Bundler._meta(doc)
        raw = meta.get("resource_path", "")
        return raw if isinstance(raw, str) else ""

    @staticmethod
    def _xml_attr(value: object) -> str:
        return xml_escape(str(value), {'"': "&quot;", "'": "&apos;"})

    @staticmethod
    def _tags_attr(doc: DocumentLike) -> str:
        meta = Bundler._meta(doc)
        tags = meta.get("tags", []) or []
        if isinstance(tags, str):
            tags = [tags]
        if not isinstance(tags, list):
            return ""
        return ",".join(str(tag) for tag in tags)

    @staticmethod
    def _listing_tag_attr(doc: DocumentLike) -> str:
        meta = Bundler._meta(doc)
        raw_tags = meta.get("tags", []) or []
        if isinstance(raw_tags, str):
            tags = [raw_tags]
        elif isinstance(raw_tags, list):
            tags = [str(tag) for tag in raw_tags if str(tag).strip()]
        else:
            return ""
        return max(tags, key=len, default="")

    @staticmethod
    def _xml_tag_name(name: str) -> str:
        cleaned = "".join(ch if (ch.isalnum() or ch in {"_", "-", "."}) else "_" for ch in name.strip())
        if not cleaned:
            return "field"
        if cleaned[0].isdigit():
            return f"f_{cleaned}"
        return cleaned

    @staticmethod
    def _is_scalar(value: object) -> bool:
        return value is None or isinstance(value, (str, int, float, bool))

    @staticmethod
    def _scalar_to_text(value: object) -> str:
        if value is None:
            return ""
        if isinstance(value, bool):
            return "true" if value else "false"
        return str(value)

    @classmethod
    def _serialize_list_items(cls, values: Sequence[object]) -> str:
        parts: list[str] = []
        for item in values:
            if cls._is_scalar(item):
                parts.append(f"<item>{cls._xml_attr(cls._scalar_to_text(item))}</item>")
            elif isinstance(item, dict):
                parts.append(cls._serialize_object_element("item", item))
            elif isinstance(item, list):
                parts.append(f"<item>{cls._serialize_list_items(item)}</item>")
            else:
                parts.append(f"<item>{cls._xml_attr(str(item))}</item>")
        return "".join(parts)

    @classmethod
    def _serialize_object_element(cls, tag_name: str, obj: JsonObject) -> str:
        scalar_attrs: list[str] = []
        child_nodes: list[str] = []

        for key, value in obj.items():
            key_tag = cls._xml_tag_name(str(key))
            if cls._is_scalar(value):
                scalar_attrs.append(f'{key_tag}="{cls._xml_attr(cls._scalar_to_text(value))}"')
            elif isinstance(value, dict):
                child_nodes.append(cls._serialize_object_element(key_tag, value))
            elif isinstance(value, list):
                child_nodes.append(f"<{key_tag}>{cls._serialize_list_items(value)}</{key_tag}>")
            else:
                scalar_attrs.append(f'{key_tag}="{cls._xml_attr(str(value))}"')

        attrs_text = f" {' '.join(scalar_attrs)}" if scalar_attrs else ""
        if child_nodes:
            return f"<{tag_name}{attrs_text}>{''.join(child_nodes)}</{tag_name}>"
        return f"<{tag_name}{attrs_text}></{tag_name}>"

    @classmethod
    def _serialize_frontmatter_attr(cls, value: object) -> str:
        """Serialize frontmatter as a flat 'key: value; key: value' string for use in an XML attribute."""
        if value is None:
            return ""
        if isinstance(value, dict):
            parts: list[str] = []
            for k, v in value.items():
                formatted = cls._serialize_frontmatter_attr(v)
                if isinstance(v, dict):
                    formatted = f"({formatted})"
                parts.append(f"{k}: {formatted}")
            return "; ".join(parts)
        if isinstance(value, list):
            return ", ".join(cls._serialize_frontmatter_attr(i) for i in value)
        return cls._scalar_to_text(value)

    @staticmethod
    def _frontmatter_value(doc: DocumentLike) -> object:
        meta = Bundler._meta(doc)
        # Prefer "fm" (written since the key rename; "frontmatter" had a sticky
        # ES object mapping that rejected string writes). Fall back to the legacy
        # "frontmatter" key so docs written before the rename remain readable.
        fm = meta.get("fm") if meta.get("fm") is not None else meta.get("frontmatter")
        if isinstance(fm, str):
            try:
                return json.loads(fm)
            except Exception:
                return fm
        return fm

    def _format_listing_file(self, doc: DocumentLike, dataset_name: str) -> str:
        fm = self._frontmatter_value(doc)
        fm_attr = self._serialize_frontmatter_attr(fm)
        fm_part = f' frontmatter="{self._xml_attr(fm_attr)}"' if fm_attr else ""
        meta = self._meta(doc)
        lc = meta.get("line_count")
        lc_part = f' lines="{lc}"' if lc is not None else ""
        return (
            f'<rosetta:file id="{self._xml_attr(doc.id)}"'
            f' dataset="{self._xml_attr(dataset_name)}"'
            f' path="{self._xml_attr(self._resource_path(doc))}"'
            f' name="{self._xml_attr(doc.name or "")}"'
            f' tag="{self._xml_attr(self._listing_tag_attr(doc))}"'
            f'{lc_part}{fm_part} />'
        )

    def bundle(self, documents: list[DocumentLike], dataset_name: str) -> str:
        chunks: list[str] = []
        for doc in sorted(documents, key=self._sort_key):
            tags_attr = self._tags_attr(doc)
            path = self._resource_path(doc)
            body = self._documents.download_content(doc)
            chunks.append(
                XML_FILE_OPEN.format(
                    id=self._xml_attr(doc.id),
                    dataset=self._xml_attr(dataset_name),
                    path=self._xml_attr(path),
                    name=self._xml_attr(doc.name or ""),
                    tags=self._xml_attr(tags_attr),
                )
            )
            chunks.append(body)
            chunks.append(XML_FILE_CLOSE)
        return "\n".join(chunks)

    def format_as_listing(self, documents: list[DocumentLike], dataset_name: str) -> str:
        """Format documents as a flat listing without content (file entries only)."""
        lines: list[str] = []
        for doc in sorted(documents, key=self._sort_key):
            lines.append(self._format_listing_file(doc, dataset_name))
        return "\n".join(lines)

    def format_children_listing(
        self,
        folders: list[str],
        files: list[DocumentLike],
        dataset_name: str,
    ) -> str:
        """Format immediate children of a path prefix as folders + files."""
        lines: list[str] = []
        for folder_path in sorted(folders):
            lines.append(
                XML_FOLDER_LIST.format(
                    dataset=Bundler._xml_attr(dataset_name),
                    path=Bundler._xml_attr(folder_path),
                )
            )
        for doc in sorted(files, key=Bundler._sort_key):
            lines.append(self._format_listing_file(doc, dataset_name))
        return "\n".join(lines)
