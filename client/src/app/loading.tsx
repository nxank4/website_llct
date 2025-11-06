import { BookOpen } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <div className="w-16 h-16 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <BookOpen className="h-8 w-8 text-white" />
        </div>
        
        {/* Loading Text */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          E-Learning Platform
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Đang tải...
        </p>
        
        {/* Loading Spinner */}
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" aria-label="Đang tải" role="status"></div>
        </div>

        {/* Hint */}
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Vui lòng chờ trong giây lát…</p>
      </div>
    </div>
  );
}