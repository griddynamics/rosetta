"""Shared typing helpers for IMS CLI tools."""

from __future__ import annotations

import argparse
from collections.abc import Sequence
from typing import Any, Protocol, TypeAlias

JsonValue: TypeAlias = Any
JsonDict: TypeAlias = dict[str, Any]
JsonList: TypeAlias = list[Any]
CommandArgs: TypeAlias = argparse.Namespace


class DocumentLike(Protocol):
    id: str
    name: str | None
    run: str | None
    size: int | None
    chunk_count: int | None
    token_count: int | None
    progress: float | None
    progress_msg: str | None
    meta_fields: object

    def update(self, payload: dict[str, object]) -> object: ...


class DatasetLike(Protocol):
    id: str
    name: str

    def list_documents(
        self,
        *,
        id: str | None = None,
        name: str | None = None,
        page: int = 1,
        page_size: int = 30,
        keywords: str | None = None,
    ) -> list[DocumentLike]: ...

    def delete_documents(self, ids: Sequence[str]) -> object: ...

    def upload_documents(self, documents: Sequence[dict[str, object]]) -> list[DocumentLike]: ...

    def async_parse_documents(self, document_ids: Sequence[str]) -> object: ...

    def get(self, path: str, params: dict[str, object]) -> object: ...
