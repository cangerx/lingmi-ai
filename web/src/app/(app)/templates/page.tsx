"use client";

import { useState } from "react";
import { LayoutTemplate, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { name: "全部", count: 2400 },
  { name: "电商主图", count: 560 },
  { name: "社交媒体", count: 480 },
  { name: "海报", count: 320 },
  { name: "公众号封面", count: 280 },
  { name: "小红书", count: 240 },
  { name: "名片", count: 180 },
  { name: "邀请函", count: 120 },
  { name: "PPT", count: 200 },
];

const COLORS = [
  { name: "全部", value: "" },
  { name: "红", value: "bg-red-400" },
  { name: "橙", value: "bg-orange-400" },
  { name: "黄", value: "bg-yellow-400" },
  { name: "绿", value: "bg-green-400" },
  { name: "蓝", value: "bg-blue-400" },
  { name: "紫", value: "bg-purple-400" },
  { name: "黑", value: "bg-neutral-800" },
  { name: "白", value: "bg-white border" },
];

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="h-full flex">
      {/* Left sidebar: categories */}
      <div className="w-[200px] border-r border-neutral-100 bg-white/80 backdrop-blur-sm flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <LayoutTemplate size={18} className="text-neutral-400" />
            <h2 className="text-sm font-semibold text-neutral-900">模板中心</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                activeCategory === cat.name
                  ? "bg-neutral-100 text-neutral-900 font-medium"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
              )}
            >
              <span>{cat.name}</span>
              <span className="text-xs text-neutral-400">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
        {/* Search & filters */}
        <div className="px-6 py-4 border-b border-neutral-100 bg-white/80 backdrop-blur-sm space-y-3">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索模板..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-200/60 bg-white/60 text-sm outline-none focus:border-neutral-300 focus:bg-white focus:shadow-sm transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">颜色:</span>
            {COLORS.map((c) => (
              <button
                key={c.name}
                className={cn("w-6 h-6 rounded-full transition-transform hover:scale-110", c.value || "bg-neutral-100")}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 20 }).map((_, i) => {
              const heights = ["aspect-[3/4]", "aspect-square", "aspect-[4/3]"];
              const h = heights[i % 3];
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200/80 border border-neutral-200/60 overflow-hidden hover:shadow-lg hover:border-neutral-200 transition-all cursor-pointer group",
                    h
                  )}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <LayoutTemplate size={24} className="text-neutral-300 group-hover:text-neutral-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
