from fastapi import Header, HTTPException, status

from app.core.config import get_settings


def _bearer_value(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token.strip()


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    settings = get_settings()
    if not x_admin_token or x_admin_token != settings.admin_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="admin token is required",
        )


def is_member(
    authorization: str | None = Header(default=None),
    x_member_token: str | None = Header(default=None),
) -> bool:
    settings = get_settings()
    token = _bearer_value(authorization) or x_member_token
    return token == settings.demo_member_token

