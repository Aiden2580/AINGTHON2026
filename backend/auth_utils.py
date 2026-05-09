import os
from datetime import datetime, timedelta

import bcrypt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from database import get_db
from models.orm import User

SECRET_KEY  = os.getenv("JWT_SECRET_KEY", "aingthon-dev-secret-change-in-production")
ALGORITHM   = "HS256"
EXPIRE_DAYS = 30

_security = HTTPBearer()


def hash_password(pw: str) -> str:
    # bcrypt has a 72-byte input limit; truncate explicitly so longer passwords don't error.
    pw_bytes = pw.encode("utf-8")[:72]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    plain_bytes = plain.encode("utf-8")[:72]
    try:
        return bcrypt.checkpw(plain_bytes, hashed.encode("utf-8"))
    except ValueError:
        return False


def create_token(user_id: int) -> str:
    exp = datetime.utcnow() + timedelta(days=EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def mask_name(name: str) -> str:
    """'김민준' → '김M**'  (deterministic, based on name chars)."""
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    suffix  = letters[sum(ord(c) for c in name[1:]) % 26] if len(name) > 1 else "A"
    return f"{name[0]}{suffix}**"


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="인증이 필요합니다")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다")
    return user
