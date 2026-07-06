import secrets
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import AUTH_USERS

security = HTTPBearer(auto_error=False)
_tokens: dict[str, "AuthUser"] = {}


@dataclass(frozen=True)
class AuthUser:
    username: str
    role: str


def _configured_users() -> dict[str, tuple[str, str]]:
    users: dict[str, tuple[str, str]] = {}
    for item in AUTH_USERS.split(";"):
        if not item.strip():
            continue
        parts = item.split(":")
        if len(parts) != 3:
            continue
        username, password, role = parts
        users[username] = (password, role)
    return users


def login_user(username: str, password: str) -> tuple[str, AuthUser]:
    users = _configured_users()
    configured = users.get(username)
    if not configured or not secrets.compare_digest(configured[0], password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = secrets.token_urlsafe(32)
    user = AuthUser(username=username, role=configured[1])
    _tokens[token] = user
    return token, user


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> AuthUser:
    if not credentials:
        raise HTTPException(status_code=401, detail="请先登录")
    user = _tokens.get(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="登录已失效，请重新登录")
    return user


def require_admin(user: Annotated[AuthUser, Depends(get_current_user)]) -> AuthUser:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user
