'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, Award, BookOpen, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS, getFullUrl } from '@/lib/api';

interface StudentProgressData {
  user_id: string;
  subject_id: string;
  subject_name: string;
  total_tests: number;
  completed_tests: number;
  passed_tests: number;
  average_score: number;
  best_score: number;
  latest_score: number;
  improvement_trend: number;
  total_study_time: number;
  last_attempt?: string;
  weak_topics: string[];
  strong_topics: string[];
}

interface StudentProgressProps {
  userId?: string;
  subjectId?: string;
}

export default function StudentProgress({ userId, subjectId }: StudentProgressProps) {
  const [progressData, setProgressData] = useState<StudentProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, authFetch } = useAuth();

  useEffect(() => {
    fetchProgressData();
  }, [userId, subjectId, user?.id]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      const targetUserId = userId || user?.id;
      if (!targetUserId) {
        setError('User not found');
        return;
      }
      
      // Fetch real data from API
      try {
        const response = await authFetch(getFullUrl(API_ENDPOINTS.STUDENT_RESULTS(targetUserId.toString())));
        if (!response.ok) {
          throw new Error('Failed to fetch student results');
        }
        
        const results = await response.json();
        
        // If no results, show empty state
        if (!results || results.length === 0) {
          setProgressData([]);
          return;
        }
        
        // Aggregate results into progress data
        const subjectMap = new Map<string, any>();
        
        results.forEach((result: any) => {
          const subjectKey = result.subject_code || 'unknown';
          if (!subjectMap.has(subjectKey)) {
            subjectMap.set(subjectKey, {
              user_id: targetUserId.toString(),
              subject_id: subjectKey,
              subject_name: result.subject_name || subjectKey,
              total_tests: 0,
              completed_tests: 0,
              passed_tests: 0,
              scores: [],
              total_study_time: 0,
              last_attempt: null,
              weak_topics: [],
              strong_topics: []
            });
          }
          
          const subject = subjectMap.get(subjectKey);
          subject.completed_tests++;
          subject.scores.push(result.score);
          subject.total_study_time += result.time_taken || 0;
          
          if (result.score >= 60) { // Assuming 60% is passing
            subject.passed_tests++;
          }
          
          if (!subject.last_attempt || new Date(result.completed_at) > new Date(subject.last_attempt)) {
            subject.last_attempt = result.completed_at;
          }
        });
        
        // Convert to final format
        const progressData: StudentProgressData[] = Array.from(subjectMap.values()).map(subject => {
          const scores = subject.scores;
          const average_score = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
          const best_score = Math.max(...scores);
          const latest_score = scores[scores.length - 1];
          
          // Calculate improvement trend (simple: latest vs average of previous)
          let improvement_trend = 0;
          if (scores.length > 1) {
            const previousAvg = scores.slice(0, -1).reduce((a: number, b: number) => a + b, 0) / (scores.length - 1);
            improvement_trend = ((latest_score - previousAvg) / previousAvg) * 100;
          }
          
          return {
            user_id: subject.user_id,
            subject_id: subject.subject_id,
            subject_name: subject.subject_name,
            total_tests: subject.completed_tests, // We only know completed tests from results
            completed_tests: subject.completed_tests,
            passed_tests: subject.passed_tests,
            average_score,
            best_score,
            latest_score,
            improvement_trend,
            total_study_time: Math.round(subject.total_study_time / 60), // Convert to minutes
            last_attempt: subject.last_attempt,
            weak_topics: [], // Would need more analysis to determine
            strong_topics: []
          };
        });
        
        setProgressData(progressData);
      } catch (apiError) {
        console.error('Failed to fetch progress data:', apiError);
        // Show empty state instead of mock data
        setProgressData([]);
      }
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

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-4 gap-4 mb-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="text-center">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
            <div className="h-2 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">
          <h3 className="font-medium">Lỗi tải dữ liệu</h3>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (progressData.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có dữ liệu học tập</h3>
        <p className="text-gray-600">Bạn chưa hoàn thành bài kiểm tra nào. Hãy bắt đầu làm bài để xem tiến độ học tập!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Tiến độ học tập</h2>
        <button
          onClick={fetchProgressData}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
        >
          Cập nhật
        </button>
      </div>

      {progressData.map((progress) => (
        <div key={progress.subject_id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          {/* Subject Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {progress.subject_name}
              </h3>
              {progress.last_attempt && (
                <p className="text-sm text-gray-600">
                  Lần học gần nhất: {new Date(progress.last_attempt).toLocaleDateString('vi-VN')}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {progress.improvement_trend > 0 ? (
                <div className="flex items-center text-green-600">
                  <TrendingUp className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">+{progress.improvement_trend.toFixed(1)}%</span>
                </div>
              ) : progress.improvement_trend < 0 ? (
                <div className="flex items-center text-red-600">
                  <TrendingDown className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">{progress.improvement_trend.toFixed(1)}%</span>
                </div>
              ) : (
                <div className="flex items-center text-gray-600">
                  <span className="text-sm">Ổn định</span>
                </div>
              )}
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg min-w-0">
              <div className={`text-xl sm:text-2xl font-bold ${getScoreColor(progress.average_score)} break-words`}>
                {progress.average_score.toFixed(1)}%
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">Điểm TB</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg min-w-0">
              <div className="text-xl sm:text-2xl font-bold text-green-600 break-words">
                {progress.best_score.toFixed(1)}%
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">Điểm cao nhất</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg min-w-0">
              <div className="text-xl sm:text-2xl font-bold text-purple-600 break-words">
                {progress.completed_tests}/{progress.total_tests}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">Hoàn thành</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg min-w-0">
              <div className="text-xl sm:text-2xl font-bold text-orange-600 break-words">
                {formatStudyTime(progress.total_study_time)}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">Thời gian học</div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-4 mb-6">
            {/* Completion Rate */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Tỷ lệ hoàn thành</span>
                <span>{((progress.completed_tests / progress.total_tests) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getProgressColor((progress.completed_tests / progress.total_tests) * 100)}`}
                  style={{ width: `${(progress.completed_tests / progress.total_tests) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Pass Rate */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Tỷ lệ đạt</span>
                <span>{progress.completed_tests > 0 ? ((progress.passed_tests / progress.completed_tests) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${progress.completed_tests > 0 && (progress.passed_tests / progress.completed_tests) >= 0.6 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${progress.completed_tests > 0 ? (progress.passed_tests / progress.completed_tests) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Latest Score */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Target className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Điểm gần nhất:</span>
              </div>
              <div className={`text-lg font-bold ${getScoreColor(progress.latest_score)}`}>
                {progress.latest_score.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Topics Analysis */}
          {(progress.strong_topics.length > 0 || progress.weak_topics.length > 0) && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Strong Topics */}
              {progress.strong_topics.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2 flex items-center">
                    <Award className="h-4 w-4 mr-2" />
                    Điểm mạnh
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {progress.strong_topics.map((topic, index) => (
                      <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Weak Topics */}
              {progress.weak_topics.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Cần cải thiện
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {progress.weak_topics.map((topic, index) => (
                      <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
