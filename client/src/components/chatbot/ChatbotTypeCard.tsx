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
  onClick: () => void;
}

export default function ChatbotTypeCard({
  name,
  icon: IconComponent,
  color,
  gradient,
  description,
  isSelected,
  onClick,
}: ChatbotTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        "group relative w-full p-6 md:p-8 bg-white rounded-2xl shadow-sm border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ring-1 cursor-pointer",
        isSelected
          ? "border-[#125093]/60 ring-[#125093]/20 scale-[1.02]"
          : "border-gray-200 ring-gray-100 hover:border-[#125093]/40"
      )}
    >
      {/* Subtle accent background */}
      <div
        className={cn(
          "pointer-events-none absolute -inset-2 bg-gradient-to-br opacity-10 blur-2xl rounded-[1.25rem]",
          gradient
        )}
        aria-hidden="true"
      />
      
      {/* Icon */}
      <div className="flex justify-center mb-4 md:mb-6">
        <div
          className={cn(
            "w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform duration-300",
            color,
            isSelected ? "scale-110" : "group-hover:scale-105"
          )}
        >
          <IconComponent className="w-7 h-7 md:w-8 md:h-8" />
        </div>
      </div>

      {/* Content */}
      <h3
        className={cn(
          "text-xl md:text-2xl font-bold mb-3 text-center poppins-bold transition-colors",
          isSelected ? "text-[#125093]" : "text-gray-900"
        )}
      >
        {name}
      </h3>
      <p className="text-sm md:text-base text-gray-600 text-center leading-relaxed arimo-regular">
        {description}
      </p>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-4 right-4 w-3 h-3 bg-[#125093] rounded-full animate-pulse" />
      )}
    </button>
  );
}

