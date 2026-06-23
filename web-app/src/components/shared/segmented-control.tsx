"use client";

import { FC } from "react";
import { cn } from "@/lib/utils";

interface Option { value: string; label: string; }

interface SegmentedControlProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const SegmentedControl: FC<SegmentedControlProps> = ({ options, value, onChange, className }) => (
  <div className={cn("flex gap-1 p-0.5 bg-zinc-100 rounded-full", className)}>
    {options.map(opt => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={cn(
          "px-3 py-1 text-xs rounded-full transition-all font-medium",
          value === opt.value ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
