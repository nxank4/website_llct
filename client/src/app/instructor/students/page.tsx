'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Calendar,
  BookOpen,
  BarChart3,
  MoreVertical,
  Eye,
  MessageSquare
} from 'lucide-react';

interface Student {
  id: number;
  full_name: string;
  email: string;
  username: string;
  enrolled_courses: number;
  completed_courses: number;
  total_progress: number;
  last_activity: string;
  join_date: string;
  avatar_url?: string;
}

export default function InstructorStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProgress, setFilterProgress] = useState('all');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      // Mock data
      const mockStudents: Student[] = [
        {
          id: 1,
          full_name: 'Nguyễn Văn A',
          email: 'nguyenvana@example.com',
          username: 'nguyenvana',
          enrolled_courses: 3,
          completed_courses: 1,
          total_progress: 75,
          last_activity: '2 giờ trước',
          join_date: '2024-01-15',
          avatar_url: undefined
        },
        {
          id: 2,
          full_name: 'Trần Thị B',
          email: 'tranthib@example.com',
          username: 'tranthib',
          enrolled_courses: 2,
          completed_courses: 0,
          total_progress: 45,
          last_activity: '1 ngày trước',
          join_date: '2024-01-20',
          avatar_url: undefined
        },
        {
          id: 3,
          full_name: 'Lê Văn C',
          email: 'levanc@example.com',
          username: 'levanc',
          enrolled_courses: 4,
          completed_courses: 2,
          total_progress: 90,
          last_activity: '30 phút trước',
          join_date: '2024-01-10',
          avatar_url: undefined
        }
      ];
      setStudents(mockStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterProgress === 'all' || 
                         (filterProgress === 'high' && student.total_progress >= 80) ||
                         (filterProgress === 'medium' && student.total_progress >= 50 && student.total_progress < 80) ||
                         (filterProgress === 'low' && student.total_progress < 50);
    return matchesSearch && matchesFilter;
  });

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600 bg-green-100';
    if (progress >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole="instructor">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý sinh viên</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Theo dõi tiến độ học tập của sinh viên</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tổng sinh viên</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{students.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Hoạt động cao</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {students.filter(s => s.total_progress >= 80).length}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Hoàn thành khóa học</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {students.reduce((sum, s) => sum + s.completed_courses, 0)}
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Trung bình tiến độ</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Math.round(students.reduce((sum, s) => sum + s.total_progress, 0) / students.length)}%
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm sinh viên..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-gray-400" />
                  <select
                    value={filterProgress}
                    onChange={(e) => setFilterProgress(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tất cả</option>
                    <option value="high">Tiến độ cao (≥80%)</option>
                    <option value="medium">Tiến độ trung bình (50-79%)</option>
                    <option value="low">Tiến độ thấp (&lt;50%)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Students List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Danh sách sinh viên</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Sinh viên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Khóa học
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tiến độ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Hoạt động cuối
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{student.full_name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {student.enrolled_courses} khóa học
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {student.completed_courses} đã hoàn thành
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${student.total_progress}%` }}
                            ></div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProgressColor(student.total_progress)} dark:bg-opacity-80`}>
                            {student.total_progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {student.last_activity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1">
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 p-1">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredStudents.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Không có sinh viên</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm || filterProgress !== 'all' 
                    ? 'Không tìm thấy sinh viên phù hợp với bộ lọc'
                    : 'Chưa có sinh viên nào đăng ký khóa học của bạn'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
