from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String,  unique=True, nullable=False, index=True)
    name          = Column(String,  nullable=False)
    display_name  = Column(String,  nullable=False)   # "김G**"
    university    = Column(String,  nullable=False)
    major         = Column(String,  nullable=False)
    age_group     = Column(String,  nullable=False, default="20대")
    password_hash = Column(String,  nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)

    debates  = relationship("Debate",  back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")


class Debate(Base):
    __tablename__ = "debates"

    id            = Column(Integer, primary_key=True, index=True)
    title         = Column(String,  nullable=False)
    body          = Column(Text,    nullable=False)
    category      = Column(String,  nullable=False)
    region        = Column(String,  nullable=False, default="서울")
    author_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    bill_id       = Column(String,  ForeignKey("bills.id"), nullable=True, index=True)
    upvotes       = Column(Integer, default=0)
    downvotes     = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    created_at    = Column(DateTime, default=datetime.utcnow)

    author   = relationship("User",    back_populates="debates")
    comments = relationship("Comment", back_populates="debate", cascade="all, delete-orphan")
    bill     = relationship("Bill")


class Comment(Base):
    __tablename__ = "comments"

    id         = Column(Integer, primary_key=True, index=True)
    debate_id  = Column(Integer, ForeignKey("debates.id"),  nullable=False)
    author_id  = Column(Integer, ForeignKey("users.id"),    nullable=False)
    parent_id  = Column(Integer, ForeignKey("comments.id"), nullable=True)
    body       = Column(Text,    nullable=False)
    upvotes    = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    debate  = relationship("Debate", back_populates="comments")
    author  = relationship("User",   back_populates="comments")


class Vote(Base):
    __tablename__ = "votes"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_type = Column(String,  nullable=False)   # "debate" | "comment"
    target_id   = Column(Integer, nullable=False)
    direction   = Column(String,  nullable=False)   # "up" | "down"
    created_at  = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "target_type", "target_id", name="uq_user_vote"),
    )


class Bill(Base):
    """국회 법안 (정책 정보)"""
    __tablename__ = "bills"

    id              = Column(String, primary_key=True)
    bill_no         = Column(String, nullable=False)
    title           = Column(String, nullable=False)
    category        = Column(String, nullable=False, index=True)
    proposer        = Column(String, nullable=False)
    propose_date    = Column(String, nullable=False)
    status          = Column(String, nullable=False)
    raw_text        = Column(Text,   nullable=False)

    # ── Detailed info (mock data for demo) ──────────────────────────────────
    description     = Column(Text,   nullable=True)   # 정책 배경/취지 (긴 본문)
    key_points      = Column(JSON,   nullable=True)   # list[str] 핵심 조항
    pros            = Column(JSON,   nullable=True)   # list[str] 찬성 논거
    cons            = Column(JSON,   nullable=True)   # list[str] 반대 논거
    expected_impact = Column(Text,   nullable=True)   # 예상 영향
    sponsor_party   = Column(String, nullable=True)   # 발의 정당
    related_url     = Column(String, nullable=True)   # 관련 자료 URL


class ElectionEvent(Base):
    """선거 일정 이벤트"""
    __tablename__ = "election_events"

    id          = Column(String, primary_key=True)
    name        = Column(String, nullable=False)
    date        = Column(String, nullable=False)   # ISO yyyy-mm-dd
    type        = Column(String, nullable=False)
    description = Column(String, nullable=False)
    region      = Column(String, nullable=False)
    color       = Column(String, nullable=False)


class NewsArticle(Base):
    """뉴스·정책 브리핑"""
    __tablename__ = "news"

    id         = Column(Integer, primary_key=True, index=True)
    title      = Column(String,  nullable=False)
    summary    = Column(Text,    nullable=False)
    source     = Column(String,  nullable=False)
    category   = Column(String,  nullable=False, index=True)
    url        = Column(String,  nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
