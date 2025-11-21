"use client";

import { Spinner as SpinnerPrimitive } from "./spinner-primitive";
import { cn } from "@/lib/utils";

export type SpinnerSize = "sm" | "md" | "lg" | "xl";

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  text?: string;
  inline?: boolean;
  overlay?: boolean;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
};

export default function Spinner({
  size = "md",
  className,
  text,
  inline = false,
  overlay = false,
}: SpinnerProps) {
  const container = cn(
    inline ? "inline-flex items-center gap-2" : "w-full",
    !inline && "flex flex-col items-center justify-center",
    overlay &&
      "absolute inset-0 z-10 rounded-lg bg-white/80 backdrop-blur-sm dark:bg-background/80",
    className
  );

  return (
    <div
      className={container}
      role="status"
      aria-live="polite"
      aria-label={text || "Đang tải"}
    >
      <SpinnerPrimitive
        className={cn("text-primary", sizeClasses[size] ?? sizeClasses.md)}
      />
      {text && (
        <span
          className={cn("mt-2 text-sm text-muted-foreground", inline && "mt-0")}
        >
          {text}
        </span>
      )}
    </div>
  );
}
