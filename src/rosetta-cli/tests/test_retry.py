from unittest.mock import patch

import pytest

from rosetta_cli.ims_utils import is_transient_ragflow, retry_call


def test_success_first_attempt():
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        return "ok"

    assert retry_call(fn, label="t") == "ok"
    assert calls["n"] == 1


def test_transient_then_succeed():
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        if calls["n"] == 1:
            raise Exception("Documents not found: ['x']")
        return "ok"

    with patch("rosetta_cli.ims_utils.time.sleep"):
        assert retry_call(fn, label="t") == "ok"
    assert calls["n"] == 2


def test_permanent_no_retry():
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        raise Exception("The type is not supported: None")

    with pytest.raises(Exception, match="The type is not supported"):
        retry_call(fn, label="t")
    assert calls["n"] == 1


def test_transient_exhausted():
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        raise Exception("The dataset doesn't own the document")

    with patch("rosetta_cli.ims_utils.time.sleep"):
        with pytest.raises(Exception, match="doesn't own"):
            retry_call(fn, attempts=3, label="t")
    assert calls["n"] == 3


def test_jitter_in_range():
    calls = {"n": 0}
    sleeps = []

    def fn():
        calls["n"] += 1
        if calls["n"] < 3:
            raise Exception("Failed to update metadata")
        return "ok"

    with patch("rosetta_cli.ims_utils.time.sleep", side_effect=sleeps.append):
        retry_call(fn, attempts=3, jitter_ms_range=(150, 250), label="t")

    assert len(sleeps) == 2
    for s in sleeps:
        assert 0.150 <= s <= 0.250


def test_classifier_accepts_transient():
    assert is_transient_ragflow(Exception("Documents not found: ['abc']")) is True
    assert is_transient_ragflow(Exception("Failed to update metadata")) is True
    assert is_transient_ragflow(Exception("The dataset doesn't own the document")) is True
    assert is_transient_ragflow(Exception("mapper_parsing_exception in field")) is True


def test_classifier_rejects_permanent():
    assert is_transient_ragflow(Exception("The type is not supported: None")) is False
    assert is_transient_ragflow(Exception("Invalid API key")) is False
    assert is_transient_ragflow(Exception("lacks permission")) is False


def test_permanent_wins_over_transient_in_same_message():
    msg = "Documents not found ... and also: The type is not supported: None"
    assert is_transient_ragflow(Exception(msg)) is False


def test_attempts_below_one_raises():
    with pytest.raises(ValueError, match="attempts must be >= 1"):
        retry_call(lambda: "x", attempts=0)
