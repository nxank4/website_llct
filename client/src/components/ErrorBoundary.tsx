'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-white bg-gray-800 rounded-xl shadow-lg p-8">
              <div className="w-16 h-16 bg-red-100 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="h-8 w-8 text-red-600 text-red-400" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 text-white mb-4">
                Đã xảy ra lỗi
              </h1>
              
              <p className="text-gray-600 text-gray-400 mb-6">
                Xin lỗi, đã có lỗi xảy ra trong quá trình tải trang. Vui lòng thử lại sau.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-50 bg-red-900 border border-red-200 border-red-700 rounded-lg p-4 mb-6 text-left">
                  <h3 className="text-sm font-medium text-red-800 text-red-200 mb-2">
                    Chi tiết lỗi (Development):
                  </h3>
                  <pre className="text-xs text-red-700 text-red-300 whitespace-pre-wrap">
                    {this.state.error.message}
                  </pre>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center whitespace-nowrap"
                >
                  <RefreshCw className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Tải lại trang</span>
                </button>
                
                <Link
                  href="/"
                  className="flex-1 border border-gray-300 border-gray-600 text-gray-700 text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 hover:bg-gray-700 transition-colors flex items-center justify-center whitespace-nowrap"
                >
                  <Home className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Về trang chủ</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
