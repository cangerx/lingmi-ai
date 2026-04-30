"use client";

import { useState } from "react";
import { FolderOpen, Grid, List, Search, Plus, MoreHorizontal, Clock, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
const TABS = ["全部", "AI 商品图", "AI 海报", "抠图", "其他"];

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeTab, setActiveTab] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FolderOpen size={20} className="text-neutral-400" />
            <h1 className="text-base font-semibold text-neutral-900">我的项目</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索项目..."
                className="w-full pl-8 pr-4 py-1.5 rounded-lg border border-[var(--color-border)] text-sm outline-none focus:border-neutral-400 transition-colors"
              />
            </div>
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-neutral-100">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("p-1.5 rounded-md transition-colors", viewMode === "grid" ? "bg-white shadow-sm" : "text-neutral-400")}
              >
                <Grid size={14} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-white shadow-sm" : "text-neutral-400")}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs transition-colors",
                activeTab === tab ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className={cn(
          viewMode === "grid"
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            : "space-y-2"
        )}>
          {/* New project button */}
          <button className={cn(
            "border-2 border-dashed border-neutral-200 rounded-xl hover:border-neutral-300 transition-colors flex items-center justify-center",
            viewMode === "grid" ? "aspect-square" : "h-16 px-4"
          )}>
            <div className={cn("flex items-center gap-2", viewMode === "grid" ? "flex-col" : "")}>
              <Plus size={20} className="text-neutral-300" />
              <span className="text-sm text-neutral-400">新建项目</span>
            </div>
          </button>

          {/* Empty state */}
          {Array.from({ length: 0 }).length === 0 && (
            <div className={cn(
              "flex items-center justify-center",
              viewMode === "grid" ? "col-span-full py-20" : "py-20"
            )}>
              <div className="text-center">
                <FolderOpen size={40} className="mx-auto text-neutral-200 mb-3" />
                <p className="text-sm text-neutral-400 mb-1">暂无项目</p>
                <p className="text-xs text-neutral-300">使用 AI 工具创作的作品将保存在这里</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
