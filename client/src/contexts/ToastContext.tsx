"use client";

import { ReactNode, createContext, useCallback, useContext, useMemo } from "react";
import { toast as sonnerToast } from "sonner";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastPayload {
  type?: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
  autoClose?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextType {
  showToast: (toast: ToastPayload) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const showToast = useCallback((toastOptions: ToastPayload) => {
    const {
      type = "info",
      title,
      message,
      duration,
      autoClose = true,
      actionLabel,
      onAction,
    } = toastOptions;

    const toastFn =
      {
        success: sonnerToast.success,
        error: sonnerToast.error,
        warning: sonnerToast.warning,
        info: sonnerToast.info,
      }[type] ?? sonnerToast;

    toastFn(title ?? message, {
      description: title ? message : undefined,
      duration: autoClose ? duration : Number.POSITIVE_INFINITY,
      action:
        actionLabel && onAction
          ? {
              label: actionLabel,
              onClick: onAction,
            }
          : undefined,
    });
  }, []);

  const value = useMemo<ToastContextType>(
    () => ({
      showToast,
    }),
    [showToast]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}