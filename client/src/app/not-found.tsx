"use client";
import Link from 'next/link';
import Image from 'next/image';
import { Home, ArrowLeft, Search, BookOpen } from 'lucide-react';
import { handleImageError } from '@/lib/imageFallback';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 text-foreground">
      <div className="max-w-md w-full text-center">
        <div className="bg-card text-card-foreground rounded-xl shadow-lg border border-border p-8">
          {/* Emoticon Kawaii (text) */}
          <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span aria-label="kawaii face" role="img" className="text-2xl text-blue-500 dark:text-blue-300">(＞﹏＜)</span>
          </div>
          
          {/* Error Code */}
          <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
          
          {/* Error Message */}
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Trang không tìm thấy
          </h2>
          
          <p className="text-muted-foreground mb-8">
            Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
          </p>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center whitespace-nowrap"
            >
              <Home className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>Về trang chủ</span>
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="block w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium flex items-center justify-center whitespace-nowrap"
            >
              <ArrowLeft className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>Quay lại</span>
            </button>
          </div>
          
          {/* Quick Links */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">
              Hoặc thử các liên kết phổ biến:
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/courses"
                className="flex items-center justify-center space-x-2 p-3 bg-muted rounded-lg hover:bg-muted/70 transition-colors text-sm"
              >
                <BookOpen className="h-4 w-4" />
                <span>Khóa học</span>
              </Link>
              
              <Link
                href="/chatbot"
                className="flex items-center justify-center space-x-2 p-3 bg-muted rounded-lg hover:bg-muted/70 transition-colors text-sm"
              >
                <Search className="h-4 w-4" />
                <span>AI Chatbot</span>
              </Link>
            </div>
            {/* Placeholder demo (placehold.co) */}
            <div className="mt-6">
              <Image
                src="https://placehold.co/600x400/000000/FFFFFF/png?text=404+Not+Found"
                alt="Placeholder minh hoạ 404"
                width={600}
                height={400}
                className="rounded-lg border border-border mx-auto"
                priority
                onError={(event) => handleImageError(event, 600, 400, "404")}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Ví dụ: https://placehold.co/600x400/000000/FFFFFF/png?text=404+Not+Found
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}