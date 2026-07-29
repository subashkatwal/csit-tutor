from database import get_db
from deps import get_current_user
from fastapi import APIRouter, Depends, HTTPException
from models import Semester, User
from schemas import SemesterOut, SemesterSelect
from sqlalchemy.orm import Session

router = APIRouter(prefix="/semesters", tags=["Semesters"])


db_dependency = Depends(get_db)
current_user_dependency = Depends(get_current_user)


@router.get("", response_model=list[SemesterOut])
def list_semesters(db: Session = db_dependency):
    return db.query(Semester).order_by(Semester.number).all()


@router.post("/select", response_model=SemesterOut)
def select_semester(
    payload: SemesterSelect,
    db: Session = db_dependency,
    current_user: User = current_user_dependency,
):
    semester = db.query(Semester).filter(Semester.id == payload.semester_id).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")

    current_user.current_semester_id = semester.id
    db.commit()
    db.refresh(current_user)
    return semester


@router.get("/me", response_model=SemesterOut)
def get_my_semester(
    db: Session = db_dependency,
    current_user: User = current_user_dependency,
):
    if not current_user.current_semester_id:
        raise HTTPException(status_code=404, detail="No semester selected yet")

    semester = db.query(Semester).filter(Semester.id == current_user.current_semester_id).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    return semester