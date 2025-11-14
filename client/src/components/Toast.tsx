"use client";

import { useToast } from "@/contexts/ToastContext";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

export default function Toast() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
      {toasts.map((toast) => {
        const Icon = {
          success: CheckCircle,
          error: AlertCircle,
          warning: AlertTriangle,
          info: Info,
        }[toast.type];

        const bgColor = {
          success: "bg-green-50 border-green-200",
          error: "bg-red-50 border-red-200",
          warning: "bg-yellow-50 border-yellow-200",
          info: "bg-blue-50 border-blue-200",
        }[toast.type];

        const textColor = {
          success: "text-green-800",
          error: "text-red-800",
          warning: "text-yellow-800",
          info: "text-blue-800",
        }[toast.type];

        const iconColor = {
          success: "text-green-500",
          error: "text-red-500",
          warning: "text-yellow-500",
          info: "text-blue-500",
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`${bgColor} border rounded-lg shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-right`}
          >
            <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className={`font-semibold ${textColor} mb-1`}>
                  {toast.title}
                </h4>
              )}
              <p className={`text-sm ${textColor}`}>{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className={`${textColor} hover:opacity-70 transition-opacity flex-shrink-0`}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
