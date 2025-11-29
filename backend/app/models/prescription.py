from datetime import datetime, date
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, DateTime, Date, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm import relationship as db_relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.medicine import Medicine


class Prescription(Base):
    __tablename__ = "prescriptions"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.id"), nullable=False)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id"), nullable=False)
    prescription_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    doctor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    doctor_title: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    doctor_specialty: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    doctor_degree: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    hospital_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    hospital_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    diagnosis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_parsed_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    parsing_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # success, partial, failed
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, onupdate=datetime.utcnow, nullable=True)
    
    # Relationships
    document: Mapped["Document"] = db_relationship("Document", back_populates="prescription")
    medicines: Mapped[List["Medicine"]] = db_relationship(
        "Medicine", 
        back_populates="prescription", 
        cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<Prescription {self.id} - {self.doctor_name}>"
