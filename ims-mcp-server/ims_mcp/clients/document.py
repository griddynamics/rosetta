"""Document operations adapter."""

from __future__ import annotations

import json
from typing import Any, cast

import logging
import threading
import time

import requests
from ragflow_sdk.modules.dataset import DataSet
from ragflow_sdk.modules.document import Document

from ims_mcp.typing_utils import DatasetLike, DocumentLike, JsonObject, as_json_object

_logger = logging.getLogger("ims_mcp.tracing")


class DocumentClient:
    @staticmethod
    def _is_ownership_lookup_error(message: str) -> bool:
        lowered = message.lower()
        return (
            "you don't own the document" in lowered
            or "you do not own the document" in lowered
            or "you don't own the dataset" in lowered
            or "you do not own the dataset" in lowered
        )

    def _find_docs_by_exact_name(
        self,
        dataset: DatasetLike,
        name: str,
        page_size: int = 200,
        max_pages: int = 50,
    ) -> list[DocumentLike]:
        """Find matching docs inside a dataset without using name filter.

        RAGFlow `list_documents(name=...)` may raise ownership-style errors for
        unknown names, so we scan paginated dataset documents and match locally.
        """
        # Fast path: keyword search is usually enough and avoids full dataset scan.
        # If keyword search fails with non-ownership-related errors, propagate.
        try:
            kdocs = dataset.list_documents(keywords=name, page=1, page_size=page_size)
            kexact = [doc for doc in kdocs if getattr(doc, "name", None) == name]
            if kexact:
                return kexact
            # When keyword result is shorter than page_size, no further keyword pages exist.
            if len(kdocs) < page_size:
                return []
        except Exception as exc:
            # Only tolerate the known ownership-style false negative for lookups.
            if not self._is_ownership_lookup_error(str(exc)):
                raise

        # Bounded fallback scan across dataset pages.
        total_docs = int(getattr(dataset, "document_count", 0) or 0)
        if total_docs > 0:
            max_pages = min(max_pages, (total_docs + page_size - 1) // page_size)

        matches: list[DocumentLike] = []
        for page in range(1, max_pages + 1):
            docs = dataset.list_documents(page=page, page_size=page_size)
            if not docs:
                break
            matches.extend(doc for doc in docs if getattr(doc, "name", None) == name)
            if len(docs) < page_size:
                break
        return matches

    def list_docs(
        self,
        dataset: DatasetLike,
        name: str | None = None,
        keywords: str | None = None,
        page: int = 1,
        page_size: int = 1000,
        doc_id: str | None = None,
        metadata_condition: str | None = None,
    ) -> list[DocumentLike]:
        if metadata_condition is not None:
            # SDK's list_documents() doesn't expose metadata_condition,
            # so use low-level GET with the JSON string as a query param.
            params: dict[str, object] = {
                "id": doc_id,
                "name": name,
                "keywords": keywords,
                "page": page,
                "page_size": page_size,
                "metadata_condition": metadata_condition,
            }
            raw_response = dataset.get(f"/datasets/{dataset.id}/documents", params=params)
            response_json = as_json_object(raw_response.json())
            if response_json.get("code") == 0:
                data = response_json.get("data")
                docs_value = data.get("docs", []) if isinstance(data, dict) else []
                docs = docs_value if isinstance(docs_value, list) else []
                return [cast(DocumentLike, Document(cast(Any, dataset).rag, d)) for d in docs if isinstance(d, dict)]
            raise Exception(str(response_json.get("message", "Unknown error")))
        return dataset.list_documents(
            id=doc_id,
            name=name,
            keywords=keywords,
            page=page,
            page_size=page_size,
        )

    def download_content(self, doc: DocumentLike) -> str:
        try:
            raw = doc.download()
            return raw.decode("utf-8")
        except Exception as exc:
            message = str(exc)
            if (
                "You do not own the dataset" in message
                or "You don't own the dataset" in message
            ):
                try:
                    fallback = self._download_via_v1_document_get(doc)
                    if fallback is not None:
                        return fallback
                except Exception as fallback_exc:
                    raise RuntimeError(
                        f"Failed to download content for document {doc.id}: {exc}; "
                        f"fallback /v1/document/get failed: {fallback_exc}"
                    ) from fallback_exc
            raise RuntimeError(f"Failed to download content for document {doc.id}: {exc}") from exc

    @staticmethod
    def _download_via_v1_document_get(doc: DocumentLike) -> str | None:
        """Fallback for environments where dataset-scoped download is denied.

        Uses the legacy REST endpoint: /v1/document/get/<doc_id>.
        """
        rag = getattr(doc, "rag", None)
        if rag is None:
            return None

        api_url = getattr(rag, "api_url", "")
        headers = getattr(rag, "authorization_header", None)
        if not api_url or not headers:
            return None

        if "/api/" in api_url:
            base_url = api_url.split("/api/", 1)[0]
        else:
            base_url = api_url.rstrip("/")

        url = f"{base_url}/v1/document/get/{doc.id}"

        from ims_mcp.tracing import current_trace_id, SLOW_CALL_THRESHOLD_SECONDS, _log_prefix
        trace_id = current_trace_id.get(None)
        prefix = _log_prefix("ragflow", trace_id)
        label = f"GET /v1/document/get/{doc.id}"
        _logger.info("%s %s — started", prefix, label)
        _start = time.monotonic()
        _slow_fired = threading.Event()

        def _slow() -> None:
            _slow_fired.set()
            _logger.error("%s %s — SLOW: still in-flight after %.1fs", prefix, label, time.monotonic() - _start)

        _timer = threading.Timer(SLOW_CALL_THRESHOLD_SECONDS, _slow)
        _timer.daemon = True
        _timer.start()
        try:
            res = requests.get(url=url, headers=headers, timeout=30)
            _elapsed = time.monotonic() - _start
            _level = logging.WARNING if _slow_fired.is_set() else logging.INFO
            _logger.log(_level, "%s %s — %s in %.3fs", prefix, label, res.status_code, _elapsed)
        except Exception as _exc:
            _elapsed = time.monotonic() - _start
            _logger.error("%s %s — failed after %.3fs: %s", prefix, label, _elapsed, _exc)
            raise
        finally:
            _timer.cancel()

        # Try to detect JSON error envelope.
        try:
            payload = res.json()
            if isinstance(payload, dict) and "code" in payload and payload.get("code") != 0:
                raise RuntimeError(payload.get("message", f"HTTP {res.status_code}"))
            # If this was a successful JSON payload, it's not raw document content.
            if isinstance(payload, dict):
                return None
        except json.JSONDecodeError:
            pass

        if res.status_code >= 400:
            return None

        try:
            return cast(str, res.content.decode("utf-8"))
        except UnicodeDecodeError:
            return cast(str, res.content.decode("utf-8", errors="ignore"))

    def upload_doc(self, dataset: DatasetLike, name: str, content: bytes) -> DocumentLike:
        docs = dataset.upload_documents([{"display_name": name, "blob": content}])
        if not docs:
            raise RuntimeError("Upload returned no documents")
        return docs[0]

    def upsert_doc(
        self,
        dataset: DatasetLike,
        name: str,
        content: bytes,
        meta_fields: JsonObject | None = None,
    ) -> DocumentLike:
        existing = self._find_docs_by_exact_name(dataset=dataset, name=name)
        if existing:
            dataset.delete_documents([doc.id for doc in existing])
        uploaded = self.upload_doc(dataset=dataset, name=name, content=content)
        if meta_fields:
            uploaded.update({"meta_fields": meta_fields})
        return uploaded

    def submit_background_parse(self, dataset: DatasetLike, document_ids: list[str]) -> None:
        """Submit parsing job(s) and return immediately without waiting."""
        if not document_ids:
            return
        dataset.async_parse_documents(document_ids)
