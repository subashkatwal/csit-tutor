import os
import threading
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from database import get_db
from deps import get_current_user, require_admin
from models import Conversation, IngestionJob, Message, RoleEnum, Semester, Subject, User
from schemas import ConversationCreate, ConversationUpdate, ExamPatternRequest, MessageCreate, PracticeRequest, SelectSemesterRequest, SubjectCreate, SubjectUpdate, UserUpdate

router = APIRouter(tags=["Tutor"])
SEMESTERS = [(1,"csit-first-sem","First Semester"),(2,"csit-second-sem","Second Semester"),(3,"csit-third-sem","Third Semester"),(4,"csit-fourth-sem","Fourth Semester"),(5,"csit-fifth-sem","Fifth Semester"),(6,"csit-sixth-sem","Sixth Semester"),(7,"csit-seventh-sem","Seventh Semester"),(8,"csit-eighth-sem","Eighth Semester")]

def serialize_message(m): return {"id": str(m.id), "role": m.role, "content": m.content, "created_at": m.created_at}
def serialize_conversation(c, include_messages=False):
    data={"id":str(c.id),"title":c.title,"is_archived":c.is_archived,"created_at":c.created_at,"updated_at":c.updated_at}
    if include_messages: data["messages"]=[serialize_message(m) for m in c.messages]
    return data
def owned_conversation(db, conversation_id, user, allow_admin=False):
    c=db.get(Conversation, conversation_id)
    if not c or (c.user_id != user.id and not (allow_admin and user.role == RoleEnum.admin)): raise HTTPException(status_code=404, detail="Conversation not found")
    return c
def ai_answer(prompt): return f"Here is a focused way to approach it:\n\n{prompt}\n\nBreak the topic into its core definition, a worked example, and common exam pitfalls. Tell me the subject or paste your attempt and I can explain it step by step."

@router.get("/semesters")
def list_semesters(db: Session=Depends(get_db)): return db.query(Semester).order_by(Semester.id).all()
@router.post("/semesters/select")
def select_semester(data: SelectSemesterRequest, db: Session=Depends(get_db), user: User=Depends(get_current_user)):
    if not db.get(Semester, data.semester_id): raise HTTPException(status_code=400, detail="Invalid semester")
    user.selected_semester_id=data.semester_id; db.commit(); return {"message":"Semester updated","semester_id":data.semester_id}
@router.get("/semesters/me")
def my_semester(db: Session=Depends(get_db), user: User=Depends(get_current_user)):
    if not user.selected_semester_id: return {"semester":None}
    return {"semester":db.get(Semester,user.selected_semester_id)}

@router.get("/subjects/")
def subjects(semester_id:int=Query(...,ge=1,le=8), db:Session=Depends(get_db)): return db.query(Subject).filter(Subject.semester_id==semester_id).order_by(Subject.name).all()
@router.get("/subjects/{subject_id}")
def subject(subject_id:int, db:Session=Depends(get_db)):
    x=db.get(Subject,subject_id)
    if not x: raise HTTPException(404,"Subject not found")
    return x

@router.get("/conversations")
def conversations(include_archived:bool=False, db:Session=Depends(get_db), user:User=Depends(get_current_user)):
    q=db.query(Conversation).filter(Conversation.user_id==user.id)
    if not include_archived: q=q.filter(Conversation.is_archived.is_(False))
    return [serialize_conversation(c) for c in q.order_by(Conversation.updated_at.desc()).all()]
