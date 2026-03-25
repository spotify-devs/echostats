"""Encryption utility tests."""

import pytest

from app.utils.crypto import decrypt_token, encrypt_token


TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"


def test_encrypt_decrypt_roundtrip():
    plaintext = "my_secret_token_12345"
    encrypted = encrypt_token(plaintext, TEST_KEY)
    decrypted = decrypt_token(encrypted, TEST_KEY)
    assert decrypted == plaintext


def test_encrypted_format():
    encrypted = encrypt_token("test", TEST_KEY)
    parts = encrypted.split(":")
    assert len(parts) == 2
    # IV should be 24 hex chars (12 bytes)
    assert len(parts[0]) == 24


def test_different_encryptions_differ():
    text = "same_token"
    enc1 = encrypt_token(text, TEST_KEY)
    enc2 = encrypt_token(text, TEST_KEY)
    assert enc1 != enc2  # Different IVs


def test_wrong_key_fails():
    encrypted = encrypt_token("test", TEST_KEY)
    wrong_key = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
    with pytest.raises(Exception):
        decrypt_token(encrypted, wrong_key)
