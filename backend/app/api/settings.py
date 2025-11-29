from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user, encrypt_api_key, decrypt_api_key, verify_password
from app.models.user import User
from app.schemas.user import UserUpdate, UserResponse, APIKeyUpdate, SettingsResponse


router = APIRouter(prefix="/settings", tags=["Settings"])


class DeleteAccountRequest(BaseModel):
    password: str


@router.get("", response_model=SettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_user)
):
    """Get user settings"""
    has_api_key = bool(current_user.openrouter_api_key)
    api_key_preview = None
    
    if has_api_key:
        try:
            decrypted = decrypt_api_key(current_user.openrouter_api_key)
            api_key_preview = f"...{decrypted[-4:]}"
        except:
            api_key_preview = "****"
    
    return SettingsResponse(
        has_api_key=has_api_key,
        api_key_preview=api_key_preview
    )


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user profile"""
    # Check username uniqueness if provided
    if user_data.username and user_data.username != current_user.username:
        result = await db.execute(
            select(User).where(User.username == user_data.username)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Update only provided fields
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        has_api_key=bool(current_user.openrouter_api_key)
    )


@router.put("/api-key", response_model=SettingsResponse)
async def update_api_key(
    api_key_data: APIKeyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update OpenRouter API key"""
    # Encrypt and store the API key
    encrypted_key = encrypt_api_key(api_key_data.api_key)
    current_user.openrouter_api_key = encrypted_key
    
    await db.commit()
    await db.refresh(current_user)
    
    return SettingsResponse(
        has_api_key=True,
        api_key_preview=f"...{api_key_data.api_key[-4:]}"
    )


@router.delete("/api-key", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete OpenRouter API key"""
    current_user.openrouter_api_key = None
    await db.commit()


@router.post("/export")
async def export_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Export all user data as JSON"""
    from app.models.patient import Patient
    from app.models.document import Document
    from app.models.prescription import Prescription
    from app.models.medicine import Medicine
    from sqlalchemy.orm import selectinload
    
    # Get all patients with their data
    result = await db.execute(
        select(Patient)
        .options(
            selectinload(Patient.documents)
            .selectinload(Document.prescription)
            .selectinload(Prescription.medicines)
        )
        .where(Patient.user_id == current_user.id)
    )
    patients = result.scalars().all()
    
    export_data = {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "username": current_user.username,
            "full_name": current_user.full_name
        },
        "patients": []
    }
    
    for patient in patients:
        patient_data = {
            "id": patient.id,
            "name": patient.name,
            "date_of_birth": str(patient.date_of_birth) if patient.date_of_birth else None,
            "gender": patient.gender,
            "blood_group": patient.blood_group,
            "allergies": patient.allergies,
            "chronic_conditions": patient.chronic_conditions,
            "emergency_contact": patient.emergency_contact,
            "relationship": patient.relationship,
            "documents": []
        }
        
        for doc in patient.documents:
            doc_data = {
                "id": doc.id,
                "file_name": doc.file_name,
                "document_type": doc.document_type,
                "upload_date": str(doc.upload_date),
                "notes": doc.notes,
                "prescription": None
            }
            
            if doc.prescription:
                rx = doc.prescription
                doc_data["prescription"] = {
                    "id": rx.id,
                    "prescription_date": str(rx.prescription_date) if rx.prescription_date else None,
                    "doctor_name": rx.doctor_name,
                    "doctor_specialty": rx.doctor_specialty,
                    "doctor_degree": rx.doctor_degree,
                    "hospital_name": rx.hospital_name,
                    "diagnosis": rx.diagnosis,
                    "notes": rx.notes,
                    "medicines": [
                        {
                            "id": med.id,
                            "name": med.name,
                            "dosage": med.dosage,
                            "frequency": med.frequency,
                            "when_to_take": med.when_to_take,
                            "duration_days": med.duration_days,
                            "instructions": med.instructions
                        }
                        for med in rx.medicines
                    ]
                }
            
            patient_data["documents"].append(doc_data)
        
        export_data["patients"].append(patient_data)
    
    return export_data


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    request: DeleteAccountRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete user account and all associated data"""
    from app.models.patient import Patient
    from app.models.document import Document
    from app.models.prescription import Prescription
    from app.models.medicine import Medicine
    from app.models.medical_report import MedicalReport
    
    # Verify password
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete account - no password set (OAuth user)"
        )
    
    if not verify_password(request.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    
    # Delete all user's data in order (to respect foreign key constraints)
    # Get all patient IDs for this user
    patient_result = await db.execute(
        select(Patient.id).where(Patient.user_id == current_user.id)
    )
    patient_ids = [p[0] for p in patient_result.fetchall()]
    
    if patient_ids:
        # Get all document IDs for these patients
        doc_result = await db.execute(
            select(Document.id).where(Document.patient_id.in_(patient_ids))
        )
        doc_ids = [d[0] for d in doc_result.fetchall()]
        
        if doc_ids:
            # Get all prescription IDs for these documents
            rx_result = await db.execute(
                select(Prescription.id).where(Prescription.document_id.in_(doc_ids))
            )
            rx_ids = [r[0] for r in rx_result.fetchall()]
            
            # Delete medicines
            if rx_ids:
                await db.execute(
                    delete(Medicine).where(Medicine.prescription_id.in_(rx_ids))
                )
            
            # Delete prescriptions
            await db.execute(
                delete(Prescription).where(Prescription.document_id.in_(doc_ids))
            )
            
            # Delete medical reports
            await db.execute(
                delete(MedicalReport).where(MedicalReport.document_id.in_(doc_ids))
            )
        
        # Delete documents
        await db.execute(
            delete(Document).where(Document.patient_id.in_(patient_ids))
        )
        
        # Delete patients
        await db.execute(
            delete(Patient).where(Patient.user_id == current_user.id)
        )
    
    # Delete the user
    await db.execute(
        delete(User).where(User.id == current_user.id)
    )
    
    await db.commit()
