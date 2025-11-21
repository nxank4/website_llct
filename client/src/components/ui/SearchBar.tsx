"use client";

import { useEffect, useState } from "react";

import { Command, CommandInput } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = "Tìm kiếm...",
  debounceMs = 300,
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, onSearch]);

  return (
    <Command
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground shadow-sm focus-within:ring-2 focus-within:ring-[hsl(var(--primary))]",
        className
      )}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={placeholder}
        aria-label={placeholder}
        className="text-sm"
      />
    </Command>
  );
}
