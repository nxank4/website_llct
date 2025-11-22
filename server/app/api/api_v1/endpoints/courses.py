from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ....core.database import get_db_session_write, get_db_session_read
from ....models.course import Course, Lesson, Exercise, Enrollment
from ....schemas.course import (
    Course as CourseSchema,
    CourseCreate,
    CourseUpdate,
    CourseWithInstructor,
    Lesson as LessonSchema,
    LessonCreate,
    Exercise as ExerciseSchema,
    ExerciseCreate,
    Enrollment as EnrollmentSchema
)

router = APIRouter()


# Courses endpoints
@router.get("/", response_model=List[CourseWithInstructor])
async def read_courses(
    db: AsyncSession = Depends(get_db_session_read),
    skip: int = 0,
    limit: int = 100,
    category: str = None,
    level: str = None,
) -> Any:
    """
    Retrieve courses with RLS (Row Level Security) filtering.
    
    RLS context is automatically set by get_db_session_write/get_db_session_read.
    Users will only see courses they have access to based on Supabase RLS policies.
    """
    # Query courses (RLS will automatically filter based on user_id)
    query = select(Course).where(Course.is_published)
    
    if category:
        query = query.where(Course.category == category)
    if level:
        query = query.where(Course.level == level)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    courses = result.scalars().all()
    return courses


@router.get("/{course_id}", response_model=CourseWithInstructor)
async def read_course_by_id(
    course_id: int,
    db: AsyncSession = Depends(get_db_session_read),
) -> Any:
    """
    Get a specific course by id
    """
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(
            status_code=404,
            detail="The course with this id does not exist in the system",
        )
    return course


@router.post("/", response_model=CourseSchema)
async def create_course(
    *,
    db: AsyncSession = Depends(get_db_session_write),
    course_in: CourseCreate,
) -> Any:
    """
    Create new course
    """
    course = Course(**course_in.model_dump())
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@router.put("/{course_id}", response_model=CourseSchema)
async def update_course(
    *,
    db: AsyncSession = Depends(get_db_session_write),
    course_id: int,
    course_in: CourseUpdate,
) -> Any:
    """
    Update a course
    """
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(
            status_code=404,
            detail="The course with this id does not exist in the system",
        )
    
    update_data = course_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(course, field, value)
    
    await db.commit()
    await db.refresh(course)
    return course


# Lessons endpoints
@router.get("/{course_id}/lessons", response_model=List[LessonSchema])
async def read_lessons(
    course_id: int,
    db: AsyncSession = Depends(get_db_session_read),
) -> Any:
    """
    Get lessons for a specific course
    """
    result = await db.execute(
        select(Lesson)
        .where(Lesson.course_id == course_id, Lesson.is_published)
        .order_by(Lesson.order_index)
    )
    lessons = result.scalars().all()
    return lessons


@router.post("/{course_id}/lessons", response_model=LessonSchema)
async def create_lesson(
    *,
    db: AsyncSession = Depends(get_db_session_write),
    course_id: int,
    lesson_in: LessonCreate,
) -> Any:
    """
    Create new lesson for a course
    """
    lesson_data = lesson_in.model_dump()
    lesson_data["course_id"] = course_id
    lesson = Lesson(**lesson_data)
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


# Exercises endpoints
@router.get("/lessons/{lesson_id}/exercises", response_model=List[ExerciseSchema])
async def read_exercises(
    lesson_id: int,
    db: AsyncSession = Depends(get_db_session_read),
) -> Any:
    """
    Get exercises for a specific lesson
    """
    result = await db.execute(select(Exercise).where(Exercise.lesson_id == lesson_id))
    exercises = result.scalars().all()
    return exercises


@router.post("/lessons/{lesson_id}/exercises", response_model=ExerciseSchema)
async def create_exercise(
    *,
    db: AsyncSession = Depends(get_db_session_write),
    lesson_id: int,
    exercise_in: ExerciseCreate,
) -> Any:
    """
    Create new exercise for a lesson
    """
    exercise_data = exercise_in.model_dump()
    exercise_data["lesson_id"] = lesson_id
    exercise = Exercise(**exercise_data)
    db.add(exercise)
    await db.commit()
    await db.refresh(exercise)
    return exercise


# Enrollment endpoints
@router.post("/{course_id}/enroll", response_model=EnrollmentSchema)
async def enroll_in_course(
    *,
    db: AsyncSession = Depends(get_db_session_write),
    course_id: int,
    user_id: int,
) -> Any:
    """
    Enroll a user in a course
    """
    # Check if course exists
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(
            status_code=404,
            detail="The course with this id does not exist in the system",
        )
    
    # Check if already enrolled
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == user_id,
            Enrollment.course_id == course_id
        )
    )
    existing_enrollment = result.scalar_one_or_none()
    if existing_enrollment:
        raise HTTPException(
            status_code=400,
            detail="User is already enrolled in this course",
        )
    
    enrollment = Enrollment(user_id=user_id, course_id=course_id)
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)
    return enrollment
