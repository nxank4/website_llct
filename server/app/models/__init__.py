# Import all models to ensure they are registered with SQLAlchemy
from .user import User
from .course import Course, Lesson, Exercise, Enrollment, ExerciseSubmission
from .content import Material, MaterialEmbedding, Project, ProjectSubmission, Article
from .assessment import Assessment, Question, AssessmentAttempt, QuestionResponse, ItemBank, AssessmentType, QuestionType
from .organization import Domain, Class, Subject, ClassEnrollment, UserRoleAssignment, UserRole
from .news import News, NewsStatus
from .product import Product, ProductType
from .library import LibraryDocument, LibrarySubject, DocumentType, DocumentStatus
from .test_result import TestResult, TestStatistics, StudentProgress
from .assessment_result import AssessmentResult
from .notification import Notification, NotificationType

__all__ = [
    # User
    "User",
    # Course
    "Course",
    "Lesson",
    "Exercise",
    "Enrollment",
    "ExerciseSubmission",
    # Content
    "Material",
    "MaterialEmbedding",
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
    "Subject",
    "ClassEnrollment",
    "UserRoleAssignment",
    "UserRole",
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
]

