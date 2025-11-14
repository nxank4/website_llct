# Import all models to ensure they are registered with SQLAlchemy
from .user import Profile
from .course import Course, Lesson, Exercise, Enrollment, ExerciseSubmission
from .content import Material, Project, ProjectSubmission, Article, MaterialType
from .assessment import (
    Assessment,
    Question,
    AssessmentAttempt,
    QuestionResponse,
    ItemBank,
    AssessmentType,
    QuestionType,
)
from .organization import (
    Domain,
    Class,
    ClassEnrollment,
)
from .news import News, NewsStatus
from .product import Product, ProductType
from .library import LibraryDocument, LibrarySubject, DocumentType, DocumentStatus
from .test_result import TestResult, TestStatistics, StudentProgress
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
    "Project",
    "ProjectSubmission",
    "Article",
    # Assessment
    "Assessment",
    "Question",
    "AssessmentAttempt",
    "QuestionResponse",
    "ItemBank",
    "AssessmentType",
    "QuestionType",
    # Organization
    "Domain",
    "Class",
    "ClassEnrollment",
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
    # Test Result
    "TestResult",
    "TestStatistics",
    "StudentProgress",
    # Assessment Result
    "AssessmentResult",
    # Notification
    "Notification",
    "NotificationType",
    # Gemini File
    "GeminiFile",
    "FileSearchStatus",
]
