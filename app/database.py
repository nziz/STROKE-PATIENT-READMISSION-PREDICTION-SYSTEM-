import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Database path inside the project folder
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "maternal_health.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Connect to SQLite database 
# 'check_same_thread: False' allows FastAPI to safely write to SQLite using multiple background worker tasks.
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- POLISHING: Upgraded declarative_base import to match modern SQLAlchemy standards ---
Base = declarative_base()

def get_db():
    """
    Database Session Generator.
    Opens a fresh transaction connection for every API or USSD request,
    and guarantees the channel closes immediately after execution to prevent memory locks.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
