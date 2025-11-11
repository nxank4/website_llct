"use client";

import CircularProgress from "@mui/material/CircularProgress";
import { cn } from "@/lib/utils";

export type SpinnerSize = "sm" | "md" | "lg" | "xl";

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  text?: string;
  inline?: boolean;
  overlay?: boolean;
  color?: "primary" | "secondary" | "inherit";
}

function toPx(size: SpinnerSize): number {
  switch (size) {
    case "sm":
      return 16;
    case "md":
      return 24;
    case "lg":
      return 32;
    case "xl":
      return 48;
    default:
      return 24;
  }
}

export default function Spinner({
  size = "md",
  className,
  text,
  inline = false,
  overlay = false,
  color = "primary",
}: SpinnerProps) {
  const container = cn(
    inline ? "inline-flex items-center gap-2" : "w-full",
    !inline && "flex flex-col items-center justify-center",
    overlay && "absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-lg",
    className
  );

  return (
    <div className={container} role="status" aria-label={text || "Đang tải"}>
      <CircularProgress color={color} size={toPx(size)} />
      {text && (
        <span className={cn("mt-2 text-sm text-gray-600", inline && "mt-0")}>
          {text}
        </span>
      )}
    </div>
  );
}


