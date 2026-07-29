import json
import uuid
from typing import Any

from database import get_db, SessionLocal
from deps import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from models import Conversation, ConversationRoleEnum, Message, User
from schemas import (
    ConversationCreate,
    ConversationDetail,
    ConversationOut,
    ConversationUpdate,
    MessageCreate,
)
from sqlalchemy.orm import Session

try:
    from setup.chain import (
        build_context,
        detect_chain,
        exam_chain,
        practice_chain,
        solver_chain,
    )
except ImportError:
    from setup.chain import (
        build_context,
        detect_chain,
        exam_chain,
        practice_chain,
        solver_chain,
    )

router = APIRouter(prefix="/conversations", tags=["Conversations"])

# module-level singletons — avoids calling Depends() in every function signature
db_dependency = Depends(get_db)
current_user_dependency = Depends(get_current_user)
include_archived_dependency = Query(False)


def _get_owned_conversation(conversation_id: uuid.UUID, db: Session, current_user: User) -> Conversation:
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if convo.user_id != current_user.id:
        # 404 (not 403) so we don't leak existence of other users' conversations
        raise HTTPException(status_code=404, detail="Conversation not found")
    return convo


def _to_plain_dict(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if hasattr(value, "dict"):
        return value.dict()
    return dict(value)


def _event(event_type: str, data: Any) -> str:
    return f"data: {json.dumps({'type': event_type, 'data': data}, default=str)}\n\n"


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=list[ConversationOut])
def list_conversations(
    include_archived: bool = include_archived_dependency,
    db: Session = db_dependency,
    current_user: User = current_user_dependency,
):
    query = db.query(Conversation).filter(Conversation.user_id == current_user.id)
    if not include_archived:
        query = query.filter(Conversation.is_archived == False)  # noqa: E712
    return query.order_by(Conversation.updated_at.desc()).all()


@router.post("", response_model=ConversationOut)
def create_conversation(
    payload: ConversationCreate,
    db: Session = db_dependency,
    current_user: User = current_user_dependency,
):
    semester_id = payload.semester_id or current_user.current_semester_id
    convo = Conversation(
        user_id=current_user.id,
        semester_id=semester_id,
        title=payload.title or "New Conversation",
    )
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return convo


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: uuid.UUID,
    db: Session = db_dependency,
    current_user: User = current_user_dependency,
):
    return _get_owned_conversation(conversation_id, db, current_user)


@router.patch("/{conversation_id}", response_model=ConversationOut)
def rename_conversation(
    conversation_id: uuid.UUID,
    payload: ConversationUpdate,
    db: Session = db_dependency,
    current_user: User = current_user_dependency,
):
    convo = _get_owned_conversation(conversation_id, db, current_user)
    convo.title = payload.title
    db.commit()
    db.refresh(convo)
    return convo


@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: uuid.UUID,
    db: Session = db_dependency,
    current_user: User = current_user_dependency,
):
    convo = _get_owned_conversation(conversation_id, db, current_user)
    db.delete(convo)
    db.commit()
    return {"status": "deleted", "id": str(conversation_id)}


@router.post("/{conversation_id}/archive", response_model=ConversationOut)
def archive_conversation(
    conversation_id: uuid.UUID,
    db: Session = db_dependency,
    current_user: User = current_user_dependency,
):
    convo = _get_owned_conversation(conversation_id, db, current_user)
    convo.is_archived = True
    db.commit()
    db.refresh(convo)
    return convo


# ---------------------------------------------------------------------------
# Messages (streaming solve pipeline)
# ---------------------------------------------------------------------------

@router.post("/{conversation_id}/messages")
def send_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    db: Session = db_dependency,
    current_user: User = current_user_dependency,
) -> StreamingResponse:
    convo = _get_owned_conversation(conversation_id, db, current_user)

    problem = payload.content.strip()
    if not problem:
        raise HTTPException(status_code=400, detail="Message content is required.")

    semester_number = convo.semester.number if convo.semester else None
    semester_name = convo.semester.name if convo.semester else "Unspecified"
    convo_id = convo.id
    was_new_conversation = convo.title == "New Conversation"

    # save the user's message immediately
    user_msg = Message(conversation_id=convo_id, role=ConversationRoleEnum.user, content=problem)
    db.add(user_msg)
    db.commit()

    def stream():
        # The `db` session above closes as soon as this route function returns the
        # StreamingResponse — but this generator keeps running afterwards, during the
        # actual streaming. So any DB work in here needs its own fresh connection.
        # We use engine.connect() + raw SQL to completely avoid any ORM session
        # entanglement with objects from the now-closed `db` session.
        import datetime
        from sqlalchemy import text
        from database import engine

        stream_conn = engine.connect()
        try:
            yield _event("status", {"text": "Detecting subject and topic..."})
            detection = _to_plain_dict(detect_chain.invoke({
                "problem": problem,
                "semester_number": semester_number,
                "semester_name": semester_name,
            }))
            yield _event("detection", detection)

            yield _event("status", {"text": "Searching course notes..."})
            context = build_context(problem, semester_number)

            yield _event("status", {"text": "Writing solution..."})
            solution = solver_chain.invoke({
                "subject": detection.get("subject", "Unknown"),
                "topic": detection.get("topic", "Unknown"),
                "problem": problem,
                "context": context,
                "semester_number": semester_number,
                "semester_name": semester_name,
            })
            solution_text = getattr(solution, "content", str(solution))
            yield _event("solution", {"content": solution_text})

            yield _event("status", {"text": "Checking TU exam pattern..."})
            exam = _to_plain_dict(exam_chain.invoke({
                "subject": detection.get("subject", "Unknown"),
                "topic": detection.get("topic", "Unknown"),
            }))
            yield _event("exam", exam)

            yield _event("status", {"text": "Generating practice problems..."})
            practice = _to_plain_dict(practice_chain.invoke({
                "topic": detection.get("topic", "Unknown"),
                "problem": problem,
            }))
            yield _event("practice", practice)

            now = datetime.datetime.utcnow()

            # persist the assistant's reply using raw SQL to completely avoid
            # ORM session entanglement with the now-closed `db` session
            stream_conn.execute(
                text(
                    "INSERT INTO messages (id, conversation_id, role, content, meta, created_at) "
                    "VALUES (:id, :conversation_id, :role, :content, :meta, :created_at)"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "conversation_id": str(convo_id),
                    "role": "assistant",
                    "content": solution_text,
                    "meta": json.dumps({"detection": detection, "exam": exam, "practice": practice}),
                    "created_at": now,
                },
            )

            # auto-title a fresh conversation using raw SQL
            if was_new_conversation:
                stream_conn.execute(
                    text(
                        "UPDATE conversations SET title = :title WHERE id = :id"
                    ),
                    {"title": problem[:60], "id": str(convo_id)},
                )

            stream_conn.commit()
            yield _event("done", {"text": "Done"})
        except Exception as exc:  # noqa: BLE001
            stream_conn.rollback()
            yield _event("error", {"message": str(exc)})
        finally:
            stream_conn.close()

    return StreamingResponse(stream(), media_type="text/event-stream")