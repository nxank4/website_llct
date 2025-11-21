'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Award, BookOpen, Target } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useStudentResults, StudentTestResult } from '@/hooks/useStudentResults';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

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

interface SubjectProgressData {
  user_id: string;
  subject_id: string;
  subject_name: string;
  total_tests: number;
  completed_tests: number;
  passed_tests: number;
  scores: number[];
  total_study_time: number;
  last_attempt?: string;
  weak_topics: string[];
  strong_topics: string[];
}

interface StudentProgressProps {
  userId?: string;
}

function aggregateProgress(results: StudentTestResult[], targetUserId: string): StudentProgressData[] {
  if (results.length === 0) return [];

        const subjectMap = new Map<string, SubjectProgressData>();
        
  results.forEach((result) => {
          const subjectKey = String(result.subject_code ?? 'unknown');
          if (!subjectMap.has(subjectKey)) {
            subjectMap.set(subjectKey, {
        user_id: targetUserId,
              subject_id: subjectKey,
              subject_name: String(result.subject_name ?? subjectKey),
              total_tests: 0,
              completed_tests: 0,
              passed_tests: 0,
              scores: [],
              total_study_time: 0,
              last_attempt: undefined,
              weak_topics: [],
        strong_topics: [],
            });
          }
          
          const subject = subjectMap.get(subjectKey);
          if (!subject) return;
          
    subject.completed_tests += 1;
          const score = typeof result.score === 'number' ? result.score : 0;
          subject.scores.push(score);
          const timeTaken = typeof result.time_taken === 'number' ? result.time_taken : 0;
          subject.total_study_time += timeTaken;
          
    if (score >= 60) {
      subject.passed_tests += 1;
          }
          
          const completedAt = result.completed_at ? String(result.completed_at) : undefined;
    if (
      completedAt &&
      (!subject.last_attempt || new Date(completedAt) > new Date(subject.last_attempt))
    ) {
            subject.last_attempt = completedAt;
          }
        });
        
  return Array.from(subjectMap.values()).map((subject) => {
          const scores = subject.scores;
    const average_score =
      scores.reduce((a: number, b: number) => a + b, 0) / Math.max(scores.length, 1);
    const best_score = scores.length > 0 ? Math.max(...scores) : 0;
    const latest_score = scores.length > 0 ? scores[scores.length - 1] : 0;
          
          let improvement_trend = 0;
          if (scores.length > 1) {
      const previousAvg =
        scores.slice(0, -1).reduce((a: number, b: number) => a + b, 0) /
        Math.max(scores.length - 1, 1);
      if (previousAvg !== 0) {
            improvement_trend = ((latest_score - previousAvg) / previousAvg) * 100;
      }
          }
          
          return {
            user_id: subject.user_id,
            subject_id: subject.subject_id,
            subject_name: subject.subject_name,
      total_tests: subject.completed_tests,
            completed_tests: subject.completed_tests,
            passed_tests: subject.passed_tests,
            average_score,
            best_score,
            latest_score,
            improvement_trend,
      total_study_time: Math.round(subject.total_study_time / 60),
            last_attempt: subject.last_attempt,
      weak_topics: subject.weak_topics,
      strong_topics: subject.strong_topics,
    } as StudentProgressData;
  });
}

