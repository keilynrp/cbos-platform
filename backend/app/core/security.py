from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except ValueError:
        return False


def create_access_token(data: dict[str, Any]) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    return jwt.encode(
        {**data, "exp": expire, "type": "access"},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def create_refresh_token(data: dict[str, Any]) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_expire_days
    )
    return jwt.encode(
        {**data, "exp": expire, "type": "refresh"},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def decode_token(token: str) -> dict[str, Any]:
    payload = jwt.decode(
        token,
        settings.secret_key,
        algorithms=[settings.algorithm],
        options={"verify_exp": False},
    )

    exp = payload.get("exp")
    if exp is None:
        raise JWTError("Missing exp claim")

    if isinstance(exp, datetime):
        expires_at = exp if exp.tzinfo else exp.replace(tzinfo=timezone.utc)
    else:
        try:
            expires_at = datetime.fromtimestamp(float(exp), tz=timezone.utc)
        except (TypeError, ValueError) as exc:
            raise JWTError("Invalid exp claim") from exc

    if expires_at <= datetime.now(timezone.utc):
        raise JWTError("Token expired")

    return payload


def verify_token(token: str, token_type: str = "access") -> dict[str, Any] | None:
    try:
        payload = decode_token(token)
        if payload.get("type") != token_type:
            return None
        return payload
    except JWTError:
        return None
