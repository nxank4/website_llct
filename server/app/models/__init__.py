# Import all models to ensure they are registered with SQLAlchemy
from .user import Profile
from .course import Course, Lesson, Exercise, Enrollment, ExerciseSubmission
from .content import Material, MaterialType
from .assessment import (
    Assessment,
    Question,
    AssessmentAttempt,
    QuestionResponse,
    AssessmentType,
    QuestionType,
)
from .assessment_rating import AssessmentRating
from .news import News, NewsStatus
from .product import Product, ProductType
from .library import LibraryDocument, LibrarySubject, DocumentType, DocumentStatus
from .assessment_result import AssessmentResult
from .notification import Notification, NotificationType
from .gemini_file import GeminiFile, FileSearchStatus

__all__ = [
    # Profile
    "Profile",
    # Course
    "Course",
    "Lesson",
    "Exercise",
    "Enrollment",
    "ExerciseSubmission",
    # Content
    "Material",
    "MaterialType",
    # Assessment
    "Assessment",
    "Question",
    "AssessmentAttempt",
    "QuestionResponse",
    "AssessmentType",
    "QuestionType",
    "AssessmentRating",
    # News
    "News",
    "NewsStatus",
    # Product
    "Product",
    "ProductType",
    # Library
    "LibraryDocument",
    "LibrarySubject",
    "DocumentType",
    "DocumentStatus",
    # Assessment Result
    "AssessmentResult",
    # Notification
    "Notification",
    "NotificationType",
    # Gemini File
    "GeminiFile",
    "FileSearchStatus",
]
