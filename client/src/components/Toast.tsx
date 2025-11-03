'use client';

import { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X, XCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

export default function Toast() {
  const { toasts, removeToast } = useToast();

  useEffect(() => {
    toasts.forEach((toast) => {
      if (toast.autoClose) {
        const timer = setTimeout(() => {
          removeToast(toast.id);
        }, toast.duration || 5000);
        
        return () => clearTimeout(timer);
      }
    });
  }, [toasts, removeToast]);

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getToastStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800 bg-green-900 border-green-700 text-green-200';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800 bg-red-900 border-red-700 text-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 bg-yellow-900 border-yellow-700 text-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800 bg-blue-900 border-blue-700 text-blue-200';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800 bg-gray-900 border-gray-700 text-gray-200';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`max-w-sm w-full border rounded-lg shadow-lg p-4 transition-all duration-300 transform ${
            getToastStyles(toast.type)
          } ${
            toast.visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getToastIcon(toast.type)}
            </div>
            <div className="ml-3 flex-1">
              {toast.title && (
                <h3 className="text-sm font-medium mb-1">
                  {toast.title}
                </h3>
              )}
              <p className="text-sm">
                {toast.message}
              </p>
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={() => removeToast(toast.id)}
                className="inline-flex text-gray-400 hover:text-gray-600 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}