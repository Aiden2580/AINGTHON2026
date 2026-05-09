from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session, joinedload

from auth_utils import get_current_user
from database import get_db
from models.orm import Comment, Debate, User, Vote
from models.schemas import (
    CommentCreate,
    CommentNode,
    DebateCreate,
    DebateResponse,
    ThreadDetailResponse,
)
from services.toxicity import is_toxic

router = APIRouter(prefix="/debates", tags=["토론"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _debate_dict(d: Debate) -> dict:
    return {
        "id":             d.id,
        "title":          d.title,
        "body":           d.body,
        "category":       d.category,
        "region":         d.region,
        "author_id":      d.author_id,
        "author_name":    f"{d.author.university} {d.author.display_name}",
        "author_display": d.author.display_name,
        "university":     d.author.university,
        "author_verified": True,
        "age_group":      d.author.age_group,
        "upvotes":        d.upvotes,
        "downvotes":      d.downvotes,
        "comment_count":  d.comment_count,
        "created_at":     d.created_at,
        "bill_id":        d.bill_id,
        "bill_title":     d.bill.title if d.bill else None,
    }


def _comment_node(c: Comment, replies: list[CommentNode] | None = None) -> CommentNode:
    return CommentNode(
        id=c.id,
        debate_id=c.debate_id,
        parent_id=c.parent_id,
        body=c.body,
        author_display=c.author.display_name,
        university=c.author.university,
        author_verified=True,
        upvotes=c.upvotes,
        created_at=c.created_at,
        replies=replies or [],
    )


def _build_tree(debate_id: int, db: Session) -> list[CommentNode]:
    all_c = (
        db.query(Comment)
        .options(joinedload(Comment.author))
        .filter(Comment.debate_id == debate_id)
        .all()
    )
    top = [c for c in all_c if c.parent_id is None]
    result = []
    for c in sorted(top, key=lambda x: x.upvotes, reverse=True):
        replies = [_comment_node(r) for r in all_c if r.parent_id == c.id]
        result.append(_comment_node(c, replies))
    return result


def _apply_vote(
    db: Session, user_id: int, target_type: str, target_id: int,
    direction: str, obj: Debate | Comment,
) -> None:
    existing = db.query(Vote).filter(
        Vote.user_id == user_id,
        Vote.target_type == target_type,
        Vote.target_id == target_id,
    ).first()

    if existing:
        if existing.direction == direction:
            # Toggle off
            if direction == "up":
                obj.upvotes   = max(0, obj.upvotes   - 1)
            else:
                obj.downvotes = max(0, obj.downvotes - 1)  # type: ignore[union-attr]
            db.delete(existing)
        else:
            # Flip direction
            if direction == "up":
                obj.upvotes   += 1
                obj.downvotes = max(0, obj.downvotes - 1)  # type: ignore[union-attr]
            else:
                obj.downvotes  = getattr(obj, "downvotes", 0) + 1
                obj.upvotes   = max(0, obj.upvotes - 1)
            existing.direction = direction
    else:
        if direction == "up":
            obj.upvotes += 1
        else:
            if hasattr(obj, "downvotes"):
                obj.downvotes += 1
        db.add(Vote(
            user_id=user_id, target_type=target_type,
            target_id=target_id, direction=direction,
        ))


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/trending", response_model=list[DebateResponse])
async def get_trending(
    limit: int = Query(3, ge=1, le=10),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Debate)
        .options(joinedload(Debate.author), joinedload(Debate.bill))
        .order_by((Debate.upvotes - Debate.downvotes).desc())
        .limit(limit)
        .all()
    )
    return [_debate_dict(d) for d in rows]


@router.get("/", response_model=list[DebateResponse])
async def list_debates(
    category:  Optional[str] = Query(None),
    region:    Optional[str] = Query(None),
    age_group: Optional[str] = Query(None),
    bill_id:   Optional[str] = Query(None, description="특정 법안에 태깅된 토론만 조회"),
    sort: str = Query("hot"),
    db: Session = Depends(get_db),
):
    query = db.query(Debate).options(joinedload(Debate.author), joinedload(Debate.bill))

    if category:
        query = query.filter(Debate.category == category)
    if region and region not in ("전체", ""):
        # 특정 지역 필터: 해당 지역 + '전체' (지역 무관) 토론도 함께 노출
        query = query.filter(Debate.region.in_([region, "전체"]))
    if age_group and age_group not in ("전체 연령", "전체", ""):
        query = query.filter(Debate.author.has(User.age_group == age_group))
    if bill_id:
        query = query.filter(Debate.bill_id == bill_id)

    if sort == "hot":
        query = query.order_by((Debate.upvotes - Debate.downvotes).desc())
    elif sort == "new":
        query = query.order_by(Debate.created_at.desc())
    elif sort == "top":
        query = query.order_by(Debate.upvotes.desc())

    return [_debate_dict(d) for d in query.all()]


@router.post("/", response_model=DebateResponse, status_code=201)
async def create_debate(
    debate: DebateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if await is_toxic(f"{debate.title} {debate.body}"):
        raise HTTPException(
            status_code=422,
            detail={
                "is_toxic": True,
                "message": (
                    "게시글에 건설적이지 않은 표현이 포함되어 있습니다. "
                    "인신공격이나 감정적 표현 없이 논리적으로 다시 작성해주세요."
                ),
            },
        )

    entry = Debate(
        title=debate.title,
        body=debate.body,
        category=debate.category,
        region=debate.region,
        author_id=current_user.id,
        bill_id=debate.bill_id,
    )
    db.add(entry)
    db.commit()

    entry = (
        db.query(Debate)
        .options(joinedload(Debate.author), joinedload(Debate.bill))
        .filter(Debate.id == entry.id)
        .first()
    )
    return _debate_dict(entry)


@router.get("/{debate_id}", response_model=ThreadDetailResponse)
async def get_debate(debate_id: int, db: Session = Depends(get_db)):
    debate = (
        db.query(Debate)
        .options(joinedload(Debate.author), joinedload(Debate.bill))
        .filter(Debate.id == debate_id)
        .first()
    )
    if not debate:
        raise HTTPException(status_code=404, detail="토론을 찾을 수 없습니다")
    comments = _build_tree(debate_id, db)
    return ThreadDetailResponse(**_debate_dict(debate), comments=comments)


@router.post("/{debate_id}/vote")
async def vote_debate(
    debate_id: int,
    direction: str = Query(..., pattern="^(up|down)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debate = db.get(Debate, debate_id)
    if not debate:
        raise HTTPException(status_code=404, detail="토론을 찾을 수 없습니다")
    _apply_vote(db, current_user.id, "debate", debate_id, direction, debate)
    db.commit()
    return {"upvotes": debate.upvotes, "downvotes": debate.downvotes}


@router.post("/{debate_id}/comments", response_model=CommentNode, status_code=201)
async def create_comment(
    debate_id: int,
    comment: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debate = db.get(Debate, debate_id)
    if not debate:
        raise HTTPException(status_code=404, detail="토론을 찾을 수 없습니다")

    if await is_toxic(comment.body):
        raise HTTPException(
            status_code=422,
            detail={
                "is_toxic": True,
                "message": (
                    "댓글에 건설적이지 않은 표현이 감지되었습니다. "
                    "논리적이고 건설적인 방식으로 의견을 표현해주세요."
                ),
            },
        )

    entry = Comment(
        debate_id=debate_id,
        author_id=current_user.id,
        parent_id=comment.parent_id,
        body=comment.body,
    )
    db.add(entry)
    debate.comment_count += 1
    db.commit()

    entry = (
        db.query(Comment)
        .options(joinedload(Comment.author))
        .filter(Comment.id == entry.id)
        .first()
    )
    return _comment_node(entry)


@router.post("/{debate_id}/comments/{comment_id}/vote")
async def vote_comment(
    debate_id: int,
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = db.get(Comment, comment_id)
    if not comment or comment.debate_id != debate_id:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다")
    _apply_vote(db, current_user.id, "comment", comment_id, "up", comment)
    db.commit()
    return {"upvotes": comment.upvotes}