@router.post("/conversations",status_code=201)
def create_conversation(data:ConversationCreate,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    c=Conversation(user_id=user.id,title=data.title or "New conversation");db.add(c);db.commit();db.refresh(c);return serialize_conversation(c)
@router.get("/conversations/{conversation_id}")
def conversation(conversation_id:UUID,db:Session=Depends(get_db),user:User=Depends(get_current_user)): return serialize_conversation(owned_conversation(db,conversation_id,user),True)
@router.patch("/conversations/{conversation_id}")
def rename(conversation_id:UUID,data:ConversationUpdate,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    c=owned_conversation(db,conversation_id,user);c.title=data.title;db.commit();db.refresh(c);return serialize_conversation(c)
@router.delete("/conversations/{conversation_id}",status_code=204)
def delete_conversation(conversation_id:UUID,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    db.delete(owned_conversation(db,conversation_id,user));db.commit()
@router.post("/conversations/{conversation_id}/archive")
def archive_conversation(conversation_id:UUID,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    c=owned_conversation(db,conversation_id,user);c.is_archived=True;db.commit();return serialize_conversation(c)
@router.post("/conversations/{conversation_id}/messages",status_code=201)
def send_message(conversation_id:UUID,data:MessageCreate,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    c=owned_conversation(db,conversation_id,user)
    if c.is_archived: raise HTTPException(409,"Archived conversations cannot receive messages")
    u=Message(conversation_id=c.id,role="user",content=data.content); a=Message(conversation_id=c.id,role="assistant",content=ai_answer(data.content));db.add_all([u,a])
    if c.title=="New conversation": c.title=data.content[:80]
    c.updated_at=datetime.utcnow();db.commit();db.refresh(a);return {"message":serialize_message(u),"response":serialize_message(a)}
@router.get("/conversations/{conversation_id}/messages")
def messages(conversation_id:UUID,offset:int=Query(0,ge=0),limit:int=Query(50,ge=1,le=100),db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    c=owned_conversation(db,conversation_id,user);q=db.query(Message).filter(Message.conversation_id==c.id).order_by(Message.created_at);return {"items":[serialize_message(m) for m in q.offset(offset).limit(limit)],"offset":offset,"limit":limit,"total":q.count()}
@router.delete("/conversations/{conversation_id}/messages/{message_id}",status_code=204)
def delete_message(conversation_id:UUID,message_id:UUID,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    c=owned_conversation(db,conversation_id,user);m=db.get(Message,message_id)
    if not m or m.conversation_id!=c.id: raise HTTPException(404,"Message not found")
    db.delete(m);db.commit()

@router.get("/search/conversations")
def search_conversations(q:str=Query(min_length=1),db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    return [serialize_conversation(c) for c in db.query(Conversation).filter(Conversation.user_id==user.id,Conversation.title.ilike(f"%{q}%")).order_by(Conversation.updated_at.desc()).all()]
@router.get("/search/messages")
def search_messages(q:str=Query(min_length=1),conversation_id:UUID|None=None,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    query=db.query(Message).join(Conversation).filter(Conversation.user_id==user.id,Message.content.ilike(f"%{q}%"))
    if conversation_id: query=query.filter(Message.conversation_id==conversation_id)
    return [serialize_message(m)|{"conversation_id":str(m.conversation_id)} for m in query.order_by(Message.created_at.desc()).limit(100)]

@router.post("/practice/generate")
def practice(data:PracticeRequest,user:User=Depends(get_current_user)):
    return {"topic":data.topic,"problems":[{"number":i,"question":f"Explain and apply {data.topic}: practice problem {i}.","hint":f"Start with the key concept of {data.topic}."} for i in range(1,data.count+1)]}
@router.post("/exam-pattern/analyze")
def exam_pattern(data:ExamPatternRequest,user:User=Depends(get_current_user)):
    return {"topic":data.topic,"insight":"No historical exam corpus is connected yet. Use this as a study guide, not a statistical prediction.","recommended_focus":["definitions and concepts","worked numerical/example problems","compare related concepts"],"practice_mix":{"short_answer":40,"long_answer":35,"problem_solving":25}}

@router.get("/admin/users")
def admin_users(q:str|None=None,role:RoleEnum|None=None,active:bool|None=None,offset:int=0,limit:int=50,db:Session=Depends(get_db),admin:User=Depends(require_admin)):
    query=db.query(User)
    if q: query=query.filter(or_(User.full_name.ilike(f"%{q}%"),User.email.ilike(f"%{q}%")))
    if role: query=query.filter(User.role==role)
    if active is not None: query=query.filter(User.is_active==active)
    return {"items":query.order_by(User.created_at.desc()).offset(offset).limit(min(limit,100)).all(),"total":query.count()}
@router.get("/admin/users/{user_id}")
def admin_user(user_id:UUID,db:Session=Depends(get_db),admin:User=Depends(require_admin)):
    u=db.get(User,user_id)
    if not u: raise HTTPException(404,"User not found")
    return u
@router.patch("/admin/users/{user_id}")
def update_user(user_id:UUID,data:UserUpdate,db:Session=Depends(get_db),admin:User=Depends(require_admin)):
    u=db.get(User,user_id)
    if not u: raise HTTPException(404,"User not found")
    for k,v in data.model_dump(exclude_unset=True).items(): setattr(u,k,v)
    db.commit();db.refresh(u);return u
@router.delete("/admin/users/{user_id}",status_code=204)
def delete_user(user_id:UUID,db:Session=Depends(get_db),admin:User=Depends(require_admin)):
    u=db.get(User,user_id)
    if not u: raise HTTPException(404,"User not found")
    u.is_active=False;db.commit()
@router.post("/admin/users/{user_id}/deactivate")
def deactivate(user_id:UUID,db:Session=Depends(get_db),admin:User=Depends(require_admin)):
    u=db.get(User,user_id)
    if not u: raise HTTPException(404,"User not found")
    u.is_active=False;db.commit();return {"message":"User deactivated"}
@router.post("/admin/users/{user_id}/activate")
def activate(user_id:UUID,db:Session=Depends(get_db),admin:User=Depends(require_admin)):
    u=db.get(User,user_id)
    if not u: raise HTTPException(404,"User not found")
    u.is_active=True;db.commit();return {"message":"User activated"}
@router.get("/admin/conversations")
def admin_conversations(offset:int=0,limit:int=50,db:Session=Depends(get_db),admin:User=Depends(require_admin)):
    q=db.query(Conversation).order_by(Conversation.updated_at.desc());return {"items":[serialize_conversation(c) for c in q.offset(offset).limit(min(limit,100))],"total":q.count()}
@router.get("/admin/conversations/{conversation_id}")
def admin_conversation(conversation_id:UUID,db:Session=Depends(get_db),admin:User=Depends(require_admin)): return serialize_conversation(owned_conversation(db,conversation_id,admin,True),True)
@router.delete("/admin/conversations/{conversation_id}",status_code=204)
def force_delete_conversation(conversation_id:UUID,db:Session=Depends(get_db),admin:User=Depends(require_admin)): db.delete(owned_conversation(db,conversation_id,admin,True));db.commit()
@router.post("/admin/subjects",status_code=201)
def create_subject(data:SubjectCreate,db:Session=Depends(get_db),admin:User=Depends(require_admin)):
    s=Subject(**data.model_dump());db.add(s);db.commit();db.refresh(s);return s
@router.patch("/admin/subjects/{subject_id}")
def update_subject(subject_id:int,data:SubjectUpdate,db:Session=Depends(get_db),admin:User=Depends(require_admin)):
    s=db.get(Subject,subject_id)
    if not s: raise HTTPException(404,"Subject not found")
    for k,v in data.model_dump(exclude_unset=True).items():setattr(s,k,v)
    db.commit();db.refresh(s);return s
@router.delete("/admin/subjects/{subject_id}",status_code=204)
def delete_subject(subject_id:int,db:Session=Depends(get_db),admin:User=Depends(require_admin)):
    s=db.get(Subject,subject_id)
    if not s: raise HTTPException(404,"Subject not found")
    db.delete(s);db.commit()
def run_ingestion(job_id,db_url):
    from database import SessionLocal
    db=SessionLocal();job=db.get(IngestionJob,job_id);job.status="running";db.commit()
    try:
        from tutor.ingest import main as ingest_main; ingest_main();job.status="completed";job.detail="Ingestion completed"
    except Exception as e: job.status="failed";job.detail=str(e)
    job.completed_at=datetime.utcnow();db.commit();db.close()
@router.post("/admin/ingest",status_code=202)
def ingest(semester_id:int=Query(...,ge=1,le=8),db:Session=Depends(get_db),admin:User=Depends(require_admin)):
    job=IngestionJob(semester_id=semester_id);db.add(job);db.commit();db.refresh(job);threading.Thread(target=run_ingestion,args=(job.id,os.getenv("DATABASE_URL")),daemon=True).start();return {"job_id":str(job.id),"status":job.status}
@router.get("/admin/ingest/status")
def ingest_status(db:Session=Depends(get_db),admin:User=Depends(require_admin)):
    return db.query(IngestionJob).order_by(IngestionJob.created_at.desc()).all()
@router.get("/admin/analytics/overview")
def overview(db:Session=Depends(get_db),admin:User=Depends(require_admin)):
    today=datetime.utcnow().date();return {"total_users":db.query(User).count(),"total_conversations":db.query(Conversation).count(),"total_messages":db.query(Message).count(),"active_today":db.query(User).join(Conversation).filter(func.date(Conversation.updated_at)==today).distinct().count()}
@router.get("/admin/analytics/usage")
def usage(semester_id:int|None=None,db:Session=Depends(get_db),admin:User=Depends(require_admin)):
    q=db.query(User.selected_semester_id.label("semester_id"),func.count(User.id).label("users"),func.count(Conversation.id).label("conversations")).outerjoin(Conversation,Conversation.user_id==User.id).group_by(User.selected_semester_id)
    if semester_id: q=q.filter(User.selected_semester_id==semester_id)
    return [dict(r._mapping) for r in q.all()]
@router.get("/admin/analytics/top-queries")
def top_queries(limit:int=10,db:Session=Depends(get_db),admin:User=Depends(require_admin)):
    rows=db.query(Message.content,func.count(Message.id).label("count")).filter(Message.role=="user").group_by(Message.content).order_by(func.count(Message.id).desc()).limit(min(limit,50)).all();return [{"query":r.content,"count":r.count} for r in rows]
