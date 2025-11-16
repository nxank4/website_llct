from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class AssessmentRatingBase(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    feedback: Optional[str] = None


class AssessmentRatingCreate(AssessmentRatingBase):
    pass  # assessment_id will come from URL path


class AssessmentRatingUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    feedback: Optional[str] = None


class AssessmentRatingInDBBase(AssessmentRatingBase):
    id: int
    assessment_id: int
    user_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AssessmentRatingResponse(AssessmentRatingInDBBase):
    pass

