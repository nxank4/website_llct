from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, delete
import random
import logging

from ....core.database import get_db_session_write, get_db_session_read
from ....middleware.auth import (
    AuthenticatedUser,
    get_current_authenticated_user,
    get_current_supervisor_user,
)
from ....models.assessment import Assessment as AssessmentModel, Question as QuestionModel, AssessmentType, QuestionType
from ....models.library import LibrarySubject
from ....models.assessment_rating import AssessmentRating as AssessmentRatingModel
from ....schemas.assessment import (
    Assessment as AssessmentSchema,
    AssessmentCreate,
    AssessmentUpdate,
    Question as QuestionSchema,
    QuestionCreate,
    QuestionUpdate,
)
from ....schemas.assessment_rating import (
    AssessmentRatingCreate,
    AssessmentRatingUpdate,
    AssessmentRatingResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=List[AssessmentSchema])
async def list_assessments(
    db: AsyncSession = Depends(get_db_session_read),
    skip: int = 0,
    limit: int = 100,
    subject_id: Optional[int] = Query(None, description="Filter by subject ID"),
    subject_code: Optional[str] = Query(None, description="Filter by subject code"),
    published_only: Optional[bool] = Query(None, description="Filter by published status"),
) -> Any:
    """
    List assessments with optional filters.
    """
    normalized_subject_code = subject_code.upper() if subject_code else None

    query = (
        select(
            AssessmentModel,
            LibrarySubject.code.label("subject_code"),
            LibrarySubject.name.label("subject_name"),
            func.count(QuestionModel.id).label("questions_count"),
        )
        .outerjoin(LibrarySubject, AssessmentModel.subject_id == LibrarySubject.id)
        .outerjoin(QuestionModel, QuestionModel.assessment_id == AssessmentModel.id)
    )

    conditions = []
    if subject_id:
        conditions.append(AssessmentModel.subject_id == subject_id)
    if normalized_subject_code:
        conditions.append(func.upper(LibrarySubject.code) == normalized_subject_code)
    if published_only:
        conditions.append(AssessmentModel.is_published.is_(True))

    if conditions:
        query = query.where(and_(*conditions))

    query = (
        query.group_by(
            AssessmentModel.id,
            LibrarySubject.code,
            LibrarySubject.name,
        )
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    assessments: List[AssessmentSchema] = []
    for assessment, subj_code, subj_name, questions_count in rows:
        base_data = AssessmentSchema.model_validate(
            assessment, from_attributes=True
        ).model_dump()
        base_data.update(
            {
                "subject_code": subj_code,
                "subject_name": subj_name,
                "questions_count": questions_count or 0,
            }
        )
        assessments.append(AssessmentSchema(**base_data))
    return assessments


@router.post("/", response_model=AssessmentSchema)
async def create_assessment(
    assessment_in: AssessmentCreate,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
) -> Any:
    data = assessment_in.model_dump()
    # coerce enums
    data["assessment_type"] = AssessmentType(data["assessment_type"])
    data["created_by"] = current_user.user_id
    # Xử lý max_attempts: nếu là 0 hoặc None, thì lưu None (không giới hạn)
    if data.get("max_attempts") == 0:
        data["max_attempts"] = None
    assessment = AssessmentModel(**data)
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)
    return assessment


@router.get("/{assessment_id}", response_model=AssessmentSchema)
async def get_assessment(
    assessment_id: int, db: AsyncSession = Depends(get_db_session_read)
) -> Any:
    query = (
        select(
            AssessmentModel,
            LibrarySubject.code.label("subject_code"),
            LibrarySubject.name.label("subject_name"),
            func.count(QuestionModel.id).label("questions_count"),
        )
        .outerjoin(LibrarySubject, AssessmentModel.subject_id == LibrarySubject.id)
        .outerjoin(QuestionModel, QuestionModel.assessment_id == AssessmentModel.id)
        .where(AssessmentModel.id == assessment_id)
        .group_by(
            AssessmentModel.id,
            LibrarySubject.code,
            LibrarySubject.name,
        )
    )
    result = await db.execute(query)
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Assessment not found")
    assessment, subj_code, subj_name, questions_count = row
    base_data = AssessmentSchema.model_validate(
        assessment, from_attributes=True
    ).model_dump()
    base_data.update(
        {
            "subject_code": subj_code,
            "subject_name": subj_name,
            "questions_count": questions_count or 0,
        }
    )
    return AssessmentSchema(**base_data)


