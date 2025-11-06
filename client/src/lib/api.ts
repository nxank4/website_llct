// Centralized API configuration and utilities

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Mock API responses for development
export const MOCK_MODE = false;

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/v1/auth/login',
  REGISTER: '/api/v1/auth/register',
  REFRESH: '/api/v1/auth/refresh',
  USERS: '/api/v1/auth/users',
  USER_DETAIL: (id: string) => `/api/v1/auth/users/${id}`,
  
  // Courses
  COURSES: '/api/v1/courses',
  COURSE_DETAIL: (id: number) => `/api/v1/courses/${id}`,
  
  // Enrollments
  ENROLLMENTS: '/api/v1/enrollments',
  ENROLL: '/api/v1/enrollments',
  UNENROLL: '/api/v1/enrollments',
  
  // Exercises
  EXERCISES: '/api/v1/exercises',
  EXERCISE_DETAIL: (id: number) => `/api/v1/exercises/${id}`,
  START_ATTEMPT: (id: number) => `/api/v1/exercises/${id}/attempts/start`,
  GET_ATTEMPT: (exerciseId: number, attemptId: number) => `/api/v1/exercises/${exerciseId}/attempts/${attemptId}`,
  SUBMIT_ATTEMPT: (exerciseId: number, attemptId: number) => `/api/v1/exercises/${exerciseId}/attempts/${attemptId}/submit`,
  
  // Community
  COMMUNITY_POSTS: '/api/v1/community/posts',
  COMMUNITY_POST_DETAIL: (id: number) => `/api/v1/community/posts/${id}`,
  COMMUNITY_COMMENTS: (postId: number) => `/api/v1/community/posts/${postId}/comments`,
  COMMUNITY_LIKE: (postId: number) => `/api/v1/community/posts/${postId}/like`,
  
  // Chat
  CHAT_SESSIONS: '/api/v1/chat/sessions',
  CHAT_MESSAGES: (sessionId: string) => `/api/v1/chat/sessions/${sessionId}/messages`,
  
  // Assessments (simple, mock in app_simple)
  ASSESSMENTS: '/api/v1/assessments',
  ASSESSMENT_DETAIL: (id: number) => `/api/v1/assessments/${id}`,
  ASSESSMENT_QUESTIONS: (id: number) => `/api/v1/assessments/${id}/questions`,

  // Mongo Assessments (Beanie)
  MONGO_ASSESSMENTS: '/api/v1/mongo/assessments',
  MONGO_ASSESSMENT_DETAIL: (id: string) => `/api/v1/mongo/assessments/${id}`,
  MONGO_ASSESSMENT_QUESTIONS: (id: string) => `/api/v1/mongo/assessments/${id}/questions`,
  MONGO_ASSESSMENT_UPDATE: (id: string) => `/api/v1/mongo/assessments/${id}`,
  MONGO_ASSESSMENT_DELETE: (id: string) => `/api/v1/mongo/assessments/${id}`,
  MONGO_QUESTION_UPDATE: (id: string, index: number) => `/api/v1/mongo/assessments/${id}/questions/${index}`,
  MONGO_QUESTION_DELETE: (id: string, index: number) => `/api/v1/mongo/assessments/${id}/questions/${index}`,

  // Assessment Results
  ASSESSMENT_RESULTS: '/api/v1/results/',
  STUDENT_RESULTS: (studentId: string) => `/api/v1/results/student/${studentId}`,
  ASSESSMENT_RESULTS_BY_ID: (assessmentId: string) => `/api/v1/results/assessment/${assessmentId}`,
  ASSESSMENT_STATISTICS: (assessmentId: string) => `/api/v1/results/statistics/${assessmentId}`,

  // Library & Documents
  LIBRARY_DOCUMENTS: '/api/v1/library/public/documents/',
  LIBRARY_DOCUMENT_UPLOAD: '/api/v1/library/documents/upload',
  LIBRARY_DOCUMENT_DETAIL: (id: string) => `/api/v1/library/documents/${id}`,
  LIBRARY_DOCUMENT_DOWNLOAD: (id: string) => `/api/v1/library/documents/${id}/download`,
  LIBRARY_SUBJECTS: '/api/v1/library/public/subjects/',
  LIBRARY_SUBJECT_DETAIL: (id: string) => `/api/v1/library/subjects/${id}`,
  
  // News
  NEWS: '/api/v1/news/',
  NEWS_BY_ID: (newsId: string) => `/api/v1/news/${newsId}`,
  NEWS_FEATURED: '/api/v1/news/public/featured',
  NEWS_LATEST: '/api/v1/news/public/latest',

  // Products
  PRODUCTS: '/api/v1/products/',
  PRODUCT_BY_ID: (id: string) => `/api/v1/products/${id}`,
  PRODUCT_STATS: '/api/v1/products/stats/summary',
  PRODUCT_VIEW: (id: string) => `/api/v1/products/${id}/view`,
  PRODUCT_DOWNLOAD: (id: string) => `/api/v1/products/${id}/download`,

  // Upload
  UPLOAD: '/api/v1/upload',
  
  // Analytics
  ANALYTICS: '/api/v1/analytics',

  // Test Results (app_simple mock or real API)
  TEST_RESULTS_START: '/api/v1/test-results/start',
  TEST_RESULTS_SUBMIT: (resultId: string) => `/api/v1/test-results/${resultId}/submit`,
  TEST_RESULTS_MY: '/api/v1/test-results/my-results',
  TEST_RESULTS_PROGRESS: '/api/v1/test-results/my-progress',
  TEST_RESULTS_INSTRUCTOR_STATS: '/api/v1/test-results/instructor-stats',
};

export function getFullUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}

interface ApiError {
  response?: {
    data?: {
      detail?: string;
    };
  };
  message?: string;
}

export function handleApiError(error: unknown): string {
  const apiError = error as ApiError;
  if (apiError.response?.data?.detail) {
    return apiError.response.data.detail;
  }
  if (apiError.message) {
    return apiError.message;
  }
  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

// Auth fetch function with token
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

