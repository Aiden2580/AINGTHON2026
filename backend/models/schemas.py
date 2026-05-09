from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    name: str
    university: str
    major: str


class UserCreate(UserBase):
    password: str
    age_group: str = "20대"


class UserUpdate(BaseModel):
    university: Optional[str] = None
    major:      Optional[str] = None
    age_group:  Optional[str] = None


class UserResponse(UserBase):
    id: int
    display_name: str
    age_group: str
    created_at: datetime
    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    display_name: str
    university: str


class Token(BaseModel):
    access_token: str
    token_type: str


# ── Debates ───────────────────────────────────────────────────────────────────

class DebateBase(BaseModel):
    title: str
    body: str
    category: str


class DebateCreate(DebateBase):
    region: str = "서울"
    bill_id: Optional[str] = None


class DebateResponse(DebateBase):
    id: int
    author_id: int
    author_name: str
    author_display: str
    university: str
    author_verified: bool
    region: str
    age_group: str
    upvotes: int
    downvotes: int
    comment_count: int
    created_at: datetime
    bill_id: Optional[str] = None
    bill_title: Optional[str] = None
    model_config = {"from_attributes": True}


# ── Nested comments ───────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    body: str
    parent_id: Optional[int] = None


class CommentNode(BaseModel):
    id: int
    debate_id: int
    parent_id: Optional[int]
    body: str
    author_display: str
    university: str
    author_verified: bool
    upvotes: int
    created_at: datetime
    replies: list[CommentNode] = []

    model_config = {"from_attributes": True}


CommentNode.model_rebuild()


class ThreadDetailResponse(DebateResponse):
    comments: list[CommentNode]


# ── News ──────────────────────────────────────────────────────────────────────

class NewsBase(BaseModel):
    title: str
    summary: str
    source: str
    category: str
    url: str


class NewsResponse(NewsBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Policies / Bills ──────────────────────────────────────────────────────────

class BillResponse(BaseModel):
    id: str
    bill_no: str
    title: str
    category: str
    proposer: str
    propose_date: str
    status: str
    raw_text: str
    description: Optional[str] = None
    key_points: list[str] = []
    pros: list[str] = []
    cons: list[str] = []
    expected_impact: Optional[str] = None
    sponsor_party: Optional[str] = None
    related_url: Optional[str] = None
    model_config = {"from_attributes": True}

    # NULL JSON columns from the DB (e.g. for bills fetched from the gov API
    # that have no curated detail yet) should serialize as empty lists, not error.
    @field_validator("key_points", "pros", "cons", mode="before")
    @classmethod
    def _none_to_empty_list(cls, v):
        return [] if v is None else v


class BillSummaryResponse(BaseModel):
    bill_id: str
    title: str
    bullets: list[str]


# ── Elections ─────────────────────────────────────────────────────────────────

class ElectionScheduleResponse(BaseModel):
    id: str
    name: str
    date: str
    type: str
    days_left: int
    description: str
    region: str
    color: str


class ElectionInfo(BaseModel):
    name: str
    date: str
    days_left: int
    description: str
