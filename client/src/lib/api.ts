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

  // Assessments
  ASSESSMENTS: '/api/v1/assessments',
  ASSESSMENT_DETAIL: (id: number) => `/api/v1/assessments/${id}`,
  ASSESSMENT_QUESTIONS: (id: number) => `/api/v1/assessments/${id}/questions`,

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
    status?: number;
  };
  message?: string;
  name?: string;
}

/**
 * Enhanced error handler that provides specific error messages based on error type
 */
export function handleApiError(error: unknown): string {
  // Handle network errors (Failed to fetch, CORS, etc.)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    if (error.message.includes('Failed to fetch')) {
      return 'Lỗi kết nối: Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet hoặc đảm bảo server đang chạy.';
    }
    if (error.message.includes('CORS')) {
      return 'Lỗi CORS: Yêu cầu bị chặn do chính sách bảo mật. Vui lòng liên hệ quản trị viên.';
    }
    return 'Lỗi mạng: Không thể hoàn thành yêu cầu. Vui lòng thử lại sau.';
  }

  // Handle timeout errors
  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('aborted')) {
      return 'Hết thời gian chờ: Server mất quá nhiều thời gian để phản hồi. Vui lòng thử lại.';
    }

    // Check if error has status code attached (from response)
    const errorWithStatus = error as Error & { status?: number };
    if (errorWithStatus.status) {
      return getHttpErrorMessage(errorWithStatus.status, error.message);
    }

    // Handle HTTP status codes from error messages
    const httpStatusMatch = error.message.match(/HTTP (\d+)/);
    if (httpStatusMatch) {
      const statusCode = parseInt(httpStatusMatch[1], 10);
      return getHttpErrorMessage(statusCode, error.message);
    }

    // If error has a detail message from API response (and not a generic HTTP error)
    if (error.message && !error.message.includes('HTTP') && !error.message.includes('Failed to fetch')) {
      return error.message;
    }
  }

  // Handle API error response structure
  const apiError = error as ApiError;
  if (apiError.response?.data?.detail) {
    return apiError.response.data.detail;
  }
  if (apiError.response?.status) {
    return getHttpErrorMessage(apiError.response.status);
  }
  if (apiError.message) {
    return apiError.message;
  }

  return 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.';
}

/**
 * Get user-friendly error message based on HTTP status code
 */
export function getHttpErrorMessage(statusCode: number, fallbackMessage?: string): string {
  switch (statusCode) {
    case 400:
      return 'Yêu cầu không hợp lệ: Dữ liệu cung cấp không đúng. Vui lòng kiểm tra lại thông tin và thử lại.';
    case 401:
      return 'Chưa xác thực: Vui lòng đăng nhập để truy cập tài nguyên này.';
    case 403:
      return 'Không có quyền: Bạn không có quyền thực hiện hành động này.';
    case 404:
      return 'Không tìm thấy: Tài nguyên yêu cầu không tồn tại.';
    case 409:
      return 'Xung đột: Tài nguyên này đã tồn tại. Vui lòng sử dụng giá trị khác.';
    case 422:
      return 'Lỗi xác thực: Dữ liệu cung cấp không hợp lệ. Vui lòng kiểm tra lại thông tin.';
    case 429:
      return 'Quá nhiều yêu cầu: Vui lòng đợi một chút trước khi thử lại.';
    case 500:
      // Check if fallbackMessage contains specific error details
      if (fallbackMessage && !fallbackMessage.includes('HTTP 500')) {
        return fallbackMessage;
      }
      return 'Lỗi server: Đã xảy ra lỗi nội bộ trên server. Vui lòng thử lại sau.';
    case 502:
      return 'Lỗi gateway: Server tạm thời không khả dụng. Vui lòng thử lại sau.';
    case 503:
      return 'Dịch vụ không khả dụng: Server hiện đang không khả dụng. Vui lòng thử lại sau.';
    case 504:
      return 'Hết thời gian gateway: Server mất quá nhiều thời gian để phản hồi. Vui lòng thử lại.';
    default:
      return fallbackMessage || `Lỗi ${statusCode}: Đã xảy ra lỗi khi xử lý yêu cầu của bạn.`;
  }
}

/**
 * Report error to developers
 * This function can be used to send error reports to a logging service or email
 */
export function reportErrorToDev(error: Error, context?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  const errorReport = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    context: context || {},
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Report]', errorReport);
  }

  // In production, you can send to error tracking service (Sentry, LogRocket, etc.)
  // Example: Sentry.captureException(error, { extra: context });

  // For now, store in localStorage for manual collection
  try {
    const existingReports = JSON.parse(localStorage.getItem('error_reports') || '[]');
    existingReports.push(errorReport);
    // Keep only last 10 reports
    const recentReports = existingReports.slice(-10);
    localStorage.setItem('error_reports', JSON.stringify(recentReports));
  } catch (e) {
    console.error('Failed to save error report:', e);
  }
}

/**
 * Get error report link for sharing with developers
 */
export function getErrorReportLink(error: Error, context?: Record<string, unknown>): string {
  const errorInfo = {
    message: error.message,
    name: error.name,
    context: context || {},
    url: typeof window !== 'undefined' ? window.location.href : '',
    timestamp: new Date().toISOString(),
  };

  // Create a mailto link or GitHub issue link
  const subject = encodeURIComponent(`Lỗi: ${error.message}`);
  const body = encodeURIComponent(
    `Mô tả lỗi:\n${error.message}\n\n` +
    `Chi tiết:\n${JSON.stringify(errorInfo, null, 2)}\n\n` +
    `Stack trace:\n${error.stack || 'N/A'}`
  );

  // You can change this to your support email or GitHub issues
  return `mailto:vanbinh@fpt.edu.vn?subject=${subject}&body=${body}`;
}

// Auth fetch function with token from NextAuth
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Import getAccessToken dynamically to avoid SSR issues
  let token: string | null = null;

  if (typeof window !== 'undefined') {
    try {
      const { getAccessToken } = await import('./auth');
      token = (await getAccessToken()) || null;
    } catch {
      // Fallback to localStorage if NextAuth is not available
      token = localStorage.getItem('access_token');
    }
  }

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

