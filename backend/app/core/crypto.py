import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import get_settings


def _key() -> bytes:
    raw = get_settings().field_encryption_key
    if not raw:
        raise RuntimeError("FIELD_ENCRYPTION_KEY is required")
    key = base64.urlsafe_b64decode(raw.encode("utf-8"))
    if len(key) != 32:
        raise RuntimeError("FIELD_ENCRYPTION_KEY must decode to 32 bytes for AES-256-GCM")
    return key


def encrypt_text(value: str | None) -> str | None:
    if value in (None, ""):
        return value
    aesgcm = AESGCM(_key())
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, value.encode("utf-8"), None)
    return base64.urlsafe_b64encode(nonce + ciphertext).decode("utf-8")


def decrypt_text(value: str | None) -> str | None:
    if value in (None, ""):
        return value
    payload = base64.urlsafe_b64decode(value.encode("utf-8"))
    nonce = payload[:12]
    ciphertext = payload[12:]
    return AESGCM(_key()).decrypt(nonce, ciphertext, None).decode("utf-8")
