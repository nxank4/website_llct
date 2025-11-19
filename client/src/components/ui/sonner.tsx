"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as SonnerToaster, ToasterProps } from "sonner";
import { useThemePreference } from "@/providers/ThemeProvider";

type SonnerComponentProps = ToasterProps;

export function Toaster(props: SonnerComponentProps) {
  const { theme } = useThemePreference();

  return (
    <SonnerToaster
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-50 shadow-xl",
          actionButton:
            "bg-primary text-primary-foreground hover:bg-primary/90",
          cancelButton:
            "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50",
        },
      }}
      richColors
      closeButton
      {...props}
    />
  );
}
