"""Authentication middleware and dependencies."""

import jwt
from fastapi import HTTPException, Request
from jwt.exceptions import InvalidTokenError

from app.config import settings
from app.models.user import User


async def get_current_user(request: Request) -> User:
    """FastAPI dependency — extract and validate the current user."""
    token = request.cookies.get("session")
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    spotify_id = payload.get("spotify_id")
    if not spotify_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = await User.find_one(User.spotify_id == spotify_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user
