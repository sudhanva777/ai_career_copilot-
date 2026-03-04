from typing import Generator, Annotated, Optional
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.session import get_db  # canonical session factory
from app.models.user import User
from app.core.security import decode_token

SessionDep = Annotated[Session, Depends(get_db)]

def get_token_from_request(request: Request) -> Optional[str]:
    """Retrieve token from HttpOnly cookie or Authorization header."""
    token = request.cookies.get("session")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    return token

def get_current_user(request: Request, session: SessionDep) -> User:
    """Dependency to retrieve the current user, fully validated via JWT."""
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
        
    user = session.query(User).filter(User.user_id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user

def get_current_user_id(user: User = Depends(get_current_user)) -> int:
    """Convenience dependency for routes that only need the ID."""
    return user.user_id

CurrentUser = Annotated[User, Depends(get_current_user)]
