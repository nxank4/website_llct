from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ....core.database import get_db, set_rls_context
from ....middleware.auth import auth_middleware, security
from ....models.course import Course, Lesson, Exercise, Enrollment
from ....schemas.course import (
    Course as CourseSchema,
    CourseCreate,
    CourseUpdate,
    CourseWithInstructor,
    Lesson as LessonSchema,
    LessonCreate,
    LessonUpdate,
    Exercise as ExerciseSchema,
    ExerciseCreate,
    ExerciseUpdate,
    Enrollment as EnrollmentSchema,
    EnrollmentCreate
)

router = APIRouter()


# Courses endpoints
@router.get("/", response_model=List[CourseWithInstructor])
def read_courses(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    category: str = None,
    level: str = None,
) -> Any:
    """
    Retrieve courses with RLS (Row Level Security) filtering.
    
    This endpoint requires authentication and sets RLS context to ensure
    users only see courses they have access to based on Supabase RLS policies.
    """
    # Verify JWT and get user ID
    user_id = auth_middleware.get_user_id_from_token(credentials)
    
    # Set RLS context before querying
    # This ensures Supabase RLS policies are applied to the query
    set_rls_context(db, user_id)
    
    # Query courses (RLS will automatically filter based on user_id)
    query = db.query(Course).filter(Course.is_published == True)
    
    if category:
        query = query.filter(Course.category == category)
    if level:
        query = query.filter(Course.level == level)
    
    courses = query.offset(skip).limit(limit).all()
    return courses


@router.get("/{course_id}", response_model=CourseWithInstructor)
def read_course_by_id(
    course_id: int,
    db: Session = Depends(get_db),
) -> Any:
    """
    Get a specific course by id
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=404,
            detail="The course with this id does not exist in the system",
        )
    return course


@router.post("/", response_model=CourseSchema)
def create_course(
    *,
    db: Session = Depends(get_db),
    course_in: CourseCreate,
) -> Any:
    """
    Create new course
    """
    course = Course(**course_in.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.put("/{course_id}", response_model=CourseSchema)
def update_course(
    *,
    db: Session = Depends(get_db),
    course_id: int,
    course_in: CourseUpdate,
) -> Any:
    """
    Update a course
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=404,
            detail="The course with this id does not exist in the system",
        )
    
    update_data = course_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(course, field, value)
    
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


# Lessons endpoints
@router.get("/{course_id}/lessons", response_model=List[LessonSchema])
def read_lessons(
    course_id: int,
    db: Session = Depends(get_db),
) -> Any:
    """
    Get lessons for a specific course
    """
    lessons = db.query(Lesson).filter(
        Lesson.course_id == course_id,
        Lesson.is_published == True
    ).order_by(Lesson.order_index).all()
    return lessons


@router.post("/{course_id}/lessons", response_model=LessonSchema)
def create_lesson(
    *,
    db: Session = Depends(get_db),
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
    db.commit()
    db.refresh(lesson)
    return lesson


# Exercises endpoints
@router.get("/lessons/{lesson_id}/exercises", response_model=List[ExerciseSchema])
def read_exercises(
    lesson_id: int,
    db: Session = Depends(get_db),
) -> Any:
    """
    Get exercises for a specific lesson
    """
    exercises = db.query(Exercise).filter(Exercise.lesson_id == lesson_id).all()
    return exercises


@router.post("/lessons/{lesson_id}/exercises", response_model=ExerciseSchema)
def create_exercise(
    *,
    db: Session = Depends(get_db),
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
    db.commit()
    db.refresh(exercise)
    return exercise


# Enrollment endpoints
@router.post("/{course_id}/enroll", response_model=EnrollmentSchema)
def enroll_in_course(
    *,
    db: Session = Depends(get_db),
    course_id: int,
    user_id: int,
) -> Any:
    """
    Enroll a user in a course
    """
    # Check if course exists
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=404,
            detail="The course with this id does not exist in the system",
        )
    
    # Check if already enrolled
    existing_enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == user_id,
        Enrollment.course_id == course_id
    ).first()
    if existing_enrollment:
        raise HTTPException(
            status_code=400,
            detail="User is already enrolled in this course",
        )
    
    enrollment = Enrollment(user_id=user_id, course_id=course_id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment
