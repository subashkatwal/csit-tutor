"""
Seed the semesters table with semesters 1-8.
Safe to re-run — skips any semester number that already exists.

Usage (inside the container, or on the host if DATABASE_URL points to the same DB):
    python seed_semesters.py
"""
from database import SessionLocal, Base, engine
from models import Semester

# Make sure tables exist (harmless if they already do — main.py does this too)
Base.metadata.create_all(bind=engine)

SEMESTERS = [
    {"number": 1, "name": "Semester 1"},
    {"number": 2, "name": "Semester 2"},
    {"number": 3, "name": "Semester 3"},
    {"number": 4, "name": "Semester 4"},
    {"number": 5, "name": "Semester 5"},
    {"number": 6, "name": "Semester 6"},
    {"number": 7, "name": "Semester 7"},
    {"number": 8, "name": "Semester 8"},
]


def seed():
    db = SessionLocal()
    try:
        created = 0
        for s in SEMESTERS:
            exists = db.query(Semester).filter(Semester.number == s["number"]).first()
            if exists:
                continue
            db.add(Semester(number=s["number"], name=s["name"]))
            created += 1
        db.commit()
        print(f"Seeded {created} new semester(s). {len(SEMESTERS) - created} already existed.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()