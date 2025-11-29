from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.patient import Patient
from app.models.document import Document
from app.schemas.patient import (
    PatientCreate,
    PatientUpdate,
    PatientResponse,
    PatientListResponse
)


router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("", response_model=PatientListResponse)
async def list_patients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all patients for the current user"""
    result = await db.execute(
        select(Patient)
        .where(Patient.user_id == current_user.id)
        .order_by(Patient.name)
    )
    patients = result.scalars().all()
    
    # Get document counts for each patient
    patient_responses = []
    for patient in patients:
        doc_count_result = await db.execute(
            select(func.count(Document.id))
            .where(Document.patient_id == patient.id)
        )
        doc_count = doc_count_result.scalar() or 0
        
        patient_responses.append(
            PatientResponse(
                id=patient.id,
                user_id=patient.user_id,
                name=patient.name,
                date_of_birth=patient.date_of_birth,
                gender=patient.gender,
                blood_group=patient.blood_group,
                allergies=patient.allergies,
                chronic_conditions=patient.chronic_conditions,
                emergency_contact=patient.emergency_contact,
                relationship=patient.relation_to_user,
                avatar_url=patient.avatar_url,
                created_at=patient.created_at,
                updated_at=patient.updated_at,
                document_count=doc_count
            )
        )
    
    return PatientListResponse(
        patients=patient_responses,
        total=len(patient_responses)
    )


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient_data: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new patient profile"""
    patient = Patient(
        user_id=current_user.id,
        name=patient_data.name,
        date_of_birth=patient_data.date_of_birth,
        gender=patient_data.gender,
        blood_group=patient_data.blood_group,
        allergies=patient_data.allergies,
        chronic_conditions=patient_data.chronic_conditions,
        emergency_contact=patient_data.emergency_contact,
        relation_to_user=patient_data.relationship,
        avatar_url=patient_data.avatar_url
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    
    return PatientResponse(
        id=patient.id,
        user_id=patient.user_id,
        name=patient.name,
        date_of_birth=patient.date_of_birth,
        gender=patient.gender,
        blood_group=patient.blood_group,
        allergies=patient.allergies,
        chronic_conditions=patient.chronic_conditions,
        emergency_contact=patient.emergency_contact,
        relationship=patient.relation_to_user,
        avatar_url=patient.avatar_url,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
        document_count=0
    )


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific patient by ID"""
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
    
    # Get document count
    doc_count_result = await db.execute(
        select(func.count(Document.id))
        .where(Document.patient_id == patient.id)
    )
    doc_count = doc_count_result.scalar() or 0
    
    return PatientResponse(
        id=patient.id,
        user_id=patient.user_id,
        name=patient.name,
        date_of_birth=patient.date_of_birth,
        gender=patient.gender,
        blood_group=patient.blood_group,
        allergies=patient.allergies,
        chronic_conditions=patient.chronic_conditions,
        emergency_contact=patient.emergency_contact,
        relationship=patient.relation_to_user,
        avatar_url=patient.avatar_url,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
        document_count=doc_count
    )


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a patient profile"""
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
    
    # Update only provided fields
    update_data = patient_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)
    
    await db.commit()
    await db.refresh(patient)
    
    # Get document count
    doc_count_result = await db.execute(
        select(func.count(Document.id))
        .where(Document.patient_id == patient.id)
    )
    doc_count = doc_count_result.scalar() or 0
    
    return PatientResponse(
        id=patient.id,
        user_id=patient.user_id,
        name=patient.name,
        date_of_birth=patient.date_of_birth,
        gender=patient.gender,
        blood_group=patient.blood_group,
        allergies=patient.allergies,
        chronic_conditions=patient.chronic_conditions,
        emergency_contact=patient.emergency_contact,
        relationship=patient.relation_to_user,
        avatar_url=patient.avatar_url,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
        document_count=doc_count
    )


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a patient profile and all associated documents"""
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
    
    await db.delete(patient)
    await db.commit()
