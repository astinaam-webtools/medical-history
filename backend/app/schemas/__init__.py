# Schemas module
from app.schemas.user import UserCreate, UserResponse, TokenResponse, UserLogin, TokenRefresh
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse, PatientListResponse
from app.schemas.document import DocumentUpload, DocumentUpdate, DocumentResponse, DocumentListResponse
from app.schemas.prescription import (
    PrescriptionCreate, 
    PrescriptionUpdate, 
    PrescriptionResponse, 
    PrescriptionListResponse,
    MedicineCreate,
    MedicineResponse
)
from app.schemas.medical_report import (
    MedicalReportCreate,
    MedicalReportUpdate,
    MedicalReportResponse,
    MedicalReportListResponse,
    MedicalReportSearchResponse
)
