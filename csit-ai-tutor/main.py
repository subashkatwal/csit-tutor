from sqlalchemy import inspect, text
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine, SessionLocal
import models
from models import Semester
from routes.auth_routes import router as auth_router
from routes.api_routes import router as api_router, SEMESTERS

def initialise_database():
    Base.metadata.create_all(bind=engine)
    # Lightweight development migration for databases created by the original project.
    columns={c["name"] for c in inspect(engine).get_columns("users")}
    additions={"selected_semester_id":"INTEGER","is_active":"BOOLEAN DEFAULT 1","created_at":"DATETIME"}
    with engine.begin() as connection:
        for name, definition in additions.items():
            if name not in columns: connection.execute(text(f"ALTER TABLE users ADD COLUMN {name} {definition}"))
        connection.execute(text("UPDATE users SET is_active = 1 WHERE is_active IS NULL"))
        connection.execute(text("UPDATE users SET role = 'student' WHERE role IS NULL"))
    db=SessionLocal()
    try:
        for sid,name,label in SEMESTERS:
            if not db.get(Semester,sid): db.add(Semester(id=sid,name=name,display_name=label))
        db.commit()
    finally: db.close()

initialise_database()
app=FastAPI(title="AI Tutor API")
app.add_middleware(CORSMiddleware,allow_origins=["http://localhost:5173"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
app.include_router(auth_router);app.include_router(api_router)
@app.get("/")
def root(): return {"status":"ok","message":"AI Tutor API is running"}
