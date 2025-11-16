"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string | React.ReactNode;
  variant?: "success" | "error" | "warning" | "info";
  confirmText?: string;
}

export default function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  variant = "info",
  confirmText = "Đóng",
}: AlertDialogProps) {
  const variantConfig = {
    success: {
      icon: CheckCircle2,
      iconColor: "text-green-500",
      title: title || "Thành công",
    },
    error: {
      icon: AlertCircle,
      iconColor: "text-red-500",
      title: title || "Lỗi",
    },
    warning: {
      icon: AlertTriangle,
      iconColor: "text-yellow-500",
      title: title || "Cảnh báo",
    },
    info: {
      icon: Info,
      iconColor: "text-blue-500",
      title: title || "Thông báo",
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0`} />
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="pt-2">
              {typeof message === "string" ? (
                <p className="text-gray-700">{message}</p>
              ) : (
                message
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} variant="default">
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

