"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Grid, List, Search, Plus, Loader2, Image as ImageIcon, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { generationAPI } from "@/lib/api";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuthStore } from "@/store/auth";
import { useLoginModalStore } from "@/store/login-modal";
import Link from "next/link";

type ViewMode = "grid" | "list";
const TABS = [
  { key: "", label: "全部" },
  { key: "image", label: "文生图" },
  { key: "product_photo", label: "商品图" },
  { key: "poster", label: "海报" },
  { key: "cutout", label: "抠图" },
];

interface Generation {
  id: number;
  type: string;
  prompt: string;
  result_url: string;
  status: string;
  created_at: string;
}

export default function ProjectsPage() {
  usePageTitle("我的项目");
  const user = useAuthStore((s) => s.user);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeTab, setActiveTab] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await generationAPI.list({
        page: 1,
        page_size: 50,
        type: activeTab || undefined,
        status: "completed",
      });
      setItems(res.data?.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, activeTab]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = items.filter((x) =>
    !searchQuery || (x.prompt && x.prompt.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col bg-[#fafafa]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50 border border-neutral-200/60 flex items-center justify-center">
              <FolderOpen size={16} className="text-neutral-400" />
            </div>
            <h1 className="text-base font-semibold text-neutral-900">我的项目</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索项目..."
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
        </div>

        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs transition-colors",
                activeTab === tab.key ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200/60 flex items-center justify-center mb-4">
              <User size={24} className="text-neutral-400" />
            </div>
            <h3 className="text-sm font-medium text-neutral-600 mb-1">请先登录</h3>
            <p className="text-xs text-neutral-400 max-w-xs mb-4">登录后可查看和管理你的项目</p>
            <button
              onClick={() => useLoginModalStore.getState().openLoginModal()}
              className="px-6 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors shadow-md"
            >
              去登录
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-neutral-300 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen size={36} className="text-neutral-200 mb-3" />
            <p className="text-sm font-medium text-neutral-600 mb-1">暂无项目</p>
            <p className="text-xs text-neutral-400">使用 AI 工具创作后，作品将保存在这里</p>
            <Link href="/generate" className="mt-4 px-5 py-2 rounded-xl bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition-colors flex items-center gap-1.5">
              <Plus size={13} /> 开始创作
            </Link>
          </div>
        ) : (
          <div className={cn(
            viewMode === "grid"
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              : "space-y-2"
          )}>
            <Link href="/generate" className={cn(
              "border-2 border-dashed border-neutral-200/80 rounded-2xl hover:border-neutral-300 hover:bg-white/50 transition-all flex items-center justify-center",
              viewMode === "grid" ? "aspect-square" : "h-16 px-4"
            )}>
              <div className={cn("flex items-center gap-2", viewMode === "grid" ? "flex-col" : "")}>
                <Plus size={20} className="text-neutral-300" />
                <span className="text-sm text-neutral-400">新建项目</span>
              </div>
            </Link>

            {filtered.map((item) => (
              <motion.div key={item.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                <Link href="/assets" className={cn(
                  "group block rounded-2xl overflow-hidden bg-white border border-neutral-200/60 shadow-sm hover:shadow-md transition-all",
                  viewMode === "list" && "flex items-center h-16 px-4 gap-3"
                )}>
                  {viewMode === "grid" ? (
                    <>
                      {item.result_url ? (
                        <img src={item.result_url} alt="" className="w-full aspect-square object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full aspect-square bg-neutral-50 flex items-center justify-center">
                          <ImageIcon size={24} className="text-neutral-200" />
                        </div>
                      )}
                      <div className="p-2.5">
                        <p className="text-[11px] text-neutral-700 line-clamp-1">{item.prompt || "未命名"}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">{new Date(item.created_at).toLocaleDateString("zh-CN")}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      {item.result_url ? (
                        <img src={item.result_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-neutral-50 flex items-center justify-center shrink-0">
                          <ImageIcon size={16} className="text-neutral-200" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-neutral-700 truncate">{item.prompt || "未命名"}</p>
                        <p className="text-[10px] text-neutral-400">{new Date(item.created_at).toLocaleDateString("zh-CN")}</p>
                      </div>
                    </>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