@router.put("/{assessment_id}", response_model=AssessmentSchema)
async def update_assessment(
    assessment_id: int,
    assessment_in: AssessmentUpdate,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
) -> Any:
    result = await db.execute(select(AssessmentModel).where(AssessmentModel.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    update_data = assessment_in.model_dump(exclude_unset=True)
    if "assessment_type" in update_data:
        update_data["assessment_type"] = AssessmentType(update_data["assessment_type"])
    for k, v in update_data.items():
        setattr(assessment, k, v)
    await db.commit()
    await db.refresh(assessment)
    return assessment


@router.get("/{assessment_id}/questions", response_model=List[QuestionSchema])
async def list_questions(assessment_id: int, db: AsyncSession = Depends(get_db_session_read)) -> Any:
    result = await db.execute(select(QuestionModel).where(QuestionModel.assessment_id == assessment_id))
    return result.scalars().all()


@router.post("/{assessment_id}/questions", response_model=QuestionSchema)
async def create_question(
    assessment_id: int,
    question_in: QuestionCreate,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
) -> Any:
    result = await db.execute(select(AssessmentModel).where(AssessmentModel.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    data = question_in.model_dump()
    data["question_type"] = QuestionType(data["question_type"])
    data["assessment_id"] = assessment_id
    data["created_by"] = current_user.user_id
    question = QuestionModel(**data)
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


@router.get("/subject/{subject_id}/random-questions", response_model=List[QuestionSchema])
async def get_random_questions_from_subject(
    subject_id: int,
    count: int = Query(60, ge=1, le=100, description="Number of random questions to return"),
    db: AsyncSession = Depends(get_db_session_read),
) -> Any:
    """
    Get random questions from all assessments for a specific subject.
    Useful for creating quick tests.
    
    - subject_id: Subject ID to get questions from
    - count: Number of random questions to return (default: 60, max: 100)
    """
    try:
        # Get all published assessments for this subject
        assessments_query = select(AssessmentModel).where(
            and_(
                AssessmentModel.subject_id == subject_id,
                AssessmentModel.is_published == True
            )
        )
        assessments_result = await db.execute(assessments_query)
        assessments = assessments_result.scalars().all()
        
        if not assessments:
            logger.info(f"No published assessments found for subject_id: {subject_id}")
            return []
        
        # Get all questions from these assessments
        assessment_ids = [a.id for a in assessments]
        questions_query = select(QuestionModel).where(
            and_(
                QuestionModel.assessment_id.in_(assessment_ids),
                QuestionModel.is_active == True
            )
        )
        questions_result = await db.execute(questions_query)
        all_questions = questions_result.scalars().all()
        
        if not all_questions:
            logger.info(f"No questions found for subject_id: {subject_id}")
            return []
        
        # Randomly select questions
        selected_count = min(count, len(all_questions))
        selected_questions = random.sample(all_questions, selected_count)
        
        logger.info(
            f"Selected {selected_count} random questions from {len(all_questions)} total questions "
            f"for subject_id: {subject_id}"
        )
        
        return selected_questions
        
    except Exception as e:
        logger.error(f"Error getting random questions for subject_id {subject_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error getting random questions: {str(e)}"
        )


@router.delete("/{assessment_id}")
async def delete_assessment(
    assessment_id: int,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
) -> Any:
    """Delete an assessment and all its questions"""
    result = await db.execute(select(AssessmentModel).where(AssessmentModel.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Delete all questions first to avoid foreign key constraint violation
    await db.execute(delete(QuestionModel).where(QuestionModel.assessment_id == assessment_id))
    
    # Then delete the assessment
    await db.execute(delete(AssessmentModel).where(AssessmentModel.id == assessment_id))
    await db.commit()
    return {"message": "Assessment deleted successfully"}


@router.put("/{assessment_id}/questions/{question_id}", response_model=QuestionSchema)
async def update_question(
    assessment_id: int,
    question_id: int,
    question_in: QuestionUpdate,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
) -> Any:
    """Update a question"""
    # Verify assessment exists
    assessment_result = await db.execute(select(AssessmentModel).where(AssessmentModel.id == assessment_id))
    assessment = assessment_result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Get question
    question_result = await db.execute(select(QuestionModel).where(
        and_(QuestionModel.id == question_id, QuestionModel.assessment_id == assessment_id)
    ))
    question = question_result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    update_data = question_in.model_dump(exclude_unset=True)
    if "question_type" in update_data:
        update_data["question_type"] = QuestionType(update_data["question_type"])
    
    for k, v in update_data.items():
        setattr(question, k, v)
    
    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/{assessment_id}/questions/{question_id}")
async def delete_question(
    assessment_id: int,
    question_id: int,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
) -> Any:
    """Delete a question"""
    # Verify assessment exists
    assessment_result = await db.execute(select(AssessmentModel).where(AssessmentModel.id == assessment_id))
    assessment = assessment_result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Get question
    question_result = await db.execute(select(QuestionModel).where(
        and_(QuestionModel.id == question_id, QuestionModel.assessment_id == assessment_id)
    ))
    question = question_result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await db.execute(delete(QuestionModel).where(QuestionModel.id == question_id))
    await db.commit()
    return {"message": "Question deleted successfully"}


# ===============================
# Assessment Rating Endpoints
# ===============================

@router.post("/{assessment_id}/ratings", response_model=AssessmentRatingResponse)
async def create_or_update_rating(
    assessment_id: int,
    rating_data: AssessmentRatingCreate,
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Create or update a rating for an assessment"""
    try:
        # Verify assessment exists
        assessment_result = await db.execute(
            select(AssessmentModel).where(AssessmentModel.id == assessment_id)
        )
        assessment = assessment_result.scalar_one_or_none()
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Check if user already rated this assessment
        existing_rating_result = await db.execute(
            select(AssessmentRatingModel).where(
                and_(
                    AssessmentRatingModel.assessment_id == assessment_id,
                    AssessmentRatingModel.user_id == current_user.user_id
                )
            )
        )
        existing_rating = existing_rating_result.scalar_one_or_none()
        
        if existing_rating:
            # Update existing rating
            old_rating = existing_rating.rating
            existing_rating.rating = rating_data.rating
            existing_rating.feedback = rating_data.feedback
            await db.commit()
            await db.refresh(existing_rating)
            
            # Update assessment average rating
            await _update_assessment_rating(assessment_id, db, old_rating, rating_data.rating)
            
            return AssessmentRatingResponse.model_validate(existing_rating)
        else:
            # Create new rating
            new_rating = AssessmentRatingModel(
                assessment_id=assessment_id,
                user_id=current_user.user_id,
                rating=rating_data.rating,
                feedback=rating_data.feedback,
            )
            db.add(new_rating)
            await db.commit()
            await db.refresh(new_rating)
            
            # Update assessment average rating
            await _update_assessment_rating(assessment_id, db, None, rating_data.rating)
            
            return AssessmentRatingResponse.model_validate(new_rating)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating/updating rating: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating/updating rating: {str(e)}"
        )


@router.get("/{assessment_id}/ratings/my", response_model=Optional[AssessmentRatingResponse])
async def get_my_rating(
    assessment_id: int,
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get current user's rating for an assessment"""
    try:
        rating_result = await db.execute(
            select(AssessmentRatingModel).where(
                and_(
                    AssessmentRatingModel.assessment_id == assessment_id,
                    AssessmentRatingModel.user_id == current_user.user_id
                )
            )
        )
        rating = rating_result.scalar_one_or_none()
        
        if rating:
            return AssessmentRatingResponse.model_validate(rating)
        return None
        
    except Exception as e:
        logger.error(f"Error getting rating: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting rating: {str(e)}"
        )


@router.get("/{assessment_id}/ratings", response_model=List[AssessmentRatingResponse])
async def get_all_ratings(
    assessment_id: int,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get all ratings for an assessment (admin/instructor only)"""
    try:
        ratings_result = await db.execute(
            select(AssessmentRatingModel)
            .where(AssessmentRatingModel.assessment_id == assessment_id)
            .order_by(AssessmentRatingModel.created_at.desc())
        )
        ratings = ratings_result.scalars().all()
        
        return [AssessmentRatingResponse.model_validate(r) for r in ratings]
        
    except Exception as e:
        logger.error(f"Error getting ratings: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting ratings: {str(e)}"
        )


async def _update_assessment_rating(
    assessment_id: int,
    db: AsyncSession,
    old_rating: Optional[int],
    new_rating: int,
):
    """Helper function to update assessment's average rating"""
    try:
        # Get all ratings for this assessment
        ratings_result = await db.execute(
            select(AssessmentRatingModel.rating).where(
                AssessmentRatingModel.assessment_id == assessment_id
            )
        )
        ratings = ratings_result.scalars().all()
        
        if ratings:
            # Calculate new average
            total = sum(ratings)
            count = len(ratings)
            average = total / count if count > 0 else 0.0
            
            # Update assessment
            assessment_result = await db.execute(
                select(AssessmentModel).where(AssessmentModel.id == assessment_id)
            )
            assessment = assessment_result.scalar_one_or_none()
            if assessment:
                assessment.rating = round(average, 2)
                assessment.rating_count = count
                await db.commit()
        else:
            # No ratings, reset to 0
            assessment_result = await db.execute(
                select(AssessmentModel).where(AssessmentModel.id == assessment_id)
            )
            assessment = assessment_result.scalar_one_or_none()
            if assessment:
                assessment.rating = 0.0
                assessment.rating_count = 0
                await db.commit()
                
    except Exception as e:
        logger.error(f"Error updating assessment rating: {str(e)}", exc_info=True)
        # Don't raise, just log - rating update is not critical


