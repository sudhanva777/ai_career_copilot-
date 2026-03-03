from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.user import UserCreate, UserLogin, UserOut, MeOut
from app.core.limiter import limiter

router = APIRouter()

@router.post("/register", response_model=UserOut, status_code=201)
@limiter.limit("5/minute")
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
    
    # Return dictionary to guarantee Pydantic schema validation executes cleanly
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
        secure=False, # Set True if HTTPS in prod
        samesite="lax",
        max_age=86400,
        path="/"
    )
    return {"message": "Logged in successfully", "name": user.name, "email": user.email}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="session", path="/")
    return {"message": "Logged out"}

@router.get("/me", response_model=MeOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.user_id,
        "name": current_user.name, 
        "email": current_user.email
    }
