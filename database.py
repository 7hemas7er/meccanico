# database.py
import os
from typing import List
from sqlalchemy import String, create_engine, ForeignKey
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
    sessionmaker
)
from datetime import datetime

# Get database path from environment or use default
DB_PATH = os.getenv('DB_PATH', '/home/data/service_records.db')
DB_DIR = os.path.dirname(DB_PATH)

# Create directory if it doesn't exist
if not os.path.exists(DB_DIR):
    os.makedirs(DB_DIR)

# Create SQLite engine
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={
                       "check_same_thread": False})

# Create base class for SQLAlchemy models


class Base(DeclarativeBase):
    pass


# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Database Models


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[str] = mapped_column(primary_key=True)
    license_plate: Mapped[str] = mapped_column(String, unique=True, index=True)
    last_update: Mapped[datetime] = mapped_column(
        default=datetime.now, onupdate=datetime.now)
    activities: Mapped[List["Activity"]] = relationship(
        back_populates="vehicle",
        cascade="all, delete-orphan"
    )


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    vehicle_id: Mapped[str] = mapped_column(ForeignKey("vehicles.id"))
    activity: Mapped[str] = mapped_column(String)
    kilometers: Mapped[int]
    date: Mapped[datetime]

    vehicle: Mapped["Vehicle"] = relationship(back_populates="activities")


class MaintenanceType(Base):
    __tablename__ = "maintenance_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)

# Create database tables


def init_db():
    Base.metadata.create_all(bind=engine)

# Dependency to get database session


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
