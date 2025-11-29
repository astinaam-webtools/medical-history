from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date


class TestResultItem(BaseModel):
    """Individual test result with value, unit, and reference range."""
    value: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: Optional[str] = None  # normal, high, low, abnormal


class MedicalReportBase(BaseModel):
    report_type: Optional[str] = None  # blood_test, xray, mri, ct_scan, ultrasound, ecg, etc.
    report_date: Optional[date] = None
    report_title: Optional[str] = None
    lab_name: Optional[str] = None
    lab_address: Optional[str] = None
    technician_name: Optional[str] = None
    referring_doctor: Optional[str] = None
    parsed_text: Optional[str] = None
    summary: Optional[str] = None
    findings: Optional[str] = None
    conclusion: Optional[str] = None
    recommendations: Optional[str] = None
    test_results: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class MedicalReportCreate(MedicalReportBase):
    document_id: int
    patient_id: int


class MedicalReportUpdate(BaseModel):
    report_type: Optional[str] = None
    report_date: Optional[date] = None
    report_title: Optional[str] = None
    lab_name: Optional[str] = None
    lab_address: Optional[str] = None
    technician_name: Optional[str] = None
    referring_doctor: Optional[str] = None
    parsed_text: Optional[str] = None
    summary: Optional[str] = None
    findings: Optional[str] = None
    conclusion: Optional[str] = None
    recommendations: Optional[str] = None
    test_results: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class MedicalReportResponse(MedicalReportBase):
    id: int
    document_id: int
    patient_id: int
    parsing_status: Optional[str] = None
    raw_parsed_data: Optional[Dict[str, Any]] = None
    searchable_content: Optional[str] = Field(None, alias="parsed_text")  # Use model field name
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        populate_by_name = True


class MedicalReportListResponse(BaseModel):
    reports: List[MedicalReportResponse]
    total: int


class MedicalReportSearchResponse(BaseModel):
    """Search response for medical reports."""
    query: str
    results: List[MedicalReportResponse]
    total: int


class ReportSearchResult(BaseModel):
    """Search result for reports."""
    report_id: int
    report_type: Optional[str] = None
    report_title: Optional[str] = None
    report_date: Optional[date] = None
    patient_name: str
    patient_id: int
    matched_text: str  # The text snippet that matched the search
    lab_name: Optional[str] = None
