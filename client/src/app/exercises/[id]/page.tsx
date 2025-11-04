'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { API_ENDPOINTS, getFullUrl } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function ExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const subjectId = resolvedParams.id as string;
  const { authFetch } = useAuth();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [assessments, setAssessments] = useState<any[]>([]);
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
        const res = await authFetch(`${getFullUrl(API_ENDPOINTS.MONGO_ASSESSMENTS)}?subject_code=${subjectCode}&published_only=true`);
        const data = await res.json();
        setAssessments(Array.isArray(data) ? data : []);
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
    <ProtectedRoute>
      <div className="min-h-screen bg-[#125093] relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute w-[20px] h-[20px] left-[1497.09px] top-[490.54px] bg-[#00CBB8] rounded-full"></div>
        <div className="absolute w-[24px] h-[24px] left-[610px] top-[528.75px] bg-[#29B9E7] rounded-full"></div>
        <div className="absolute w-[20px] h-[20px] left-[1024.50px] top-[586.96px] bg-[#8C7AFF] rounded-full"></div>

        {/* Floating Cards */}
        <div className="absolute w-[85.86px] h-[85.86px] left-[390px] top-[239.83px] transform -rotate-12 bg-white shadow-[0px_14px_44px_rgba(86,91,221,0.10)] rounded-[20px]"></div>
        <div className="absolute w-[62.36px] h-[62.36px] left-[403.96px] top-[248.85px] transform -rotate-12 bg-white shadow-[0px_16px_44px_rgba(13,15,28,0.10)] rounded-[20px]"></div>
        <div className="absolute w-[17.17px] h-[8.59px] left-[419px] top-[260.31px] transform -rotate-12 bg-[#545AE8] rounded-[4px]"></div>
        <div className="absolute w-[17.17px] h-[8.59px] left-[443.88px] top-[280.72px] transform -rotate-12 bg-[#545AE8] rounded-[4px]"></div>
        <div className="absolute w-[17.17px] h-[22.90px] left-[421.28px] top-[270.94px] transform -rotate-12 bg-[#545AE8] rounded-[4px]"></div>
        <div className="absolute w-[17.17px] h-[22.90px] left-[438.58px] top-[256.10px] transform -rotate-12 bg-[#F48C06] rounded-[4px]"></div>

        <div className="absolute w-[85.11px] h-[85.11px] left-[1531.74px] top-[231.08px] transform rotate-[10deg] bg-white shadow-[0px_14px_44px_rgba(86,91,221,0.10)] rounded-[20px]"></div>
        <div className="absolute w-[61.82px] h-[61.82px] left-[1541.21px] top-[244.56px] transform rotate-[10deg] bg-white shadow-[0px_16px_44px_rgba(13,15,28,0.10)] rounded-[20px]"></div>
        <div className="absolute w-[36.73px] h-[29.56px] left-[1550.11px] top-[261.64px] transform rotate-[10deg] overflow-hidden">
          <div className="w-[36.73px] h-[29.56px] left-[5.09px] top-0 absolute transform rotate-[10deg] bg-[#545AE8]"></div>
        </div>

        {/* Hero Section */}
        <div className="relative z-10 pt-32 pb-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-[54px] font-bold text-[#00CBB8] mb-6 leading-[81px]">
              Kiểm tra
            </h1>
            <p className="text-[24px] text-white leading-[38.40px]">
              Kiểm tra và củng cố kiến thức để chuẩn bị cho những bài test sắp tới của bộ môn Kỹ năng mềm tại<br/>
              trường ĐH FPT
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Subject Header */}
            <div className="flex items-center justify-center gap-[85px] mb-20">
              <div className="w-[60px] h-[60px] relative">
                <div className="w-[41.25px] h-[37.50px] left-[9.38px] top-[11.25px] absolute bg-[#010514]"></div>
              </div>
              <div className="text-[#010514] text-[48px] leading-[62.40px]">
                {subject.code}
              </div>
            </div>

            <div className="flex flex-col items-center gap-[100px]">
              {/* Quick Test Section */}
              <div className="w-[1140px] flex flex-col items-center gap-[32px]">
                <div className="w-[832px] flex flex-col items-center gap-[18px]">
                  <h2 className="text-[32px] font-bold text-[#010514] leading-[48px]">
                    Kiểm tra nhanh
                  </h2>
                  <p className="text-[24px] text-[#5B5B5B] leading-[38.40px] text-center">
                    Làm một bài kiểm tra tổng hợp gồm 60 câu được chọn<br/>
                    random từ toàn bộ bộ đề
                  </p>
                </div>
                <button className="w-[270px] px-5 py-5 bg-[#49BBBD] rounded-[80px] text-white text-[22px] font-semibold transition-colors hover:bg-opacity-90" style={{letterSpacing: '0.44px'}}>
                  Kiểm tra ngay
                </button>
              </div>

              {/* Tests by Lesson Section */}
              <div className="w-full flex flex-col items-center gap-[48px]">
                <h2 className="text-[32px] font-bold text-[#010514] leading-[48px]">
                  Kiểm tra theo bài học
                </h2>
                
                <div className="w-[1430px] flex flex-col gap-[64px]">
                  {/* Assessments */}
                  <div className="flex flex-col items-center gap-[48px]">
                    <h3 className="w-full text-[28px] font-bold text-black leading-[36.40px]">
                      Bài kiểm tra
                    </h3>
                    
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Đang tải bài kiểm tra...</p>
                      </div>
                    ) : assessments.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-gray-900 mb-2">Chưa có bài kiểm tra</h3>
                        <p className="text-gray-600">Môn học này chưa có bài kiểm tra nào được đăng.</p>
                      </div>
                    ) : (
                      <div className="w-full flex justify-between items-center flex-wrap gap-6">
                        {assessments.map((assessment) => (
                          <Link
                            key={assessment._id}
                            href={`/exercises/${subjectId}/attempt?assessmentId=${assessment._id}`}
                            className="w-[415px] flex flex-col"
                          >
                            {/* Icon */}
                            <div className="pl-[30px] flex justify-start items-start gap-[10px]">
                              <div className="p-5 bg-[#29B9E7] rounded-[12px] flex justify-start items-start gap-[10px]">
                                <div className="w-[34px] h-[34px] relative overflow-hidden">
                                  <FileText className="w-[28px] h-[28px] text-white" />
                                </div>
                              </div>
                            </div>
                            
                            {/* Card */}
                            <div className="w-full pt-[80px] pb-[32px] px-[50px] bg-white shadow-[4px_4px_15px_#9DA1A6] rounded-[12px] flex flex-col items-end gap-[20px] hover:shadow-lg transition-shadow">
                              <div className="w-full flex flex-col gap-[8px]">
                                <h4 className="w-full text-[#010514] text-[28px] font-bold leading-[36.40px]">
                                  {assessment.title}
                                </h4>
                                <div className="w-full flex justify-center items-center gap-[10px]">
                                  <div className="flex-1 text-[#5B5B5B] text-[14px] leading-[16.80px]">
                                    {assessment.questions?.length || 0} câu hỏi
                                  </div>
                                  <div className="flex-1 text-right text-[#5B5B5B] text-[14px] leading-[16.80px]">
                                    {assessment.time_limit_minutes || 30} phút
                                  </div>
                                </div>
                              </div>
                              <div className="w-full flex justify-center items-center gap-[10px]">
                                <div className="flex-1 text-[#5B5B5B] text-[20px] font-bold leading-[32px]">
                                  {assessment.max_attempts || 1} lần làm
                                </div>
                              </div>
                              <button className="w-[80px] pt-[8px] pb-[8px] border-b border-[#5B5B5B] flex justify-center items-center hover:border-blue-600">
                                <span className="text-[#5B5B5B] text-[22px] hover:text-blue-600">
                                  Làm bài
                                </span>
                              </button>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    
                    {/* Pagination */}
                    <div className="w-[270px] flex justify-between items-center">
                      <button className="w-[50px] h-[50px] px-[19px] py-[11px] rounded-[32px] flex flex-col justify-center items-center gap-[10px]">
                        <ChevronLeft className="w-6 h-6 text-[#AEACAC]" />
                      </button>
                      <span className="text-[#010514] text-[24px] font-bold leading-[38.40px]">1</span>
                      <span className="text-[#010514] text-[24px] leading-[38.40px]">2</span>
                      <span className="text-[#010514] text-[24px] leading-[38.40px]">3</span>
                      <button className="w-[50px] h-[50px] px-[19px] py-[11px] rounded-[37px] flex flex-col justify-center items-center gap-[10px]">
                        <ChevronRight className="w-6 h-6 text-[#010514]" />
                      </button>
                    </div>
                  </div>


                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}