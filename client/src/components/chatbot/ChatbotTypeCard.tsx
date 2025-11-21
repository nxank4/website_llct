"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatbotTypeCardProps {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  description: string;
  isSelected: boolean;
  isDarkMode: boolean;
  onClick: () => void;
}

export default function ChatbotTypeCard({
  name,
  icon: IconComponent,
  color,
  gradient,
  description,
  isSelected,
  isDarkMode,
  onClick,
}: ChatbotTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border p-6 md:p-8 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        isDarkMode
          ? "bg-card text-foreground border-border/80 ring-offset-background"
          : "bg-white text-gray-900 border-gray-200 ring-offset-white",
        isSelected
          ? "shadow-[0_20px_45px_rgba(59,130,246,0.25)] ring-[hsl(var(--primary))]"
          : "shadow-sm hover:shadow-lg hover:-translate-y-1"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -inset-3 rounded-[1.5rem] opacity-0 blur-2xl transition-opacity duration-300",
          gradient,
          isSelected
            ? "opacity-60"
            : isDarkMode
            ? "opacity-5 group-hover:opacity-20"
            : "opacity-10 group-hover:opacity-30"
        )}
        aria-hidden="true"
      />

      <div className="relative flex justify-center mb-4 md:mb-6">
        <div
          className={cn(
            "w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center transition-transform duration-300 backdrop-blur",
            isDarkMode
              ? "border border-white/40 text-white shadow-[0_16px_28px_rgba(0,0,0,0.55)] bg-transparent"
              : cn(color, "text-white shadow-[0_20px_35px_rgba(59,130,246,0.25)]"),
            isSelected ? "scale-110" : "group-hover:scale-105"
          )}
        >
          <IconComponent className="w-7 h-7 md:w-8 md:h-8" />
        </div>
      </div>

      <div className="relative">
        <h3
          className={cn(
            "text-xl md:text-2xl font-bold mb-3 text-center poppins-bold transition-colors",
            isSelected
              ? "text-[hsl(var(--primary))]"
              : isDarkMode
              ? "text-foreground"
              : "text-gray-900"
          )}
        >
          {name}
        </h3>
        <p
          className={cn(
            "text-sm md:text-base text-center leading-relaxed arimo-regular transition-colors",
            isDarkMode ? "text-muted-foreground" : "text-gray-600"
          )}
        >
          {description}
        </p>
      </div>

      {isSelected && (
        <div className="absolute top-4 right-4 w-3 h-3 bg-[hsl(var(--primary))] rounded-full animate-pulse" />
      )}
    </button>
  );
}

