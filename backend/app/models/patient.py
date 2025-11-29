from datetime import datetime, date
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, DateTime, Date, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm import relationship as db_relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.document import Document
    from app.models.medical_report import MedicalReport


class Patient(Base):
    __tablename__ = "patients"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    allergies: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    chronic_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    emergency_contact: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    relation_to_user: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # self, spouse, child, parent, etc.
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, onupdate=datetime.utcnow, nullable=True)
    
    # Relationships
    user: Mapped["User"] = db_relationship("User", back_populates="patients")
    documents: Mapped[List["Document"]] = db_relationship("Document", back_populates="patient", cascade="all, delete-orphan")
    medical_reports: Mapped[List["MedicalReport"]] = db_relationship("MedicalReport", back_populates="patient", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Patient {self.name}>"
