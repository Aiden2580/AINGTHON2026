from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from auth_utils import hash_password, verify_password, create_token, mask_name
from database import get_db
from models.orm import User
from models.schemas import UserCreate, LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["인증"])


@router.post("/register", response_model=LoginResponse, status_code=201)
async def register(data: UserCreate, db: Session = Depends(get_db)):
    """대학생 회원가입"""
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다")

    user = User(
        email=data.email,
        name=data.name,
        display_name=mask_name(data.name),
        university=data.university,
        major=data.major,
        age_group=data.age_group,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return LoginResponse(
        access_token=create_token(user.id),
        user_id=user.id,
        display_name=user.display_name,
        university=user.university,
    )


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    """이메일·비밀번호 로그인"""
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다")

    return LoginResponse(
        access_token=create_token(user.id),
        user_id=user.id,
        display_name=user.display_name,
        university=user.university,
    )
