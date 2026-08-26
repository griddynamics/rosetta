"""Policy-based authorization for dataset access."""

from __future__ import annotations

from rosetta_mcp.constants import POLICY_ALL, POLICY_NONE


class Authorizer:
    """Enforces read policies on datasets.

    Rules:
        - ``aia-*`` datasets: read always allowed.
        - Policy ``all``  → everybody.
        - Policy ``none`` → nobody.
        - Unsupported policies deny access.
    """

    def __init__(self, read_policy: str) -> None:
        self._read_policy = read_policy

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def can_read(self, dataset_name: str, user_email: str) -> bool:
        if _is_aia(dataset_name):
            return True
        return self._evaluate(self._read_policy)

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _evaluate(self, policy: str) -> bool:
        if policy == POLICY_ALL:
            return True
        if policy == POLICY_NONE:
            return False
        return False


def _is_aia(dataset_name: str) -> bool:
    return dataset_name.startswith("aia-")
