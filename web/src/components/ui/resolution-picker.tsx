"use client";

import { cn } from "@/lib/utils";

const RESOLUTIONS = [
  { label: "1K", value: "1K", desc: "标清" },
  { label: "2K", value: "2K", desc: "高清" },
  { label: "4K", value: "4K", desc: "超清" },
];

interface ResolutionPickerProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export default function ResolutionPicker({ value, onChange, className, size = "sm" }: ResolutionPickerProps) {
  return (
    <div className={cn("flex gap-1 px-1.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200/60", className)}>
      {RESOLUTIONS.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={cn(
            "rounded text-xs transition-colors",
            size === "sm" ? "px-2 py-1" : "px-3 py-1.5",
            value === r.value
              ? "bg-blue-500 text-white font-medium shadow-sm"
              : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
          )}
          title={r.desc}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
