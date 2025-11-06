'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building, BookOpen, Users, FileText, BarChart3 } from 'lucide-react';
import ProtectedRouteWrapper from '@/components/ProtectedRouteWrapper';

export default function ExercisesPage() {
  const [subjects] = useState([
    {
      id: 'mln111',
      code: 'MLN111',
      name: 'Triết học Mác - Lê-nin',
      icon: BookOpen,
      color: '#125093',
      description: 'Các kỹ năng mềm cơ bản trong công việc'
    },
    {
      id: 'mln122',
      code: 'MLN122',
      name: 'Kinh tế chính trị Mác - Lê-nin',
      icon: Users,
      color: '#29B9E7',
      description: 'Kỹ năng giao tiếp và thuyết trình'
    },
    {
      id: 'mln131',
      code: 'MLN131',
      name: 'Chủ nghĩa xã hội khoa học',
      icon: FileText,
      color: '#49BBBD',
      description: 'Phát triển tư duy logic và phản biện'
    },
    {
      id: 'hcm202',
      code: 'HCM202',
      name: 'Tư tưởng Hồ Chí Minh',
      icon: BarChart3,
      color: '#49BBBD',
      description: 'Kỹ năng lãnh đạo và quản lý nhóm'
    },
    {
      id: 'vnr202',
      code: 'VNR202',
      name: 'Lịch sử Đảng Cộng sản Việt Nam',
      icon: Building,
      color: '#5B72EE',
      description: 'Hiểu biết về văn hóa và môi trường làm việc'
    }
  ]);

  return (
    <ProtectedRouteWrapper>
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

        {/* Subject Selection Section */}
        <div className="relative z-10 py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-[32px] font-bold text-[#010514] mb-4 leading-[48px]">
                Chọn môn học và<br/>
                kiểm tra xem bạn có &quot;pass&quot; hay không nhé!
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {subjects.map((subject) => (
                <Link
                  key={subject.id}
                  href={`/exercises/${subject.id}`}
                  className="group"
                >
                    <div className="w-full h-[220px] rounded-[16.87px] flex flex-col justify-center items-center gap-[23px] shadow-[0px_15.88px_39.71px_rgba(47,50,125,0.10)] transition-transform hover:scale-105"
                         style={{backgroundColor: subject.color}}>
                      <div className="flex flex-col justify-start items-center gap-[23px]">
                        <div className="w-[74px] h-[74px] relative overflow-hidden">
                          <div className="w-[68.75px] h-[58.31px] left-[2.62px] top-[8.46px] absolute bg-white"></div>
                        </div>
                        <div className="text-white text-[48px] leading-[62.40px]">
                          {subject.code}
                        </div>
                      </div>
                    </div>
                  </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </ProtectedRouteWrapper>
  );
}