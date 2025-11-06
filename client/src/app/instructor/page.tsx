'use client';

import ProtectedRouteWrapper from '@/components/ProtectedRouteWrapper';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BookOpen, 
  Users, 
  FileText, 
  MessageSquare, 
  BarChart3,
  Plus,
  Edit,
  Eye,
  GraduationCap,
  Clock,
  Star
} from 'lucide-react';

export default function InstructorPage() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Khóa học của tôi',
      value: '12',
      change: '+2 mới',
      icon: BookOpen,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      title: 'Sinh viên',
      value: '156',
      change: '+8 mới',
      icon: Users,
      color: 'text-green-600 bg-green-100'
    },
    {
      title: 'Bài tập',
      value: '45',
      change: '+3 mới',
      icon: FileText,
      color: 'text-purple-600 bg-purple-100'
    },
    {
      title: 'Tin nhắn',
      value: '89',
      change: '+12 mới',
      icon: MessageSquare,
      color: 'text-orange-600 bg-orange-100'
    }
  ];

  const myCourses = [
    {
      id: 1,
      title: 'Toán học cơ bản',
      students: 45,
      status: 'active',
      lastActivity: '2 giờ trước',
      progress: 75
    },
    {
      id: 2,
      title: 'Vật lý đại cương',
      students: 32,
      status: 'active',
      lastActivity: '1 ngày trước',
      progress: 60
    },
    {
      id: 3,
      title: 'Hóa học hữu cơ',
      students: 28,
      status: 'draft',
      lastActivity: '3 ngày trước',
      progress: 30
    }
  ];

  const recentStudents = [
    {
      id: 1,
      name: 'Nguyễn Văn A',
      course: 'Toán học cơ bản',
      lastActivity: '5 phút trước',
      progress: 80
    },
    {
      id: 2,
      name: 'Trần Thị B',
      course: 'Vật lý đại cương',
      lastActivity: '15 phút trước',
      progress: 65
    },
    {
      id: 3,
      name: 'Lê Văn C',
      course: 'Toán học cơ bản',
      lastActivity: '1 giờ trước',
      progress: 90
    }
  ];

  const quickActions = [
    {
      title: 'Tạo khóa học mới',
      description: 'Thêm khóa học mới vào hệ thống',
      icon: Plus,
      href: '/instructor/courses/create',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      title: 'Tạo bài tập',
      description: 'Thêm bài tập cho sinh viên',
      icon: FileText,
      href: '/instructor/exercises/create',
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      title: 'Xem báo cáo',
      description: 'Thống kê tiến độ học tập',
      icon: BarChart3,
      href: '/instructor/reports',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      title: 'Quản lý sinh viên',
      description: 'Xem danh sách sinh viên',
      icon: Users,
      href: '/instructor/students',
      color: 'bg-orange-600 hover:bg-orange-700'
    }
  ];

  return (
    <ProtectedRouteWrapper requiredRole="instructor">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bảng điều khiển Giảng viên</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Chào mừng, {user?.full_name}! Quản lý khóa học và sinh viên của bạn
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                      <p className="text-sm text-green-600 dark:text-green-400">{stat.change}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.color} dark:bg-opacity-80`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* My Courses */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Khóa học của tôi</h2>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Tạo mới</span>
                  </button>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {myCourses.map((course) => (
                      <div key={course.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{course.title}</h3>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              course.status === 'active' 
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                                : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                            }`}>
                              {course.status === 'active' ? 'Đang hoạt động' : 'Bản nháp'}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">{course.students} sinh viên</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">{course.lastActivity}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">{course.progress}% hoàn thành</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm">
                            <Eye className="h-4 w-4" />
                            <span>Xem</span>
                          </button>
                          <button className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm">
                            <Edit className="h-4 w-4" />
                            <span>Chỉnh sửa</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Students */}
            <div className="lg:col-span-1 space-y-6">
              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Thao tác nhanh</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {quickActions.map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <a
                          key={index}
                          href={action.href}
                          className={`${action.color} text-white p-3 rounded-lg transition-colors block`}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className="h-5 w-5" />
                            <div>
                              <h3 className="font-medium text-sm">{action.title}</h3>
                              <p className="text-xs opacity-90">{action.description}</p>
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Students */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sinh viên gần đây</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {recentStudents.map((student) => (
                      <div key={student.id} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{student.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{student.course}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{student.lastActivity}</p>
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <span className="text-xs text-gray-600 dark:text-gray-400">{student.progress}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
