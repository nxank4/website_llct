from fastapi import APIRouter
from .endpoints import (
    users,
    courses,
    auth,
    assessments,
    news,
    products,
    library,
    test_results,
    assessment_results,
    notifications,
    admin,
    lectures,
    ai_files,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(courses.router, prefix="/courses", tags=["courses"])
api_router.include_router(
    assessments.router, prefix="/assessments", tags=["assessments"]
)
api_router.include_router(news.router, prefix="/news", tags=["news"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(library.router, prefix="/library", tags=["library"])
api_router.include_router(test_results.router, prefix="/test-results", tags=["test-results"])
api_router.include_router(assessment_results.router, prefix="/results", tags=["assessment-results"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(lectures.router, prefix="/lectures", tags=["lectures"])
api_router.include_router(ai_files.router, tags=["ai-files"])
