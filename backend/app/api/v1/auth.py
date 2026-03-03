from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.user import UserCreate, UserLogin, UserOut, MeOut
from app.core.limiter import limiter

router = APIRouter()

# Cookie max_age must match token expiry exactly (both default to 1440 min / 86400 s)
_COOKIE_MAX_AGE = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
# Use secure=True only when running behind HTTPS (production)
_SECURE_COOKIE = settings.ENVIRONMENT == "production"


@router.post("/register", response_model=UserOut, status_code=201)
@limiter.limit("3/minute")
def register(request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        name=payload.name,
        password_hash=hash_password(payload.password),
        role="Job Seeker"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.user_id,
        "email": user.email,
        "name": user.name,
        "message": "User registered successfully"
    }


@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, payload: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    token = create_access_token({"user_id": user.user_id, "email": user.email})
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        secure=_SECURE_COOKIE,
        samesite="lax",
        max_age=_COOKIE_MAX_AGE,
        path="/"
    )
    return {"message": "Logged in successfully", "name": user.name, "email": user.email}


@router.post("/logout")
def logout(response: Response):
    # Expire the cookie immediately
    response.set_cookie(
        key="session",
        value="",
        httponly=True,
        secure=_SECURE_COOKIE,
        samesite="lax",
        max_age=0,
        path="/"
    )
    return {"message": "Logged out"}


@router.get("/me", response_model=MeOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.user_id,
        "name": current_user.name,
        "email": current_user.email
    }
