from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.prescription import PrescriptionResponse


class DocumentBase(BaseModel):
    document_type: Optional[str] = None  # prescription, lab_report, scan
    notes: Optional[str] = None


class DocumentUpload(DocumentBase):
    patient_id: int
    display_name: Optional[str] = None  # User-provided display name
    generate_display_name: bool = False  # Whether to generate display name with AI


class DocumentUpdate(BaseModel):
    document_type: Optional[str] = None
    display_name: Optional[str] = None
    notes: Optional[str] = None


class DocumentResponse(DocumentBase):
    id: int
    patient_id: int
    user_id: int
    file_name: str
    display_name: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    upload_date: datetime
    prescription: Optional[PrescriptionResponse] = None
    
    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int


class ParsedDocumentData(BaseModel):
    prescription_date: Optional[str] = None
    doctor: Optional[dict] = None
    hospital_name: Optional[str] = None
    diagnosis: Optional[str] = None
    medicines: List[dict] = []
    additional_notes: Optional[str] = None
    suggested_file_name: Optional[str] = None  # AI-generated file name suggestion
