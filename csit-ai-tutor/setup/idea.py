import json
from pathlib import Path
from datetime import date
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

try:
    from .chain import detect_chain, exam_chain, practice_chain, solver_chain
except ImportError:
   from chain import detect_chain, exam_chain, practice_chain, solver_chain


BASE_DIR = Path(__file__).resolve().parent
DAILY_MESSAGE_LIMIT = 5
usage_by_user: Dict[str, Dict[str, Any]] = {}

app = FastAPI(title="CSIT 4th Sem Study Solver")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SolveRequest(BaseModel):
    problem: str


def _client_key(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_daily_limit(user_key: str) -> None:
    today = date.today().isoformat()
    usage = usage_by_user.get(user_key)

    if not usage or usage.get("date") != today:
        usage_by_user[user_key] = {"date": today, "count": 0}
        usage = usage_by_user[user_key]

    if usage["count"] >= DAILY_MESSAGE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Daily limit reached. You can ask {DAILY_MESSAGE_LIMIT} questions per day.",
        )

    usage["count"] += 1


def _to_plain_dict(value: Any) -> Dict[str, Any]:
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


@app.get("/")
def index() -> FileResponse:
    return FileResponse(BASE_DIR / "index.html")


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/solve")
def solve(payload: SolveRequest, request: Request) -> StreamingResponse:
    problem = payload.problem.strip()
    if not problem:
        raise HTTPException(status_code=400, detail="Problem is required.")
    _check_daily_limit(_client_key(request))

    def stream():
        try:
            yield _event("status", {"text": "Detecting subject and topic..."})
            detection = _to_plain_dict(detect_chain.invoke({"problem": problem}))
            yield _event("detection", detection)

            yield _event("status", {"text": "Writing solution..."})
            solution = solver_chain.invoke(
                {
                    "subject": detection.get("subject", "Unknown"),
                    "topic": detection.get("topic", "Unknown"),
                    "problem": problem,
                }
            )
            yield _event("solution", {"content": getattr(solution, "content", str(solution))})

            yield _event("status", {"text": "Checking TU exam pattern..."})
            exam = _to_plain_dict(
                exam_chain.invoke(
                    {
                        "subject": detection.get("subject", "Unknown"),
                        "topic": detection.get("topic", "Unknown"),
                    }
                )
            )
            yield _event("exam", exam)

            yield _event("status", {"text": "Generating practice problems..."})
            practice = _to_plain_dict(
                practice_chain.invoke(
                    {
                        "topic": detection.get("topic", "Unknown"),
                        "problem": problem,
                    }
                )
            )
            yield _event("practice", practice)
            yield _event("done", {"text": "Done"})
        except Exception as exc:
            yield _event("error", {"message": str(exc)})

    return StreamingResponse(stream(), media_type="text/event-stream")


def run_cli() -> None:
    print("CSIT 4th Sem Question Solver Agent")
    print(
        "Subjects include: DBMS | Theory of Computation and Artificial Intelligence | "
        "Operating System | Computer Network"
    )
    problem = input("Enter or paste your problem here: ").strip()
    if not problem:
        print("No problem entered.")
        return

    detection = _to_plain_dict(detect_chain.invoke({"problem": problem}))
    print(f"Subject: {detection.get('subject', 'Unknown')}")
    print(f"Topic: {detection.get('topic', 'Unknown')}")
    print(f"Type: {detection.get('problem_type', 'Unknown')}")
    print(f"Difficulty: {detection.get('difficulty_level', 'Unknown')}")

    print("\nSTEP-BY-STEP SOLUTION")
    solution = solver_chain.invoke(
        {
            "subject": detection.get("subject", "Unknown"),
            "topic": detection.get("topic", "Unknown"),
            "problem": problem,
        }
    )
    print(getattr(solution, "content", str(solution)))

    print("\nEXAM PATTERN ANALYSIS")
    exam = _to_plain_dict(
        exam_chain.invoke(
            {
                "topic": detection.get("topic", "Unknown"),
                "subject": detection.get("subject", "Unknown"),
            }
        )
    )
    print(f"Commonly Asked: {'Yes' if exam.get('commonly_appears') else 'No'}")
    print(f"Years Appeared: {', '.join(map(str, exam.get('likely_years', ['Unknown'])))}")
    print(f"Marks Carried: {exam.get('marks', 'Unknown')} marks")
    print(f"Exam Tip: {exam.get('exam_tip', 'No tip available')}")

    print("\nPRACTICE PROBLEMS FOR YOU")
    practice = _to_plain_dict(practice_chain.invoke({"topic": detection.get("topic", "Unknown"), "problem": problem}))
    print(f"\n1. {practice.get('problem_one', 'N/A')}")
    print(f"Answer: {practice.get('answer_one', 'N/A')}")
    print(f"\n2. {practice.get('problem_two', 'N/A')}")
    print(f"Answer: {practice.get('answer_two', 'N/A')}")


if __name__ == "__main__":
    run_cli()
