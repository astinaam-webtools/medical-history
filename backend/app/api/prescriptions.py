from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user, decrypt_api_key
from app.models.user import User
from app.models.patient import Patient
from app.models.prescription import Prescription
from app.models.medicine import Medicine
from app.schemas.prescription import (
    PrescriptionResponse,
    PrescriptionUpdate,
    PrescriptionListResponse,
    MedicineResponse,
    MedicineSearchResponse,
    MedicineSearchResult
)


router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])


@router.get("", response_model=PrescriptionListResponse)
async def list_prescriptions(
    patient_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List prescriptions with optional filters and search"""
    # Get all patient IDs for current user
    patient_result = await db.execute(
        select(Patient.id).where(Patient.user_id == current_user.id)
    )
    user_patient_ids = [p[0] for p in patient_result.fetchall()]
    
    if not user_patient_ids:
        return PrescriptionListResponse(prescriptions=[], total=0)
    
    query = (
        select(Prescription)
        .options(selectinload(Prescription.medicines))
        .where(Prescription.patient_id.in_(user_patient_ids))
        .order_by(Prescription.prescription_date.desc().nullslast())
    )
    
    if patient_id:
        if patient_id not in user_patient_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        query = query.where(Prescription.patient_id == patient_id)
    
    if search:
        search_filter = or_(
            Prescription.doctor_name.ilike(f"%{search}%"),
            Prescription.hospital_name.ilike(f"%{search}%"),
            Prescription.diagnosis.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
    
    result = await db.execute(query)
    prescriptions = result.scalars().all()
    
    prescription_responses = []
    for rx in prescriptions:
        prescription_responses.append(
            PrescriptionResponse(
                id=rx.id,
                document_id=rx.document_id,
                patient_id=rx.patient_id,
                prescription_date=rx.prescription_date,
                doctor_name=rx.doctor_name,
                doctor_specialty=rx.doctor_specialty,
                doctor_degree=rx.doctor_degree,
                hospital_name=rx.hospital_name,
                diagnosis=rx.diagnosis,
                notes=rx.notes,
                parsing_status=rx.parsing_status,
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
                    ) for med in rx.medicines
                ],
                created_at=rx.created_at,
                updated_at=rx.updated_at
            )
        )
    
    return PrescriptionListResponse(
        prescriptions=prescription_responses,
        total=len(prescription_responses)
    )


@router.get("/search/medicines", response_model=MedicineSearchResponse)
async def search_medicines(
    query: str,
    patient_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search medicines across all prescriptions"""
    # Get all patient IDs for current user
    patient_query = select(Patient).where(Patient.user_id == current_user.id)
    if patient_id:
        patient_query = patient_query.where(Patient.id == patient_id)
    
    patient_result = await db.execute(patient_query)
    patients = {p.id: p for p in patient_result.scalars().all()}
    
    if not patients:
        return MedicineSearchResponse(results=[], total=0)
    
    # Search medicines
    medicine_query = (
        select(Medicine)
        .join(Prescription)
        .where(
            Prescription.patient_id.in_(patients.keys()),
            Medicine.name.ilike(f"%{query}%")
        )
        .order_by(Medicine.name)
    )
    
    result = await db.execute(medicine_query)
    medicines = result.scalars().all()
    
    # Build results with prescription and patient info
    search_results = []
    for med in medicines:
        # Get prescription
        rx_result = await db.execute(
            select(Prescription).where(Prescription.id == med.prescription_id)
        )
        rx = rx_result.scalar_one_or_none()
        
        if rx and rx.patient_id in patients:
            patient = patients[rx.patient_id]
            search_results.append(
                MedicineSearchResult(
                    medicine=MedicineResponse(
                        id=med.id,
                        prescription_id=med.prescription_id,
                        name=med.name,
                        dosage=med.dosage,
                        frequency=med.frequency,
                        when_to_take=med.when_to_take,
                        duration_days=med.duration_days,
                        instructions=med.instructions,
                        created_at=med.created_at
                    ),
                    prescription_id=rx.id,
                    prescription_date=rx.prescription_date,
                    doctor_name=rx.doctor_name,
                    patient_name=patient.name,
                    patient_id=patient.id
                )
            )
    
    return MedicineSearchResponse(
        results=search_results,
        total=len(search_results)
    )


@router.get("/{prescription_id}", response_model=PrescriptionResponse)
async def get_prescription(
    prescription_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific prescription by ID"""
    # Get all patient IDs for current user
    patient_result = await db.execute(
        select(Patient.id).where(Patient.user_id == current_user.id)
    )
    user_patient_ids = [p[0] for p in patient_result.fetchall()]
    
    result = await db.execute(
        select(Prescription)
        .options(selectinload(Prescription.medicines))
        .where(
            Prescription.id == prescription_id,
            Prescription.patient_id.in_(user_patient_ids)
        )
    )
    prescription = result.scalar_one_or_none()
    
    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found"
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
            ) for med in prescription.medicines
        ],
        created_at=prescription.created_at,
        updated_at=prescription.updated_at
    )


@router.put("/{prescription_id}", response_model=PrescriptionResponse)
async def update_prescription(
    prescription_id: int,
    prescription_data: PrescriptionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a prescription"""
    # Get all patient IDs for current user
    patient_result = await db.execute(
        select(Patient.id).where(Patient.user_id == current_user.id)
    )
    user_patient_ids = [p[0] for p in patient_result.fetchall()]
    
    result = await db.execute(
        select(Prescription)
        .options(selectinload(Prescription.medicines))
        .where(
            Prescription.id == prescription_id,
            Prescription.patient_id.in_(user_patient_ids)
        )
    )
    prescription = result.scalar_one_or_none()
    
    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found"
        )
    
    # Update only provided fields
    update_data = prescription_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prescription, field, value)
    
    await db.commit()
    await db.refresh(prescription)
    
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
            ) for med in prescription.medicines
        ],
        created_at=prescription.created_at,
        updated_at=prescription.updated_at
    )
