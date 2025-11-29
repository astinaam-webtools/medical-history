from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm import relationship as db_relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.prescription import Prescription


class Medicine(Base):
    __tablename__ = "medicines"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    prescription_id: Mapped[int] = mapped_column(Integer, ForeignKey("prescriptions.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    dosage: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    frequency: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    timing: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # before/after food
    when_to_take: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    duration_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Time-based flags
    morning: Mapped[bool] = mapped_column(Boolean, default=False)
    afternoon: Mapped[bool] = mapped_column(Boolean, default=False)
    evening: Mapped[bool] = mapped_column(Boolean, default=False)
    night: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    prescription: Mapped["Prescription"] = db_relationship("Prescription", back_populates="medicines")
    
    def __repr__(self):
        return f"<Medicine {self.name}>"
