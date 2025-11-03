'use client';

import { useState, useEffect } from 'react';
import { API_ENDPOINTS, getFullUrl, authFetch } from '@/lib/api';
import { Users, BookOpen, TrendingUp, Award, Clock, Target, AlertTriangle } from 'lucide-react';

interface InstructorStatsData {
  instructor_id: string;
  total_students: number;
  total_tests: number;
  total_attempts: number;
  average_class_score: number;
  pass_rate: number;
  active_students_today: number;
  active_students_week: number;
  top_performers: Array<{
    user_id: string;
    average_score: number;
    total_attempts: number;
  }>;
  struggling_students: Array<{
    user_id: string;
    average_score: number;
    total_attempts: number;
  }>;
  subject_performance: Array<{
    subject: string;
    average_score: number;
    total_attempts: number;
  }>;
}

interface InstructorStatsProps {
  instructorId?: string;
}

export default function InstructorStats({ instructorId }: InstructorStatsProps) {
  const [statsData, setStatsData] = useState<InstructorStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatsData();
  }, [instructorId]);

  const fetchStatsData = async () => {
    try {
      setLoading(true);
      
      // For instructor stats, we would need to aggregate data from multiple assessments
      // Since we don't have a specific instructor stats API endpoint yet,
      // we'll show empty state until there's actual data
      
      // In a real implementation, this would:
      // 1. Get all assessments created by this instructor
      // 2. Get all results for those assessments  
      // 3. Aggregate the statistics
      
      // For now, show empty state
      setStatsData(null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPassRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-100';
    if (rate >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">
          <h3 className="font-medium">Lỗi tải dữ liệu thống kê</h3>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!statsData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có dữ liệu thống kê</h3>
        <p className="text-gray-600">Chưa có sinh viên nào hoàn thành bài kiểm tra.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Thống kê giảng dạy</h2>
        <button
          onClick={fetchStatsData}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
        >
          Cập nhật
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tổng sinh viên</p>
              <p className="text-3xl font-bold text-gray-900">{statsData.total_students}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tổng bài kiểm tra</p>
              <p className="text-3xl font-bold text-gray-900">{statsData.total_tests}</p>
            </div>
            <BookOpen className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Điểm TB lớp</p>
              <p className={`text-3xl font-bold ${getScoreColor(statsData.average_class_score)}`}>
                {statsData.average_class_score.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tỷ lệ đạt</p>
              <p className={`text-3xl font-bold ${getScoreColor(statsData.pass_rate)}`}>
                {statsData.pass_rate.toFixed(1)}%
              </p>
            </div>
            <Award className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Activity Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hoạt động gần đây</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">{statsData.active_students_today}</div>
            <div className="text-sm text-gray-600">Hoạt động hôm nay</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">{statsData.active_students_week}</div>
            <div className="text-sm text-gray-600">Hoạt động tuần này</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Target className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600">{statsData.total_attempts}</div>
            <div className="text-sm text-gray-600">Tổng lượt làm bài</div>
          </div>
        </div>
      </div>

      {/* Performance Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Award className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Học sinh xuất sắc</h3>
          </div>
          
          {statsData.top_performers.length > 0 ? (
            <div className="space-y-3">
              {statsData.top_performers.map((student, index) => (
                <div key={student.user_id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Sinh viên #{student.user_id}</div>
                      <div className="text-sm text-gray-600">{student.total_attempts} lần làm bài</div>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${getScoreColor(student.average_score)}`}>
                    {student.average_score.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Chưa có dữ liệu</p>
          )}
        </div>

        {/* Struggling Students */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Học sinh cần hỗ trợ</h3>
          </div>
          
          {statsData.struggling_students.length > 0 ? (
            <div className="space-y-3">
              {statsData.struggling_students.map((student, index) => (
                <div key={student.user_id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      !
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Sinh viên #{student.user_id}</div>
                      <div className="text-sm text-gray-600">{student.total_attempts} lần làm bài</div>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${getScoreColor(student.average_score)}`}>
                    {student.average_score.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Không có học sinh nào cần hỗ trợ</p>
          )}
        </div>
      </div>

      {/* Subject Performance */}
      {statsData.subject_performance.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hiệu suất theo môn học</h3>
          <div className="space-y-4">
            {statsData.subject_performance.map((subject, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">{subject.subject}</h4>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">{subject.total_attempts} lượt làm</span>
                    <span className={`text-lg font-bold ${getScoreColor(subject.average_score)}`}>
                      {subject.average_score.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      subject.average_score >= 80 ? 'bg-green-500' :
                      subject.average_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${subject.average_score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pass Rate Analysis */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân tích tỷ lệ đạt</h3>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className={`text-6xl font-bold mb-2 ${getScoreColor(statsData.pass_rate)}`}>
              {statsData.pass_rate.toFixed(1)}%
            </div>
            <div className="text-gray-600 mb-4">Tỷ lệ sinh viên đạt yêu cầu</div>
            <div className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${getPassRateColor(statsData.pass_rate)}`}>
              {statsData.pass_rate >= 80 ? 'Xuất sắc' : 
               statsData.pass_rate >= 60 ? 'Khá' : 'Cần cải thiện'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