export default function StudentProgress({ userId }: StudentProgressProps) {
  const { data: session } = useSession();
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
  const targetUserId = userId ?? sessionUserId ?? '';
  const { results, loading, error, refresh } = useStudentResults(targetUserId || undefined);

  const progressData = useMemo(() => {
    if (!targetUserId || results.length === 0) return [];
    return aggregateProgress(results, targetUserId);
  }, [results, targetUserId]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-[hsl(var(--success))]';
    if (score >= 80) return 'text-[hsl(var(--info))]';
    if (score >= 70) return 'text-[hsl(var(--warning))]';
    if (score >= 60) return 'text-[hsl(var(--warning))]';
    return 'text-[hsl(var(--destructive))]';
  };

  const getProgressIndicatorColor = (percentage: number) => {
    if (percentage >= 80) return '[&>div]:bg-[hsl(var(--success))]';
    if (percentage >= 60) return '[&>div]:bg-[hsl(var(--info))]';
    if (percentage >= 40) return '[&>div]:bg-[hsl(var(--warning))]';
    return '[&>div]:bg-[hsl(var(--destructive))]';
  };

  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (!targetUserId) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-lg shadow-md border border-border p-6">
            <Skeleton className="h-4 w-1/3 mb-4" />
            <div className="grid grid-cols-4 gap-4 mb-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="text-center space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-2 w-full mb-4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/40 rounded-lg p-4">
        <div className="text-[hsl(var(--destructive))]">
          <h3 className="font-medium">Lỗi tải dữ liệu</h3>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={refresh}
            className="mt-2 inline-flex items-center text-sm text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))]/80"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (progressData.length === 0) {
    return (
      <div className="bg-muted/50 border border-border rounded-lg p-8 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Chưa có dữ liệu học tập</h3>
        <p className="text-muted-foreground">
          Bạn chưa hoàn thành bài kiểm tra nào. Hãy bắt đầu làm bài để xem tiến độ học tập!
        </p>
        <button
          onClick={refresh}
          className="mt-4 inline-flex items-center text-sm text-primary hover:text-primary/80"
        >
          Cập nhật
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Tiến độ học tập</h2>
        <button
          onClick={refresh}
          className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
        >
          Cập nhật
        </button>
      </div>

      {progressData.map((progress) => (
        <div key={progress.subject_id} className="bg-card rounded-lg shadow-md border border-border p-6">
          {/* Subject Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-1">
                {progress.subject_name}
              </h3>
              {progress.last_attempt && (
                <p className="text-sm text-muted-foreground">
                  Lần học gần nhất: {new Date(progress.last_attempt).toLocaleDateString('vi-VN')}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {progress.improvement_trend > 0 ? (
                <div className="flex items-center text-[hsl(var(--success))]">
                  <TrendingUp className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">+{progress.improvement_trend.toFixed(1)}%</span>
                </div>
              ) : progress.improvement_trend < 0 ? (
                <div className="flex items-center text-[hsl(var(--destructive))]">
                  <TrendingDown className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">{progress.improvement_trend.toFixed(1)}%</span>
                </div>
              ) : (
                <div className="flex items-center text-muted-foreground">
                  <span className="text-sm">Ổn định</span>
                </div>
              )}
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-[hsl(var(--info))]/15 rounded-lg min-w-0 border border-[hsl(var(--info))]/30">
              <div className={`text-xl sm:text-2xl font-bold ${getScoreColor(progress.average_score)} break-words`}>
                {progress.average_score.toFixed(1)}%
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Điểm TB</div>
            </div>
            
            <div className="text-center p-4 bg-[hsl(var(--success))]/15 rounded-lg min-w-0 border border-[hsl(var(--success))]/30">
              <div className="text-xl sm:text-2xl font-bold text-[hsl(var(--success))] break-words">
                {progress.best_score.toFixed(1)}%
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Điểm cao nhất</div>
            </div>
            
            <div className="text-center p-4 bg-[hsl(var(--brand-violet))]/15 rounded-lg min-w-0 border border-[hsl(var(--brand-violet))]/30">
              <div className="text-xl sm:text-2xl font-bold text-[hsl(var(--brand-violet))] break-words">
                {progress.completed_tests}/{progress.total_tests}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Hoàn thành</div>
            </div>
            
            <div className="text-center p-4 bg-[hsl(var(--warning))]/15 rounded-lg min-w-0 border border-[hsl(var(--warning))]/30">
              <div className="text-xl sm:text-2xl font-bold text-[hsl(var(--warning))] break-words">
                {formatStudyTime(progress.total_study_time)}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Thời gian học</div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-4 mb-6">
            {/* Completion Rate */}
            <div>
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Tỷ lệ hoàn thành</span>
                <span>{((progress.completed_tests / progress.total_tests) * 100).toFixed(1)}%</span>
              </div>
              <Progress
                value={(progress.completed_tests / progress.total_tests) * 100}
                className={cn(
                  "h-2",
                  getProgressIndicatorColor((progress.completed_tests / progress.total_tests) * 100)
                )}
              />
            </div>

            {/* Pass Rate */}
            <div>
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Tỷ lệ đạt</span>
                <span>{progress.completed_tests > 0 ? ((progress.passed_tests / progress.completed_tests) * 100).toFixed(1) : 0}%</span>
              </div>
              <Progress
                value={progress.completed_tests > 0 ? (progress.passed_tests / progress.completed_tests) * 100 : 0}
                className={cn(
                  "h-2",
                  progress.completed_tests > 0 && (progress.passed_tests / progress.completed_tests) >= 0.6
                    ? "[&>div]:bg-[hsl(var(--success))]"
                    : "[&>div]:bg-[hsl(var(--destructive))]"
                )}
              />
            </div>
          </div>

          {/* Latest Score */}
          <div className="bg-muted/50 rounded-lg p-4 mb-4 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Target className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Điểm gần nhất:</span>
              </div>
              <div className={`text-lg font-bold ${getScoreColor(progress.latest_score)}`}>
                {progress.latest_score.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Topics Analysis */}
          {(progress.strong_topics.length > 0 || progress.weak_topics.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Strong Topics */}
              {progress.strong_topics.length > 0 && (
                <div className="bg-[hsl(var(--success))]/15 rounded-lg p-4 border border-[hsl(var(--success))]/30">
                  <h4 className="font-medium text-[hsl(var(--success))] mb-2 flex items-center">
                    <Award className="h-4 w-4 mr-2" />
                    Điểm mạnh
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {progress.strong_topics.map((topic, index) => (
                      <span key={index} className="px-2 py-1 bg-[hsl(var(--success))]/20 text-[hsl(var(--success))] text-xs rounded-full border border-[hsl(var(--success))]/30">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Weak Topics */}
              {progress.weak_topics.length > 0 && (
                <div className="bg-[hsl(var(--destructive))]/15 rounded-lg p-4 border border-[hsl(var(--destructive))]/30">
                  <h4 className="font-medium text-[hsl(var(--destructive))] mb-2 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Cần cải thiện
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {progress.weak_topics.map((topic, index) => (
                      <span key={index} className="px-2 py-1 bg-[hsl(var(--destructive))]/20 text-[hsl(var(--destructive))] text-xs rounded-full border border-[hsl(var(--destructive))]/30">
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
