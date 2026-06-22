"""Shared typing helpers for Rosetta MCP."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Protocol, TypeAlias, cast

JsonScalar: TypeAlias = str | int | float | bool | None
JsonObject: TypeAlias = dict[str, object]
JsonArray: TypeAlias = list[object]
JsonValue: TypeAlias = JsonScalar | JsonObject | JsonArray


class ResponseLike(Protocol):
    def json(self) -> object: ...


class DocumentLike(Protocol):
    id: str
    name: str | None
    meta_fields: object
    rag: object

    def download(self) -> bytes: ...

    def update(self, payload: Mapping[str, object]) -> object: ...


class DatasetLike(Protocol):
    id: str
    document_count: int | None
    rag: object

    def list_documents(
        self,
        *,
        id: str | None = None,
        name: str | None = None,
        keywords: str | None = None,
        page: int = 1,
        page_size: int = 1000,
    ) -> list[DocumentLike]: ...

    def get(self, path: str, params: Mapping[str, object]) -> ResponseLike: ...

    def upload_documents(self, documents: Sequence[Mapping[str, object]]) -> list[DocumentLike]: ...

    def delete_documents(self, ids: Sequence[str]) -> object: ...

    def async_parse_documents(self, document_ids: Sequence[str]) -> object: ...


def as_json_object(value: object) -> JsonObject:
    if isinstance(value, dict):
        return cast(JsonObject, value)
    return {}
