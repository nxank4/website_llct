'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import ProtectedRouteWrapper from '@/components/ProtectedRouteWrapper';
import Spinner from '@/components/ui/Spinner';
import { API_ENDPOINTS, getFullUrl } from '@/lib/api';
import { useAuthFetch } from '@/lib/auth';

interface Assessment {
  _id?: string;
  title?: string;
  questions?: unknown[];
  time_limit_minutes?: number;
  max_attempts?: number;
  subject_code?: string;
  [key: string]: unknown;
}

export default function ExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const subjectId = resolvedParams.id as string;
  const authFetch = useAuthFetch();
  
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Subject details mapping
  const subjectDetails = {
    'mln111': {
      code: 'MLN111',
      name: 'Triết học Mác - Lê-nin',
      color: '#125093'
    },
    'mln122': {
      code: 'MLN122', 
      name: 'Kinh tế chính trị Mác - Lê-nin',
      color: '#29B9E7'
    },
    'mln131': {
      code: 'MLN131',
      name: 'Chủ nghĩa xã hội khoa học', 
      color: '#49BBBD'
    },
    'hcm202': {
      code: 'HCM202',
      name: 'Tư tưởng Hồ Chí Minh',
      color: '#49BBBD'
    },
    'vnr202': {
      code: 'VNR202',
      name: 'Lịch sử Đảng Cộng sản Việt Nam',
      color: '#5B72EE'
    }
  };

  const subject = subjectDetails[subjectId as keyof typeof subjectDetails] || subjectDetails['mln111'];

  // Load published assessments for this subject
  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const subjectCode = subject.code;
        const res = await authFetch(`${getFullUrl(API_ENDPOINTS.ASSESSMENTS)}?subject_code=${subjectCode}&published_only=true`);
        const data = await res.json();
        const assessmentsList = Array.isArray(data) ? data as Assessment[] : [];
        setAssessments(assessmentsList);
      } catch (e) {
        console.error('Failed to load assessments', e);
        setAssessments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAssessments();
  }, [subject.code, authFetch]);

  return (
    <ProtectedRouteWrapper>
      <div className="min-h-screen bg-[#125093] relative overflow-hidden">
        {/* Background Elements - Responsive */}
        <div className="hidden lg:block absolute w-5 h-5 right-[10%] top-[40%] bg-[#00CBB8] rounded-full opacity-60 animate-pulse"></div>
        <div className="hidden lg:block absolute w-6 h-6 left-[20%] top-[45%] bg-[#29B9E7] rounded-full opacity-60 animate-pulse delay-300"></div>
        <div className="hidden lg:block absolute w-5 h-5 left-[50%] top-[50%] bg-[#8C7AFF] rounded-full opacity-60 animate-pulse delay-700"></div>

        {/* Floating Cards - Responsive */}
        <div className="hidden xl:block absolute w-20 h-20 left-[15%] top-[20%] transform -rotate-12 bg-white/90 shadow-lg rounded-2xl backdrop-blur-sm"></div>
        <div className="hidden xl:block absolute w-16 h-16 right-[10%] top-[18%] transform rotate-12 bg-white/90 shadow-lg rounded-2xl backdrop-blur-sm"></div>

        {/* Hero Section */}
        <div className="relative z-10 pt-24 md:pt-32 pb-12 md:pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#00CBB8] mb-4 md:mb-6 leading-tight poppins-bold">
              Kiểm tra
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white leading-relaxed arimo-regular max-w-3xl mx-auto">
              Kiểm tra và củng cố kiến thức để chuẩn bị cho những bài test sắp tới của bộ môn Kỹ năng mềm tại trường ĐH FPT
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 py-12 md:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Subject Header */}
            <div className="flex items-center justify-center gap-8 md:gap-12 lg:gap-20 mb-12 md:mb-16 lg:mb-20">
              <div className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg">
                <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-white rounded"></div>
              </div>
              <div className="text-gray-900 text-3xl md:text-4xl lg:text-5xl font-bold leading-tight poppins-bold">
                {subject.code}
              </div>
            </div>

            <div className="flex flex-col items-center gap-12 md:gap-16 lg:gap-20">
              {/* Quick Test Section */}
              <div className="w-full max-w-4xl flex flex-col items-center gap-6 md:gap-8">
                <div className="w-full max-w-2xl flex flex-col items-center gap-4 md:gap-6">
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight poppins-bold text-center">
                    Kiểm tra nhanh
                  </h2>
                  <p className="text-lg md:text-xl lg:text-2xl text-gray-600 leading-relaxed text-center arimo-regular max-w-xl">
                    Làm một bài kiểm tra tổng hợp gồm 60 câu được chọn random từ toàn bộ bộ đề
                  </p>
                </div>
                <Link
                  href={`/exercises/${subjectId}/quick-test`}
                  className="w-full max-w-xs px-6 py-4 bg-[#49BBBD] hover:bg-[#3da8aa] rounded-full text-white text-lg md:text-xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 poppins-semibold text-center"
                >
                  Kiểm tra ngay
                </Link>
              </div>

              {/* Tests by Lesson Section */}
              <div className="w-full flex flex-col items-center gap-8 md:gap-12">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight poppins-bold text-center">
                  Kiểm tra theo bài học
                </h2>
                
                <div className="w-full max-w-7xl flex flex-col gap-8 md:gap-12 lg:gap-16">
                  {/* Assessments */}
                  <div className="flex flex-col items-center gap-8 md:gap-12">
                    <h3 className="w-full text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight poppins-bold">
                      Bài kiểm tra
                    </h3>
                    
                    {loading ? (
                      <div className="text-center py-12 w-full">
                        <Spinner size="xl" />
                        <p className="mt-4 text-gray-600 arimo-regular">Đang tải bài kiểm tra...</p>
                      </div>
                    ) : assessments.length === 0 ? (
                      <div className="text-center py-12 w-full">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-gray-900 mb-2 poppins-semibold">Chưa có bài kiểm tra</h3>
                        <p className="text-gray-600 arimo-regular">Môn học này chưa có bài kiểm tra nào được đăng.</p>
                      </div>
                    ) : (
                      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {assessments.map((assessment, index) => {
                          const assessmentId = String(assessment._id ?? index);
                          return (
                          <Link
                            key={assessmentId}
                            href={`/exercises/${subjectId}/attempt?assessmentId=${assessmentId}`}
                            className="group flex flex-col"
                          >
                            {/* Icon */}
                            <div className="pl-6 md:pl-8 flex justify-start items-start">
                              <div className="p-4 md:p-5 bg-[#29B9E7] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                                <FileText className="w-6 h-6 md:w-7 md:h-7 text-white" />
                              </div>
                            </div>
                            
                            {/* Card */}
                            <div className="w-full pt-16 md:pt-20 pb-6 md:pb-8 px-6 md:px-8 lg:px-10 bg-white shadow-lg rounded-xl flex flex-col gap-4 md:gap-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
                              <div className="w-full flex flex-col gap-2 md:gap-3">
                                <h4 className="w-full text-gray-900 text-xl md:text-2xl font-bold leading-tight poppins-bold line-clamp-2">
                                  {String(assessment.title ?? '')}
                                </h4>
                                <div className="w-full flex justify-between items-center gap-4">
                                  <div className="flex-1 text-gray-600 text-sm md:text-base leading-relaxed arimo-regular">
                                    {Array.isArray(assessment.questions) ? assessment.questions.length : 0} câu hỏi
                                  </div>
                                  <div className="flex-1 text-right text-gray-600 text-sm md:text-base leading-relaxed arimo-regular">
                                    {typeof assessment.time_limit_minutes === 'number' ? assessment.time_limit_minutes : 30} phút
                                  </div>
                                </div>
                              </div>
                              <div className="w-full flex justify-center items-center pt-2 border-t border-gray-200">
                                <div className="text-gray-700 text-base md:text-lg font-bold leading-relaxed poppins-semibold">
                                  {typeof assessment.max_attempts === 'number' ? assessment.max_attempts : 1} lần làm
                                </div>
                              </div>
                              <button className="w-full pt-3 pb-3 border-b-2 border-gray-300 flex justify-center items-center hover:border-[#125093] transition-colors duration-300 group-hover:border-[#125093]">
                                <span className="text-gray-700 text-lg md:text-xl font-semibold hover:text-[#125093] transition-colors duration-300 group-hover:text-[#125093] poppins-semibold">
                                  Làm bài
                                </span>
                              </button>
                            </div>
                          </Link>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Pagination */}
                    {assessments.length > 0 && (
                      <div className="w-full max-w-xs flex justify-between items-center gap-4">
                        <button className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                          <ChevronLeft className="w-6 h-6 text-gray-400" />
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="w-10 h-10 rounded-full flex items-center justify-center bg-[#125093] text-white text-lg font-bold poppins-bold">1</span>
                          <span className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 text-lg arimo-regular hover:bg-gray-100 transition-colors duration-300 cursor-pointer">2</span>
                          <span className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 text-lg arimo-regular hover:bg-gray-100 transition-colors duration-300 cursor-pointer">3</span>
                        </div>
                        <button className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors duration-300">
                          <ChevronRight className="w-6 h-6 text-gray-700" />
                        </button>
                      </div>
                    )}
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