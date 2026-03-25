"""AES-256-GCM encryption utilities for token storage."""

import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def encrypt_token(plaintext: str, key_hex: str) -> str:
    """Encrypt a token string using AES-256-GCM.

    Returns format: <iv_hex>:<ciphertext_hex>
    """
    key = bytes.fromhex(key_hex)
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return f"{nonce.hex()}:{ciphertext.hex()}"


def decrypt_token(encrypted: str, key_hex: str) -> str:
    """Decrypt a token string encrypted with AES-256-GCM."""
    key = bytes.fromhex(key_hex)
    nonce_hex, ciphertext_hex = encrypted.split(":", 1)
    nonce = bytes.fromhex(nonce_hex)
    ciphertext = bytes.fromhex(ciphertext_hex)
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode("utf-8")
