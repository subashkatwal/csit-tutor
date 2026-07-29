import json
import uuid
from typing import Any

from database import get_db
from deps import get_current_user
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from models import Conversation, ConversationRoleEnum, Message, User
from schemas import MessageCreate
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

router = APIRouter(prefix="/conversations", tags=["Chat"])

# module-level singletons — avoids calling Depends() in every function signature
db_dependency = Depends(get_db)
current_user_dependency = Depends(get_current_user)


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


@router.post("/{conversation_id}/messages")
def send_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    db: Session = db_dependency,
    current_user: User = current_user_dependency,
) -> StreamingResponse:
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not convo or convo.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    problem = payload.content.strip()
    if not problem:
        raise HTTPException(status_code=400, detail="Message content is required.")

    semester_number = convo.semester.number if convo.semester else None
    semester_name = convo.semester.name if convo.semester else "Unspecified"

    # save the user's message immediately
    user_msg = Message(conversation_id=convo.id, role=ConversationRoleEnum.user, content=problem)
    db.add(user_msg)
    db.commit()

    def stream():
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

            # persist the assistant's reply, with everything else tucked into meta
            assistant_msg = Message(
                conversation_id=convo.id,
                role=ConversationRoleEnum.assistant,
                content=solution_text,
                meta=json.dumps({"detection": detection, "exam": exam, "practice": practice}),
            )
            db.add(assistant_msg)

            # auto-title a fresh conversation from the first message
            if convo.title == "New Conversation":
                convo.title = problem[:60]

            db.commit()
            yield _event("done", {"text": "Done"})
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            yield _event("error", {"message": str(exc)})

    return StreamingResponse(stream(), media_type="text/event-stream")