'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit, User, Calendar } from 'lucide-react';

export default function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [article] = useState({
    id: resolvedParams.id,
    title: "Phiên bản mới nhất của SEB đã cập nhập",
    author: "Nguyễn Văn Bình",
    date: "20/00/20xx",
    content: `TOTC is a platform that allows educators to create online classes whereby they can store the course materials online; manage assignments, quizzes and exams; monitor due dates; grade results and provide students with feedback all in one place. TOTC is a platform that allows educators to create online classes whereby they can store the course materials online; manage assignments, quizzes and exams; monitor due dates; grade results and provide students with feedback all in one place.

TOTC is a platform that allows educators to create online classes whereby they can store the course materials online; manage assignments, quizzes and exams; monitor due dates; grade results and provide students with feedback all in one place. TOTC is a platform that allows educators to create online classes whereby they can store the course materials online; manage assignments, quizzes and exams; monitor due dates; grade results and provide students with feedback all in one place.

TOTC is a platform that allows educators to create online classes whereby they can store the course materials online; manage assignments, quizzes and exams; monitor due dates; grade results and provide students with feedback all in one place. TOTC is a platform that allows educators to create online classes whereby they can store the course materials online; manage assignments, quizzes and exams; monitor due dates; grade results and provide students with feedback all in one place.`
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="flex items-center mb-6">
          <Link href="/news" className="flex items-center text-gray-600 hover:text-gray-800 transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span className="text-lg font-semibold">Tin tức</span>
          </Link>
        </div>

        {/* Article */}
        <article className="bg-white">
          {/* Article Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {article.title}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                <span>{article.author}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{article.date}</span>
              </div>
            </div>
          </div>

          {/* Article Image */}
          <div className="mb-8">
            <div className="w-full h-96 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden">
              {/* Laptop Image Placeholder */}
              <div className="w-80 h-48 bg-gray-300 rounded-lg flex items-center justify-center relative">
                <div className="w-full h-full bg-gray-400 rounded-lg flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg mx-auto mb-2"></div>
                    <div className="text-xs">Video Conference</div>
                  </div>
                </div>
              </div>
              {/* Coffee cup */}
              <div className="absolute right-8 top-8 w-12 h-16 bg-white rounded-lg flex items-center justify-center">
                <div className="w-8 h-12 bg-amber-200 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Article Content */}
          <div className="prose prose-lg max-w-none mb-8">
            <div className="text-gray-700 leading-relaxed whitespace-pre-line">
              {article.content}
            </div>
          </div>

          {/* Edit Button */}
          <div className="flex justify-end">
            <button className="bg-blue-100 text-blue-600 px-6 py-2 rounded-lg hover:bg-blue-200 transition-colors flex items-center">
              <Edit className="h-4 w-4 mr-2" />
              Chỉnh sửa
            </button>
          </div>
        </article>
      </main>

      {/* Footer */}
    </div>
  );
}