from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm import relationship as db_relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.patient import Patient
    from app.models.prescription import Prescription
    from app.models.medical_report import MedicalReport


class Document(Base):
    __tablename__ = "documents"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)  # Original uploaded file name
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # User-friendly display name (can be AI-generated)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # pdf, image
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    document_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # prescription, lab_report, medical_record, imaging
    upload_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationships
    patient: Mapped["Patient"] = db_relationship("Patient", back_populates="documents")
    prescription: Mapped[Optional["Prescription"]] = db_relationship(
        "Prescription", 
        back_populates="document", 
        uselist=False,
        cascade="all, delete-orphan"
    )
    medical_report: Mapped[Optional["MedicalReport"]] = db_relationship(
        "MedicalReport",
        back_populates="document",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<Document {self.file_name}>"
