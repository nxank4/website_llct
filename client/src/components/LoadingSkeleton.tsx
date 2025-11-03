import React from 'react';

interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'text' | 'avatar' | 'button';
  className?: string;
  count?: number;
}

export default function LoadingSkeleton({ 
  type = 'card', 
  className = '', 
  count = 1 
}: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`bg-white bg-gray-800 rounded-xl shadow-lg overflow-hidden animate-pulse ${className}`}>
            <div className="h-48 bg-gray-200 bg-gray-700"></div>
            <div className="p-6">
              <div className="h-4 bg-gray-200 bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 bg-gray-700 rounded mb-4"></div>
              <div className="h-3 bg-gray-200 bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
        );
      
      case 'list':
        return (
          <div className={`bg-white bg-gray-800 rounded-lg p-4 animate-pulse ${className}`}>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="h-4 bg-gray-200 bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 bg-gray-700 rounded w-3/4"></div>
          </div>
        );
      
      case 'avatar':
        return (
          <div className={`w-12 h-12 bg-gray-200 bg-gray-700 rounded-full animate-pulse ${className}`}></div>
        );
      
      case 'button':
        return (
          <div className={`h-10 bg-gray-200 bg-gray-700 rounded-lg animate-pulse ${className}`}></div>
        );
      
      default:
        return (
          <div className={`bg-gray-200 bg-gray-700 rounded animate-pulse ${className}`}></div>
        );
    }
  };

  if (count > 1) {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index}>
            {renderSkeleton()}
          </div>
        ))}
      </div>
    );
  }

  return renderSkeleton();
}