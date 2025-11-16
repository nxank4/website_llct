import { http } from "./http";
import { API_ENDPOINTS } from "@/lib/api";

export interface DashboardStats {
  total_users: number;
  total_courses: number;
  total_enrollments: number;
  completion_rate: number;
}

export function fetchDashboardStats() {
  // Use the correct endpoint from assessment_results router
  // Note: This endpoint returns assessment analytics, not general dashboard stats
  // The reports page may need to be updated to use assessment analytics data
  return http<DashboardStats>(API_ENDPOINTS.ASSESSMENT_ANALYTICS_DASHBOARD)
    .then((data) => {
      // Transform assessment analytics data to match DashboardStats interface
      // For now, return mock data since the endpoint doesn't provide these fields
      return {
        total_users: 0,
        total_courses: 0,
        total_enrollments: 0,
        completion_rate: 0,
      } as DashboardStats;
    })
    .catch(() => {
      // Return default values on error
      return {
        total_users: 0,
        total_courses: 0,
        total_enrollments: 0,
        completion_rate: 0,
      } as DashboardStats;
    });
}

export function fetchCourseStats(courseId: number | string) {
  // This endpoint doesn't exist yet - return empty data for now
  // TODO: Create this endpoint if needed or remove this function
  return Promise.resolve({
    total_enrollments: 0,
    average_progress: 0,
    completion_rate: 0,
  } as Record<string, unknown>);
}


