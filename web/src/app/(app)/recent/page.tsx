"use client";

import { Clock, Search, Grid, List } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";

export default function RecentPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa]">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-neutral-400" />
            <h1 className="text-base font-semibold text-neutral-900">最近打开</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索..."
                className="w-full pl-8 pr-4 py-1.5 rounded-lg border border-[var(--color-border)] text-sm outline-none focus:border-neutral-400 transition-colors"
              />
            </div>
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-neutral-100">
              <button onClick={() => setViewMode("grid")} className={cn("p-1.5 rounded-md transition-colors", viewMode === "grid" ? "bg-white shadow-sm" : "text-neutral-400")}>
                <Grid size={14} />
              </button>
              <button onClick={() => setViewMode("list")} className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-white shadow-sm" : "text-neutral-400")}>
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <Clock size={40} className="mx-auto text-neutral-200 mb-3" />
            <p className="text-sm text-neutral-400 mb-1">暂无最近打开的项目</p>
            <p className="text-xs text-neutral-300">使用工具创作后会自动记录在这里</p>
          </div>
        </div>
      </div>
    </div>
  );
}
