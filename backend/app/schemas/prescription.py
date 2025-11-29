from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


class MedicineBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    when_to_take: Optional[str] = None
    duration_days: Optional[int] = None
    instructions: Optional[str] = None


class MedicineCreate(MedicineBase):
    pass


class MedicineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    when_to_take: Optional[str] = None
    duration_days: Optional[int] = None
    instructions: Optional[str] = None


class MedicineResponse(MedicineBase):
    id: int
    prescription_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class PrescriptionBase(BaseModel):
    prescription_date: Optional[date] = None
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    doctor_degree: Optional[str] = None
    hospital_name: Optional[str] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None


class PrescriptionCreate(PrescriptionBase):
    medicines: List[MedicineCreate] = []


class PrescriptionUpdate(BaseModel):
    prescription_date: Optional[date] = None
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    doctor_degree: Optional[str] = None
    hospital_name: Optional[str] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None


class PrescriptionResponse(PrescriptionBase):
    id: int
    document_id: int
    patient_id: int
    parsing_status: Optional[str] = None
    medicines: List[MedicineResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PrescriptionListResponse(BaseModel):
    prescriptions: List[PrescriptionResponse]
    total: int


class MedicineSearchResult(BaseModel):
    medicine: MedicineResponse
    prescription_id: int
    prescription_date: Optional[date] = None
    doctor_name: Optional[str] = None
    patient_name: str
    patient_id: int


class MedicineSearchResponse(BaseModel):
    results: List[MedicineSearchResult]
    total: int
