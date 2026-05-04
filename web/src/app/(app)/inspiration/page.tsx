"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Heart,
  Eye,
  Image as ImageIcon,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { inspirationAPI } from "@/lib/api";
import { usePageTitle } from "@/hooks/use-page-title";

interface InspirationItem {
  id: number;
  title: string;
  description: string;
  image_url: string;
  tag: string;
  author: string;
  author_avatar: string;
  likes: number;
  views: number;
  prompt: string;
  model_used: string;
  width: number;
  height: number;
  featured: boolean;
}

export default function InspirationPage() {
  usePageTitle("灵感库");
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState("");
  const [selected, setSelected] = useState<InspirationItem | null>(null);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const pageSize = 24;

  useEffect(() => {
    inspirationAPI.tags().then((res) => setTags(res.data?.data ?? [])).catch(() => {});
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inspirationAPI.list({
        page,
        page_size: pageSize,
        tag: activeTag || undefined,
      });
      setItems(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, activeTag]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [activeTag]);

  const totalPages = Math.ceil(total / pageSize);

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fafafa]">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 bg-white/80 backdrop-blur-sm border-b border-neutral-100/60">
        <div className="flex items-center gap-2.5 mb-3">
          <Sparkles size={18} className="text-amber-500" />
          <h1 className="text-base font-semibold text-neutral-900">灵感库</h1>
          <span className="text-xs text-neutral-400">优秀作品展示</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setActiveTag("")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs transition-all",
              !activeTag ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-500 hover:bg-neutral-100"
            )}
          >
            全部
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs transition-all",
                activeTag === tag ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-500 hover:bg-neutral-100"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-neutral-300 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Sparkles size={36} className="text-neutral-200 mb-3" />
            <p className="text-sm text-neutral-400">暂无灵感作品</p>
            <p className="text-xs text-neutral-300 mt-1">快去资产库发布你的优秀作品吧</p>
          </div>
        ) : (
          <>
            <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 space-y-3">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="break-inside-avoid group relative rounded-xl overflow-hidden bg-white border border-neutral-200/60 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => { setSelected(item); setZoom(1); }}
                >
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[11px] text-white font-medium line-clamp-1">{item.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1">
                        {item.author_avatar ? (
                          <img src={item.author_avatar} className="w-4 h-4 rounded-full" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-white/30" />
                        )}
                        <span className="text-[10px] text-white/80">{item.author || "匿名"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/60 flex items-center gap-0.5"><Heart size={10} /> {item.likes}</span>
                        <span className="text-[10px] text-white/60 flex items-center gap-0.5"><Eye size={10} /> {item.views}</span>
                      </div>
                    </div>
                  </div>
                  {item.featured && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold">
                      精选
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30">
                  <ChevronLeft size={16} className="text-neutral-500" />
                </button>
                <span className="text-xs text-neutral-500">{page} / {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30">
                  <ChevronRight size={16} className="text-neutral-500" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image */}
              <div className="flex-1 bg-neutral-100 flex items-center justify-center p-4 relative min-h-[300px] overflow-hidden">
                <div style={{ transform: `scale(${zoom})`, transition: "transform 0.2s" }}>
                  <img
                    src={selected.image_url}
                    alt=""
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                    draggable={false}
                  />
                </div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm px-2 py-1">
                  <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))} className="p-1 hover:bg-neutral-100 rounded">
                    <ZoomOut size={14} className="text-neutral-600" />
                  </button>
                  <span className="text-[11px] text-neutral-500 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom((z) => Math.min(4, z + 0.25))} className="p-1 hover:bg-neutral-100 rounded">
                    <ZoomIn size={14} className="text-neutral-600" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="w-full md:w-[300px] border-t md:border-t-0 md:border-l border-neutral-100 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    {selected.author_avatar ? (
                      <img src={selected.author_avatar} className="w-7 h-7 rounded-full" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-neutral-200" />
                    )}
                    <div>
                      <p className="text-xs font-medium text-neutral-900">{selected.author || "匿名"}</p>
                      {selected.tag && <span className="text-[10px] text-neutral-400">{selected.tag}</span>}
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="p-1 hover:bg-neutral-100 rounded-lg">
                    <X size={16} className="text-neutral-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-1">{selected.title}</h3>
                    {selected.description && (
                      <p className="text-xs text-neutral-500">{selected.description}</p>
                    )}
                  </div>

                  {selected.prompt && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">提示词</label>
                        <button
                          onClick={() => copyPrompt(selected.prompt)}
                          className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-neutral-600"
                        >
                          <Copy size={10} /> {copied ? "已复制" : "复制"}
                        </button>
                      </div>
                      <p className="text-xs text-neutral-700 leading-relaxed bg-neutral-50 rounded-lg p-2.5">
                        {selected.prompt}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-neutral-50 rounded-lg p-2.5">
                      <label className="block text-[10px] text-neutral-400 mb-0.5">模型</label>
                      <p className="text-xs font-medium text-neutral-700">{selected.model_used || "—"}</p>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-2.5">
                      <label className="block text-[10px] text-neutral-400 mb-0.5">浏览</label>
                      <p className="text-xs font-medium text-neutral-700">{selected.views}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
