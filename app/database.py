import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "No se encontró la variable de entorno DATABASE_URL. "
        "Revisa tu archivo .env (ver .env.example)."
    )

# Railway entrega la URL con prefijo postgres://, SQLAlchemy 2.x requiere postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    Dependencia de FastAPI: abre una sesión de base de datos por request
    y la cierra automáticamente al terminar, incluso si hay un error.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()