"use client";

import { useState } from "react";
import { Lightbulb, Search, Heart, Download, Eye, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const TAGS = ["全部", "电商", "美食", "人像", "建筑", "自然", "科技", "抽象", "插画", "3D"];

interface InspirationItem {
  id: number;
  title: string;
  author: string;
  likes: number;
  views: number;
  height: number;
  gradient: string;
}

const MOCK_ITEMS: InspirationItem[] = Array.from({ length: 24 }).map((_, i) => {
  const gradients = [
    "from-blue-200 to-cyan-100",
    "from-purple-200 to-pink-100",
    "from-amber-200 to-orange-100",
    "from-emerald-200 to-teal-100",
    "from-rose-200 to-red-100",
    "from-indigo-200 to-blue-100",
    "from-yellow-200 to-lime-100",
    "from-fuchsia-200 to-purple-100",
  ];
  const titles = ["电商场景图", "美食摄影", "人像精修", "品牌海报", "产品展示", "节日促销", "社交封面", "艺术插画"];
  const authors = ["灵觅设计师", "设计小白", "创意工坊", "电商达人"];
  return {
    id: i + 1,
    title: titles[i % titles.length],
    author: authors[i % authors.length],
    likes: Math.floor(Math.random() * 500) + 10,
    views: Math.floor(Math.random() * 2000) + 100,
    height: [240, 280, 320, 360, 200, 300][i % 6],
    gradient: gradients[i % gradients.length],
  };
});

export default function InspirationPage() {
  const [activeTag, setActiveTag] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");

  const columns = [0, 1, 2, 3];
  const columnItems = columns.map((col) =>
    MOCK_ITEMS.filter((_, i) => i % 4 === col)
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-white space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center">
              <Lightbulb size={16} className="text-white" />
            </div>
            <h1 className="text-base font-semibold text-neutral-900">灵感库</h1>
          </div>
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索灵感..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--color-border)] text-sm outline-none focus:border-neutral-400 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs transition-colors",
                activeTag === tag
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Masonry grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-4">
          {columnItems.map((items, colIdx) => (
            <div key={colIdx} className="flex-1 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-xl border border-[var(--color-border)] overflow-hidden bg-white hover:shadow-lg transition-all cursor-pointer"
                >
                  {/* Image placeholder */}
                  <div
                    className={cn("w-full bg-gradient-to-br flex items-center justify-center", item.gradient)}
                    style={{ height: item.height }}
                  >
                    <Lightbulb size={24} className="text-white/50" />
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-neutral-900 mb-1">{item.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400">{item.author}</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-neutral-400">
                          <Eye size={12} /> {item.views}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-neutral-400">
                          <Heart size={12} /> {item.likes}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Load more */}
        <div className="text-center py-8">
          <button className="px-6 py-2 rounded-lg border border-[var(--color-border)] text-sm text-neutral-500 hover:bg-neutral-50 transition-colors">
            加载更多
          </button>
        </div>
      </div>
    </div>
  );
}
