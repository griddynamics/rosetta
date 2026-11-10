"""Read authorization for dataset access."""

from __future__ import annotations


class Authorizer:
    """Decides whether a dataset may be read.

    Every tool reads the instruction dataset (``aia-{version}``), which is
    always readable. Any other dataset is denied: no tool addresses one, and
    the former ``ROSETTA_READ_POLICY`` setting that governed them was removed.
    """

    def can_read(self, dataset_name: str, user_email: str) -> bool:
        return _is_aia(dataset_name)


def _is_aia(dataset_name: str) -> bool:
    return dataset_name.startswith("aia-")
