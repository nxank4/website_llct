import { http } from "./http";

export interface DashboardStats {
  total_users: number;
  total_courses: number;
  total_enrollments: number;
  completion_rate: number;
}

export function fetchDashboardStats() {
  return http<DashboardStats>(`/api/v1/analytics/dashboard`);
}

export function fetchCourseStats(courseId: number | string) {
  return http<Record<string, unknown>>(`/api/v1/analytics/courses/${courseId}`);
}


