"""Medical Reports API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import Optional, List
from datetime import date

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.patient import Patient
from app.models.document import Document
from app.models.medical_report import MedicalReport
from app.schemas.medical_report import (
    MedicalReportResponse,
    MedicalReportListResponse,
    MedicalReportSearchResponse,
    MedicalReportUpdate
)

router = APIRouter(prefix="/medical-reports", tags=["medical-reports"])


@router.get("/", response_model=MedicalReportListResponse)
async def list_medical_reports(
    patient_id: Optional[int] = Query(None),
    report_type: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List medical reports for the current user's patients"""
    
    # Build query
    query = (
        select(MedicalReport)
        .join(Document)
        .join(Patient)
        .where(Patient.user_id == current_user.id)
    )
    
    # Apply filters
    if patient_id:
        query = query.where(Document.patient_id == patient_id)
    
    if report_type:
        query = query.where(MedicalReport.report_type == report_type)
    
    if from_date:
        query = query.where(MedicalReport.report_date >= from_date)
    
    if to_date:
        query = query.where(MedicalReport.report_date <= to_date)
    
    # Get total count
    count_query = select(MedicalReport.id).join(Document).join(Patient).where(Patient.user_id == current_user.id)
    if patient_id:
        count_query = count_query.where(Document.patient_id == patient_id)
    count_result = await db.execute(count_query)
    total = len(count_result.all())
    
    # Apply pagination
    query = query.order_by(MedicalReport.report_date.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    reports = result.scalars().all()
    
    return MedicalReportListResponse(
        reports=[MedicalReportResponse.model_validate(r) for r in reports],
        total=total
    )


@router.get("/search", response_model=MedicalReportSearchResponse)
async def search_medical_reports(
    q: str = Query(..., min_length=2, description="Search query"),
    patient_id: Optional[int] = Query(None),
    report_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search medical reports by content (plaintext search)"""
    
    search_term = f"%{q}%"
    
    # Build query
    query = (
        select(MedicalReport)
        .join(Document)
        .join(Patient)
        .where(Patient.user_id == current_user.id)
        .where(
            or_(
                MedicalReport.parsed_text.ilike(search_term),
                MedicalReport.report_title.ilike(search_term),
                MedicalReport.findings.ilike(search_term),
                MedicalReport.conclusion.ilike(search_term)
            )
        )
    )
    
    # Apply filters
    if patient_id:
        query = query.where(Document.patient_id == patient_id)
    
    if report_type:
        query = query.where(MedicalReport.report_type == report_type)
    
    # Get total count
    count_query = (
        select(MedicalReport.id)
        .join(Document)
        .join(Patient)
        .where(Patient.user_id == current_user.id)
        .where(
            or_(
                MedicalReport.parsed_text.ilike(search_term),
                MedicalReport.report_title.ilike(search_term),
                MedicalReport.findings.ilike(search_term),
                MedicalReport.conclusion.ilike(search_term)
            )
        )
    )
    count_result = await db.execute(count_query)
    total = len(count_result.all())
    
    # Apply pagination
    query = query.order_by(MedicalReport.report_date.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    reports = result.scalars().all()
    
    return MedicalReportSearchResponse(
        query=q,
        results=[MedicalReportResponse.model_validate(r) for r in reports],
        total=total
    )


@router.get("/{report_id}", response_model=MedicalReportResponse)
async def get_medical_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific medical report"""
    
    query = (
        select(MedicalReport)
        .join(Document)
        .join(Patient)
        .where(MedicalReport.id == report_id)
        .where(Patient.user_id == current_user.id)
    )
    
    result = await db.execute(query)
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical report not found"
        )
    
    return MedicalReportResponse.model_validate(report)


@router.put("/{report_id}", response_model=MedicalReportResponse)
async def update_medical_report(
    report_id: int,
    update_data: MedicalReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a medical report (manual corrections)"""
    
    # Get the report
    query = (
        select(MedicalReport)
        .join(Document)
        .join(Patient)
        .where(MedicalReport.id == report_id)
        .where(Patient.user_id == current_user.id)
    )
    
    result = await db.execute(query)
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical report not found"
        )
    
    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(report, field, value)
    
    await db.commit()
    await db.refresh(report)
    
    return MedicalReportResponse.model_validate(report)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medical_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a medical report"""
    
    # Get the report
    query = (
        select(MedicalReport)
        .join(Document)
        .join(Patient)
        .where(MedicalReport.id == report_id)
        .where(Patient.user_id == current_user.id)
    )
    
    result = await db.execute(query)
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical report not found"
        )
    
    await db.delete(report)
    await db.commit()


@router.get("/patient/{patient_id}/summary")
async def get_patient_report_summary(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a summary of all medical reports for a patient"""
    
    # Verify patient belongs to user
    patient_query = select(Patient).where(
        Patient.id == patient_id,
        Patient.user_id == current_user.id
    )
    patient_result = await db.execute(patient_query)
    patient = patient_result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Get report counts by type
    query = (
        select(MedicalReport)
        .join(Document)
        .where(Document.patient_id == patient_id)
    )
    
    result = await db.execute(query)
    reports = result.scalars().all()
    
    # Build summary
    type_counts = {}
    for report in reports:
        report_type = report.report_type or "unknown"
        type_counts[report_type] = type_counts.get(report_type, 0) + 1
    
    return {
        "patient_id": patient_id,
        "patient_name": patient.name,
        "total_reports": len(reports),
        "reports_by_type": type_counts,
        "latest_report_date": max((r.report_date for r in reports if r.report_date), default=None)
    }
