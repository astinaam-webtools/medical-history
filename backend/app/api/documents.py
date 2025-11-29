from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime, date
from app.core.database import get_db
from app.core.security import get_current_user, decrypt_api_key
from app.models.user import User
from app.models.patient import Patient
from app.models.document import Document
from app.models.prescription import Prescription
from app.models.medicine import Medicine
from app.models.medical_report import MedicalReport
from app.schemas.document import (
    DocumentResponse,
    DocumentListResponse,
    DocumentUpdate
)
from app.schemas.prescription import PrescriptionResponse, MedicineResponse
from app.schemas.medical_report import MedicalReportResponse
from app.services.file_storage import file_storage
from app.services.ai_parser import ai_parser


router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    patient_id: Optional[int] = None,
    document_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List documents with optional filters"""
    query = (
        select(Document)
        .options(selectinload(Document.prescription).selectinload(Prescription.medicines))
        .where(Document.user_id == current_user.id)
        .order_by(Document.upload_date.desc())
    )
    
    if patient_id:
        query = query.where(Document.patient_id == patient_id)
    
    if document_type:
        query = query.where(Document.document_type == document_type)
    
    result = await db.execute(query)
    documents = result.scalars().all()
    
    document_responses = []
    for doc in documents:
        prescription_response = None
        if doc.prescription:
            prescription_response = PrescriptionResponse(
                id=doc.prescription.id,
                document_id=doc.prescription.document_id,
                patient_id=doc.prescription.patient_id,
                prescription_date=doc.prescription.prescription_date,
                doctor_name=doc.prescription.doctor_name,
                doctor_specialty=doc.prescription.doctor_specialty,
                doctor_degree=doc.prescription.doctor_degree,
                hospital_name=doc.prescription.hospital_name,
                diagnosis=doc.prescription.diagnosis,
                notes=doc.prescription.notes,
                parsing_status=doc.prescription.parsing_status,
                medicines=[
                    MedicineResponse(
                        id=med.id,
                        prescription_id=med.prescription_id,
                        name=med.name,
                        dosage=med.dosage,
                        frequency=med.frequency,
                        when_to_take=med.when_to_take,
                        duration_days=med.duration_days,
                        instructions=med.instructions,
                        created_at=med.created_at
                    ) for med in doc.prescription.medicines
                ],
                created_at=doc.prescription.created_at,
                updated_at=doc.prescription.updated_at
            )
        
        document_responses.append(
            DocumentResponse(
                id=doc.id,
                patient_id=doc.patient_id,
                user_id=doc.user_id,
                file_name=doc.file_name,
                display_name=doc.display_name,
                file_type=doc.file_type,
                file_size=doc.file_size,
                document_type=doc.document_type,
                upload_date=doc.upload_date,
                notes=doc.notes,
                prescription=prescription_response
            )
        )
    
    return DocumentListResponse(
        documents=document_responses,
        total=len(document_responses)
    )


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    patient_id: int = Form(...),
    document_type: Optional[str] = Form(None),
    display_name: Optional[str] = Form(None),
    generate_display_name: bool = Form(False),
    notes: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a document and automatically parse it"""
    # Verify patient belongs to user
    result = await db.execute(
        select(Patient)
        .where(Patient.id == patient_id, Patient.user_id == current_user.id)
    )
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Read file content for validation
    content = await file.read()
    await file.seek(0)  # Reset file position
    
    # Validate file
    is_valid, error_msg = file_storage.validate_file(
        file.filename, 
        file.content_type,
        len(content)
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    # Save file
    stored_filename, file_path, file_size = await file_storage.save_file(file, current_user.id)
    file_type = file_storage.get_file_type(file.filename)
    
    # Create document record
    document = Document(
        patient_id=patient_id,
        user_id=current_user.id,
        file_name=file.filename,
        display_name=display_name,  # User-provided display name
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        document_type=document_type or "prescription",
        notes=notes
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    
    # Parse document with AI if user has API key
    prescription_response = None
    medical_report_response = None
    detected_doc_type = document_type or "prescription"
    
    if current_user.openrouter_api_key:
        try:
            api_key = decrypt_api_key(current_user.openrouter_api_key)
            file_content = await file_storage.read_file(file_path)
            
            # Parse document - let AI auto-detect if document_type not specified
            parsed_data = await ai_parser.parse_document(
                file_content,
                file_type,
                api_key,
                document_type=document_type
            )
            
            # Get the detected document type
            detected_doc_type = parsed_data.get("detected_document_type", "prescription")
            
            # Update document type in database
            document.document_type = detected_doc_type
            
            # Set AI-generated display name if requested and not already set
            if generate_display_name and not display_name:
                suggested_name = parsed_data.get("suggested_file_name")
                if suggested_name:
                    document.display_name = suggested_name
            
            # Process based on document type
            if parsed_data.get("parsing_status") != "failed":
                if detected_doc_type == "medical_report":
                    # Create medical report from parsed data
                    medical_report_response = await _create_medical_report(
                        db, document, patient_id, parsed_data
                    )
                else:
                    # Create prescription from parsed data
                    prescription_response = await _create_prescription(
                        db, document, patient_id, parsed_data
                    )
            
            await db.commit()
        except Exception as e:
            # Log error but don't fail the upload
            print(f"Error parsing document: {e}")
    
    return DocumentResponse(
        id=document.id,
        patient_id=document.patient_id,
        user_id=document.user_id,
        file_name=document.file_name,
        display_name=document.display_name,
        file_type=document.file_type,
        file_size=document.file_size,
        document_type=detected_doc_type,
        upload_date=document.upload_date,
        notes=document.notes,
        prescription=prescription_response
    )


async def _create_prescription(
    db: AsyncSession,
    document: Document,
    patient_id: int,
    parsed_data: dict
) -> PrescriptionResponse:
    """Create prescription and medicines from parsed data"""
    # Parse date
    prescription_date = None
    if parsed_data.get("prescription_date"):
        try:
            prescription_date = datetime.strptime(
                parsed_data["prescription_date"], "%Y-%m-%d"
            ).date()
        except ValueError:
            pass
    
    # Extract doctor info
    doctor_info = parsed_data.get("doctor", {}) or {}
    hospital_info = parsed_data.get("hospital", {}) or {}
    
    prescription = Prescription(
        document_id=document.id,
        patient_id=patient_id,
        prescription_date=prescription_date,
        doctor_name=doctor_info.get("name"),
        doctor_specialty=doctor_info.get("specialty"),
        doctor_degree=doctor_info.get("degree"),
        hospital_name=hospital_info.get("name") or parsed_data.get("hospital_name"),
        diagnosis=parsed_data.get("diagnosis"),
        notes=parsed_data.get("additional_notes"),
        raw_parsed_data=parsed_data,
        parsing_status=parsed_data.get("parsing_status", "partial")
    )
    db.add(prescription)
    await db.commit()
    await db.refresh(prescription)
    
    # Add medicines
    medicines_data = parsed_data.get("medicines", [])
    medicine_responses = []
    for med_data in medicines_data:
        if med_data.get("name"):
            # Build when_to_take from timing flags
            when_to_take = med_data.get("timing")
            if not when_to_take:
                times = []
                if med_data.get("morning"):
                    times.append("morning")
                if med_data.get("afternoon"):
                    times.append("afternoon")
                if med_data.get("evening"):
                    times.append("evening")
                if med_data.get("night"):
                    times.append("night")
                if times:
                    when_to_take = ", ".join(times)
            
            medicine = Medicine(
                prescription_id=prescription.id,
                name=med_data["name"],
                dosage=med_data.get("dosage"),
                frequency=med_data.get("frequency"),
                when_to_take=when_to_take,
                duration_days=med_data.get("duration_days"),
                instructions=med_data.get("instructions")
            )
            db.add(medicine)
            await db.commit()
            await db.refresh(medicine)
            
            medicine_responses.append(
                MedicineResponse(
                    id=medicine.id,
                    prescription_id=medicine.prescription_id,
                    name=medicine.name,
                    dosage=medicine.dosage,
                    frequency=medicine.frequency,
                    when_to_take=medicine.when_to_take,
                    duration_days=medicine.duration_days,
                    instructions=medicine.instructions,
                    created_at=medicine.created_at
                )
            )
    
    return PrescriptionResponse(
        id=prescription.id,
        document_id=prescription.document_id,
        patient_id=prescription.patient_id,
        prescription_date=prescription.prescription_date,
        doctor_name=prescription.doctor_name,
        doctor_specialty=prescription.doctor_specialty,
        doctor_degree=prescription.doctor_degree,
        hospital_name=prescription.hospital_name,
        diagnosis=prescription.diagnosis,
        notes=prescription.notes,
        parsing_status=prescription.parsing_status,
        medicines=medicine_responses,
        created_at=prescription.created_at,
        updated_at=prescription.updated_at
    )


async def _create_medical_report(
    db: AsyncSession,
    document: Document,
    patient_id: int,
    parsed_data: dict
) -> MedicalReportResponse:
    """Create medical report from parsed data"""
    # Parse date
    report_date = None
    if parsed_data.get("report_date"):
        try:
            report_date = datetime.strptime(
                parsed_data["report_date"], "%Y-%m-%d"
            ).date()
        except ValueError:
            pass
    
    # Extract lab info
    lab_info = parsed_data.get("lab", {}) or {}
    
    # Build searchable content - combine all text fields
    searchable_parts = [
        parsed_data.get("full_text", ""),
        parsed_data.get("summary", ""),
        parsed_data.get("findings", ""),
        parsed_data.get("conclusion", ""),
        parsed_data.get("recommendations", ""),
        parsed_data.get("report_title", ""),
        lab_info.get("name", ""),
    ]
    searchable_content = "\n".join(filter(None, searchable_parts))
    
    medical_report = MedicalReport(
        document_id=document.id,
        patient_id=patient_id,
        report_type=parsed_data.get("report_type", "other"),
        report_title=parsed_data.get("report_title"),
        report_date=report_date,
        lab_name=lab_info.get("name"),
        referring_doctor=parsed_data.get("referring_doctor"),
        findings=parsed_data.get("findings"),
        conclusion=parsed_data.get("conclusion"),
        recommendations=parsed_data.get("recommendations"),
        test_results=parsed_data.get("test_results"),
        parsed_text=searchable_content,
        summary=parsed_data.get("summary"),
        raw_parsed_data=parsed_data,
        parsing_status=parsed_data.get("parsing_status", "partial")
    )
    db.add(medical_report)
    await db.commit()
    await db.refresh(medical_report)
    
    return MedicalReportResponse.model_validate(medical_report)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific document by ID"""
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.prescription).selectinload(Prescription.medicines))
        .where(Document.id == document_id, Document.user_id == current_user.id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    prescription_response = None
    if document.prescription:
        prescription_response = PrescriptionResponse(
            id=document.prescription.id,
            document_id=document.prescription.document_id,
            patient_id=document.prescription.patient_id,
            prescription_date=document.prescription.prescription_date,
            doctor_name=document.prescription.doctor_name,
            doctor_specialty=document.prescription.doctor_specialty,
            doctor_degree=document.prescription.doctor_degree,
            hospital_name=document.prescription.hospital_name,
            diagnosis=document.prescription.diagnosis,
            notes=document.prescription.notes,
            parsing_status=document.prescription.parsing_status,
            medicines=[
                MedicineResponse(
                    id=med.id,
                    prescription_id=med.prescription_id,
                    name=med.name,
                    dosage=med.dosage,
                    frequency=med.frequency,
                    when_to_take=med.when_to_take,
                    duration_days=med.duration_days,
                    instructions=med.instructions,
                    created_at=med.created_at
                ) for med in document.prescription.medicines
            ],
            created_at=document.prescription.created_at,
            updated_at=document.prescription.updated_at
        )
    
    return DocumentResponse(
        id=document.id,
        patient_id=document.patient_id,
        user_id=document.user_id,
        file_name=document.file_name,
        file_type=document.file_type,
        file_size=document.file_size,
        document_type=document.document_type,
        upload_date=document.upload_date,
        notes=document.notes,
        prescription=prescription_response
    )


@router.get("/{document_id}/file")
async def download_document(
    document_id: int,
    token: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Download the actual document file. Accepts token as query param for img/iframe loading."""
    from app.core.security import decode_token
    from app.models.user import User as UserModel
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Decode and validate token
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    # Get user
    result = await db.execute(
        select(UserModel).where(UserModel.id == int(user_id))
    )
    current_user = result.scalar_one_or_none()
    
    if not current_user or not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not found or inactive"
        )
    
    # Get document
    result = await db.execute(
        select(Document)
        .where(Document.id == document_id, Document.user_id == current_user.id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    file_path = file_storage.get_full_path(document.file_path)
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )
    
    return FileResponse(
        path=file_path,
        filename=document.file_name,
        media_type="application/octet-stream"
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a document and its associated prescription"""
    result = await db.execute(
        select(Document)
        .where(Document.id == document_id, Document.user_id == current_user.id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete file from disk
    await file_storage.delete_file(document.file_path)
    
    # Delete document (cascades to prescription and medicines)
    await db.delete(document)
    await db.commit()
