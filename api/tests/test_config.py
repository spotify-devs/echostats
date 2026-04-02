"""Configuration validation tests."""

import pytest

from app.config import Settings

VALID_KWARGS = {
    "spotify_client_id": "test",
    "spotify_client_secret": "test",
    "jwt_secret": "testtesttesttest1234",
    "encryption_key": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
}


def test_valid_config_passes():
    s = Settings(**VALID_KWARGS)
    assert s.spotify_client_id == "test"
    assert s.encryption_key == VALID_KWARGS["encryption_key"]


def test_encryption_key_wrong_length_raises():
    with pytest.raises(ValueError, match="exactly 64 hex"):
        Settings(**{**VALID_KWARGS, "encryption_key": "abcd"})


def test_encryption_key_non_hex_raises():
    non_hex = "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"
    with pytest.raises(ValueError, match="valid hexadecimal"):
        Settings(**{**VALID_KWARGS, "encryption_key": non_hex})


def test_jwt_secret_too_short_raises():
    with pytest.raises(ValueError, match="at least 16"):
        Settings(**{**VALID_KWARGS, "jwt_secret": "short"})
