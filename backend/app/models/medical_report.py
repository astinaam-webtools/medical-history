from datetime import datetime, date
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, Date, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm import relationship as db_relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.patient import Patient


class MedicalReport(Base):
    """Medical reports like lab tests, X-rays, MRIs, blood tests, etc."""
    __tablename__ = "medical_reports"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.id"), nullable=False)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id"), nullable=False)
    
    # Report metadata
    report_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)  # blood_test, xray, mri, ct_scan, ultrasound, ecg, etc.
    report_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    report_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Lab/Facility info
    lab_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    lab_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    technician_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Doctor who requested the test
    referring_doctor: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Parsed content - stored as searchable plain text
    parsed_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Full text content for searching
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # AI-generated summary
    
    # Structured findings (for reports that have them)
    findings: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Key findings
    conclusion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Doctor's conclusion/impression
    recommendations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # For lab tests with numeric values - stored as JSON for flexibility
    test_results: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # Example: {"hemoglobin": {"value": 14.5, "unit": "g/dL", "range": "13.5-17.5", "status": "normal"}}
    
    # Raw AI output
    raw_parsed_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    parsing_status: Mapped[Optional[str]] = mapped_column(String(50), default="pending")  # pending, success, partial, failed
    
    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, onupdate=datetime.utcnow, nullable=True)
    
    # Relationships
    document: Mapped["Document"] = db_relationship("Document", back_populates="medical_report")
    patient: Mapped["Patient"] = db_relationship("Patient", back_populates="medical_reports")
    
    def __repr__(self):
        return f"<MedicalReport {self.report_type}: {self.report_title}>"
