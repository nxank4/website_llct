'use client';

import { Clock, CheckCircle, XCircle, Award } from 'lucide-react';

interface TestResult {
  id: string;
  assessment_id: string;
  assessment_title: string;
  subject_code?: string;
  subject_name?: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  time_taken: number;
  attempt_number: number;
  completed_at: string;
  grade?: string;
}

interface TestResultCardProps {
  result: TestResult;
  showDetails?: boolean;
  onViewDetails?: () => void;
}

export default function TestResultCard({ result, onViewDetails }: TestResultCardProps) {
  const getPercentageColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeColor = (grade: string) => {
    switch (grade.toLowerCase()) {
      case 'xuất sắc':
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'giỏi':
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'khá':
      case 'fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'trung bình':
      case 'average':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {result.assessment_title}
          </h3>
          {result.subject_name && (
            <p className="text-sm text-gray-600">{result.subject_name}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {result.grade && (
            <span className={`px-2 py-1 rounded-full text-sm font-medium ${getGradeColor(result.grade)}`}>
              {result.grade}
            </span>
          )}
          {result.score >= 60 ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
      </div>

      {/* Score Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className={`text-2xl font-bold ${getPercentageColor(result.score)}`}>
            {result.score.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Điểm số</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {result.correct_answers}/{result.total_questions}
          </div>
          <div className="text-sm text-gray-600">Đúng/Tổng</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {formatTime(result.time_taken)}
          </div>
          <div className="text-sm text-gray-600">Thời gian</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            #{result.attempt_number}
          </div>
          <div className="text-sm text-gray-600">Lần thử</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Kết quả</span>
          <span>{result.correct_answers}/{result.total_questions} câu đúng</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${result.score >= 60 ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${(result.correct_answers / result.total_questions) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Status and Date */}
      <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4" />
          <span>
            Hoàn thành: {new Date(result.completed_at).toLocaleDateString('vi-VN')}
          </span>
        </div>
        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          Đã hoàn thành
        </span>
      </div>

      {/* Summary Stats */}
      <div className="border-t pt-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            <span>{result.score.toFixed(1)} điểm</span>
          </div>
          {result.score >= 60 && (
            <div className="flex items-center justify-center mt-1">
              <Award className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-sm text-yellow-600">Đạt yêu cầu</span>
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {((result.correct_answers / result.total_questions) * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Tỷ lệ đúng</div>
        </div>
      </div>

      {/* View Details Button */}
      {onViewDetails && (
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={onViewDetails}
            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Xem chi tiết
          </button>
        </div>
      )}
    </div>
  );
}