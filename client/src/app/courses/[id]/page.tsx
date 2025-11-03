'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Users, Clock, Star, CheckCircle, ArrowLeft } from 'lucide-react';

interface Course {
  id: number;
  title: string;
  description: string;
  instructor_id: number;
  instructor_name: string;
  subject: string;
  level: string;
  duration: string;
  price: number;
  is_published: boolean;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}

interface Enrollment {
  id: number;
  user_id: number;
  course_id: number;
  enrolled_at: string;
  progress: number;
  status: string;
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = useMemo(() => Number(params?.id), [params]);
  const { user, isAuthenticated } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  const isEnrolled = useMemo(() => {
    if (!user) return false;
    return enrollments.some((e) => e.user_id === user.id && e.course_id === courseId);
  }, [enrollments, user, courseId]);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        const [courseRes, enrolRes] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/v1/courses/${courseId}`),
          fetch(`http://127.0.0.1:8000/api/v1/enrollments${user ? `?user_id=${user.id}` : ''}`)
        ]);
        if (courseRes.ok) {
          const c = await courseRes.json();
          if (!cancelled) setCourse(c);
        }
        if (enrolRes.ok) {
          const es = await enrolRes.json();
          if (!cancelled) setEnrollments(es);
        }
      } catch (_) {
        // noop
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [courseId, user]);

  const handleEnroll = async () => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    setIsEnrolling(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/enrollments?user_id=${user.id}&course_id=${courseId}`, {
        method: 'POST'
      });
      if (res.ok) {
        const created = await res.json();
        setEnrollments((prev) => [...prev, created]);
      }
    } catch (_) {
      // noop
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    setIsEnrolling(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/enrollments?user_id=${user.id}&course_id=${courseId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setEnrollments((prev) => prev.filter(e => !(e.user_id === user.id && e.course_id === courseId)));
      }
    } catch (_) {
      // noop
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button onClick={() => router.back()} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-6">
            <ArrowLeft className="h-5 w-5 mr-2" /> Quay lại
          </button>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Khóa học không tồn tại</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => router.back()} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-6">
          <ArrowLeft className="h-5 w-5 mr-2" /> Quay lại
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="h-48 bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
            <BookOpen className="h-16 w-16 text-white" />
          </div>
          <div className="p-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{course.title}</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{course.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center"><Users className="h-4 w-4 mr-2" />Giảng viên: {course.instructor_name}</span>
                  <span className="inline-flex items-center"><Clock className="h-4 w-4 mr-2" />{course.duration}</span>
                  <span className="inline-flex items-center"><Star className="h-4 w-4 mr-2" />Trình độ: {course.level}</span>
                  <span className="inline-flex items-center"><CheckCircle className="h-4 w-4 mr-2" />{course.is_published ? 'Đã xuất bản' : 'Bản nháp'}</span>
                </div>
              </div>
              <div>
                {isEnrolled ? (
                  <button
                    onClick={handleUnenroll}
                    disabled={isEnrolling}
                    className="bg-red-600 text-white px-5 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {isEnrolling ? 'Đang hủy...' : 'Hủy đăng ký'}
                  </button>
                ) : (
                  <button
                    onClick={handleEnroll}
                    disabled={isEnrolling}
                    className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isEnrolling ? 'Đang đăng ký...' : 'Đăng ký khóa học'}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Nội dung khóa học</h2>
                <div className="space-y-3 text-gray-700 dark:text-gray-300">
                  <p>- Giới thiệu tổng quan môn học và mục tiêu</p>
                  <p>- Nội dung theo tuần/bài học (mẫu)</p>
                  <p>- Tài liệu học tập và bài tập</p>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Thông tin</h2>
                <div className="space-y-2 text-gray-700 dark:text-gray-300">
                  <div>Chủ đề: {course.subject}</div>
                  <div>Giá: {course.price > 0 ? `${course.price.toLocaleString()} VNĐ` : 'Miễn phí'}</div>
                  <div>Tạo lúc: {new Date(course.created_at).toLocaleDateString('vi-VN')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


