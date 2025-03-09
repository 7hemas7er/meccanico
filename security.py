from database import Base, engine, SessionLocal, get_db, init_db
from sqlalchemy import String, create_engine, Column, DateTime
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status, FastAPI, Security
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from passlib.context import CryptContext
import secrets
import os
from datetime import datetime, timedelta

# Create a security instance for HTTP Basic auth
security = HTTPBasic()

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# New database model for admin credentials


class AdminCredentials(Base):
    __tablename__ = "admin_credentials"

    username = Column(String, primary_key=True, index=True)
    password_hash = Column(String, nullable=False)
    last_password_change = Column(DateTime, default=datetime.utcnow)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Define verify_admin function that can be imported by main.py


def verify_admin(credentials: HTTPBasicCredentials = Security(security)) -> str:
    db = SessionLocal()
    try:
        admin = db.query(AdminCredentials).filter(
            AdminCredentials.username == credentials.username
        ).first()

        if not admin or not verify_password(credentials.password, admin.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenziali non valide",
                headers={"WWW-Authenticate": "Basic"},
            )

        return credentials.username
    finally:
        db.close()

# Initialize admin credentials


def init_admin_credentials():
    db = SessionLocal()
    try:
        # Check if admin user exists
        admin = db.query(AdminCredentials).filter(
            AdminCredentials.username == "admin"
        ).first()

        if not admin:
            # Create default admin user with environment password or fallback
            default_password = os.getenv("ADMIN_PASSWORD", "password123")
            admin = AdminCredentials(
                username="admin",
                password_hash=get_password_hash(default_password)
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()

# Functions to register with FastAPI app


def register_security_routes(app: FastAPI):
    # API endpoint for changing password
    @app.put("/api/change-password")
    async def change_password(
        old_password: str,
        new_password: str,
        credentials: HTTPBasicCredentials = Security(security),
        db: Session = Depends(get_db)
    ):
        # Verify current credentials
        admin = db.query(AdminCredentials).filter(
            AdminCredentials.username == credentials.username
        ).first()

        if not admin or not verify_password(old_password, admin.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Password attuale non valida"
            )

        # Validate new password
        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La nuova password deve essere di almeno 8 caratteri"
            )

        # Update password
        admin.password_hash = get_password_hash(new_password)
        admin.last_password_change = datetime.utcnow()
        db.commit()

        return {"message": "Password aggiornata con successo"}
