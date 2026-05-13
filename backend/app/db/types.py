from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

from app.core.crypto import decrypt_text, encrypt_text


class EncryptedText(TypeDecorator[str]):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return encrypt_text(value)

    def process_result_value(self, value, dialect):
        return decrypt_text(value)
