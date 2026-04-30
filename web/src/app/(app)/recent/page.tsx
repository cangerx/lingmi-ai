"use client";

import { Clock, Search, Grid, List } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PageHeader, PageContainer, EmptyState } from "@/components/ui/page-shell";

type ViewMode = "grid" | "list";

export default function RecentPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <PageContainer>
      <PageHeader
        title="最近打开"
        icon={<Clock size={16} className="text-neutral-400" />}
        actions={
          <div className="flex items-center gap-3">
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索..."
                className="w-full pl-8 pr-4 py-2 rounded-xl border border-neutral-200/60 bg-white/60 text-sm outline-none focus:border-neutral-300 focus:bg-white focus:shadow-sm transition-all"
              />
            </div>
            <div className="flex gap-0.5 p-0.5 rounded-xl bg-neutral-100/80">
              <button onClick={() => setViewMode("grid")} className={cn("p-1.5 rounded-lg transition-colors", viewMode === "grid" ? "bg-white shadow-sm" : "text-neutral-400")}>
                <Grid size={14} />
              </button>
              <button onClick={() => setViewMode("list")} className={cn("p-1.5 rounded-lg transition-colors", viewMode === "list" ? "bg-white shadow-sm" : "text-neutral-400")}>
                <List size={14} />
              </button>
            </div>
          </div>
        }
      />
      <EmptyState
        icon={<Clock size={24} className="text-neutral-400" />}
        title="暂无最近打开的项目"
        description="使用工具创作后会自动记录在这里"
      />
    </PageContainer>
  );
}
