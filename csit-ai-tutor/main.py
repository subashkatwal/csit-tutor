from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth_routes import router as auth_router
from routes.semester_routes import router as semester_router
from routes.conversations import router as conversations_router

from database import Base, engine
import models  # noqa: F401  (import so SQLAlchemy registers the model before create_all)
from routes.auth_routes import router as auth_router

# Creates tables if they don't exist yet. Fine for dev; switch to Alembic migrations later.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Tutor API")

# Allow your frontend to call this API from the browser.
# Replace "*" with your actual frontend URL(s) before going to production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(semester_router)
app.include_router(conversations_router)


@app.get("/")
def root():
    return {"status": "ok", "message": "AI Tutor API is running"}