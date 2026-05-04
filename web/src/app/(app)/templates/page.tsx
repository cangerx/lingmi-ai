"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, Heart, Eye, Star, ImageOff, ChevronDown, ChevronUp,
  LayoutTemplate, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { inspirationAPI } from "@/lib/api";
import { usePageTitle } from "@/hooks/use-page-title";

/* ═══════════════════════════════════════════════════════
   Filter Configuration (matches reference screenshot)
   ═══════════════════════════════════════════════════════ */
const FILTERS: { label: string; key: string; options: string[]; collapsedCount?: number }[] = [
  {
    label: "分类",
    key: "category",
    options: ["全部", "常规模板", "同款复刻"],
  },
  {
    label: "场景",
    key: "scene",
    options: ["全部", "电商", "社交媒体", "微信营销", "公众号", "行政办公/教育", "生活娱乐", "PPT"],
  },
  {
    label: "用途",
    key: "usage",
    options: ["全部", "营销带货", "交流分享", "祝福问候", "宣传推广", "干货科普", "通知公告", "招聘招募", "个人娱乐", "日月鉴", "公益宣传", "晒照分享", "简介介绍", "邀请函"],
    collapsedCount: 10,
  },
  {
    label: "行业",
    key: "industry",
    options: ["全部", "通用", "餐饮美食", "鞋服箱包", "教育培训", "美发护肤", "休闲娱乐", "美容美业", "生活百货", "旅游出行", "数码家电", "食品生鲜", "母婴亲子", "家居家装"],
    collapsedCount: 10,
  },
];

const SORT_OPTIONS = ["综合排序", "最新上传", "最多下载"];

const PLACEHOLDER_GRADIENTS = [
  "from-blue-200 to-cyan-100", "from-purple-200 to-pink-100",
  "from-amber-200 to-orange-100", "from-emerald-200 to-teal-100",
  "from-rose-200 to-red-100", "from-indigo-200 to-blue-100",
  "from-yellow-200 to-lime-100", "from-fuchsia-200 to-purple-100",
];

type MainTab = "template" | "inspiration";

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
  featured: boolean;
}

const formatNum = (n: number) => {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
};

/* ═══════ Filter Row Component ═══════ */
function FilterRow({ label, options, value, onChange, collapsedCount }: {
  label: string; options: string[]; value: string;
  onChange: (v: string) => void; collapsedCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const showExpand = collapsedCount && options.length > collapsedCount;
  const visibleOptions = showExpand && !expanded ? options.slice(0, collapsedCount) : options;

  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="text-xs text-neutral-400 w-10 shrink-0 pt-1 text-right">{label}：</span>
      <div className="flex flex-wrap items-center gap-1 flex-1">
        {visibleOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              "px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap",
              value === opt
                ? "text-orange-600 font-medium"
                : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            {opt}
          </button>
        ))}
        {showExpand && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-600 flex items-center gap-0.5"
          >
            {expanded ? "收起" : "展开"}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════ Main Page ═══════ */
export default function TemplatesPage() {
  usePageTitle("模板中心");
  const [mainTab, setMainTab] = useState<MainTab>("template");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("综合排序");

  /* filter states */
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    category: "全部", scene: "全部", usage: "全部", industry: "全部",
  });
  const updateFilter = (key: string, val: string) =>
    setFilterValues((prev) => ({ ...prev, [key]: val }));

  /* ── Inspiration state ───────── */
  const [activeTag, setActiveTag] = useState("全部");
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [insLoading, setInsLoading] = useState(false);
  const [insLoadingMore, setInsLoadingMore] = useState(false);
  const [insPage, setInsPage] = useState(1);
  const [insTotal, setInsTotal] = useState(0);
  const [previewItem, setPreviewItem] = useState<InspirationItem | null>(null);

  const fetchInspirations = useCallback(async (p: number, tag: string, append = false) => {
    if (append) setInsLoadingMore(true);
    else setInsLoading(true);
    try {
      const res = await inspirationAPI.list({
        page: p, page_size: 20,
        tag: tag === "全部" ? undefined : tag,
      });
      const data = res.data;
      if (append) setItems((prev) => [...prev, ...(data.data ?? [])]);
      else setItems(data.data ?? []);
      setInsTotal(data.total ?? 0);
    } catch { /* handled */ } finally {
      setInsLoading(false);
      setInsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab === "inspiration") {
      setInsPage(1);
      fetchInspirations(1, activeTag);
    }
  }, [mainTab, activeTag, fetchInspirations]);

  const handleLoadMore = () => {
    const next = insPage + 1;
    setInsPage(next);
    fetchInspirations(next, activeTag, true);
  };

  const insHasMore = items.length < insTotal;
  const colCount = typeof window !== "undefined" && window.innerWidth < 768 ? 2 : 4;
  const insColumns: InspirationItem[][] = Array.from({ length: colCount }, () => []);
  items.forEach((item, i) => insColumns[i % colCount].push(item));

  /* ── Inspiration tags ── */
  const INSPIRATION_TAGS = [
    "全部", "电商", "美食", "人像", "建筑", "自然", "科技", "抽象", "插画", "3D", "海报", "摄影",
  ];

  return (
    <div className="h-full flex flex-col bg-[#fafafa]">
      {/* ═══════ SEARCH BAR ═══════ */}
      <div className="bg-white border-b border-neutral-100 px-5 py-3">
        <div className="flex items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入模板关键词或功能名称"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm outline-none focus:border-orange-300 focus:bg-white focus:shadow-sm transition-all placeholder:text-neutral-400"
            />
          </div>
        </div>
      </div>

      {/* ═══════ TAB SWITCH ═══════ */}
      <div className="bg-white border-b border-neutral-100 px-5">
        <div className="flex items-center">
          <button
            onClick={() => setMainTab("template")}
            className={cn(
              "relative px-5 py-3 text-sm font-medium transition-colors",
              mainTab === "template" ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
            )}
          >
            模板中心
            {mainTab === "template" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-3 right-3 h-[2px] bg-neutral-900 rounded-full"
              />
            )}
          </button>
          <button
            onClick={() => setMainTab("inspiration")}
            className={cn(
              "relative px-5 py-3 text-sm font-medium transition-colors",
              mainTab === "inspiration" ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
            )}
          >
            灵感广场
            {mainTab === "inspiration" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-3 right-3 h-[2px] bg-neutral-900 rounded-full"
              />
            )}
          </button>
        </div>
      </div>

      {/* ═══════ FILTER AREA ═══════ */}
      {mainTab === "template" ? (
        <div className="bg-white border-b border-neutral-100 px-5 py-1">
          {FILTERS.map((f) => (
            <FilterRow
              key={f.key}
              label={f.label}
              options={f.options}
              value={filterValues[f.key] ?? "全部"}
              onChange={(v) => updateFilter(f.key, v)}
              collapsedCount={f.collapsedCount}
            />
          ))}

          {/* Sort bar */}
          <div className="flex items-center justify-between py-2 mt-1 border-t border-neutral-50">
            <div className="flex items-center gap-1">
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs transition-colors",
                    sortBy === s
                      ? "text-orange-600 font-medium bg-orange-50"
                      : "text-neutral-500 hover:text-neutral-800"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {["套组", "颜色", "风格", "版式"].map((f) => (
                <button
                  key={f}
                  className="px-2.5 py-1 rounded border border-neutral-200 text-xs text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 transition-colors flex items-center gap-1"
                >
                  {f} <ChevronDown size={11} />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border-b border-neutral-100 px-5 py-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {INSPIRATION_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all shrink-0",
                  activeTag === tag
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ CONTENT ═══════ */}
      <div className="flex-1 overflow-y-auto">
        {mainTab === "template" ? (
          /* ── Template Grid (placeholder) ── */
          <div className="p-5">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <LayoutTemplate size={40} className="text-neutral-200 mb-4" />
              <p className="text-sm text-neutral-500">模板内容即将上线</p>
              <p className="text-xs text-neutral-400 mt-1.5">海量精美模板正在准备中，敬请期待</p>
            </div>
          </div>
        ) : (
          /* ── Inspiration Masonry ── */
          insLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={24} className="animate-spin text-neutral-300" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
              <ImageOff size={40} className="mb-3 text-neutral-300" />
              <p className="text-sm">暂无作品</p>
              <p className="text-xs mt-1">换个标签试试？</p>
            </div>
          ) : (
            <div className="p-4 md:p-5">
              <div className="flex gap-3 md:gap-4">
                {insColumns.map((colItems, colIdx) => (
                  <div key={colIdx} className="flex-1 space-y-3 md:space-y-4">
                    {colItems.map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                        className="group relative rounded-xl overflow-hidden bg-white border border-neutral-100 hover:shadow-lg hover:shadow-neutral-200/50 hover:border-neutral-200/80 transition-all duration-300 cursor-pointer"
                        onClick={() => setPreviewItem(item)}
                      >
                        {item.image_url ? (
                          <div className="relative overflow-hidden">
                            <img
                              src={item.image_url} alt={item.title}
                              className="w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                              style={{ minHeight: 160 }} loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            {item.featured && (
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500/90 backdrop-blur-sm text-[10px] text-white font-medium flex items-center gap-1">
                                <Star size={10} fill="white" /> 推荐
                              </div>
                            )}
                            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <span className="flex items-center gap-1 text-[11px] text-white/90"><Eye size={12} /> {formatNum(item.views)}</span>
                              <span className="flex items-center gap-1 text-[11px] text-white/90"><Heart size={12} /> {formatNum(item.likes)}</span>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={cn("w-full flex items-center justify-center bg-gradient-to-br", PLACEHOLDER_GRADIENTS[item.id % PLACEHOLDER_GRADIENTS.length])}
                            style={{ height: [200, 240, 280, 320][item.id % 4] }}
                          >
                            <Lightbulb size={24} className="text-white/40" />
                          </div>
                        )}
                        <div className="p-2.5 md:p-3">
                          <h3 className="text-[13px] font-medium text-neutral-800 truncate">{item.title}</h3>
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-1.5">
                              {item.author_avatar ? (
                                <img src={item.author_avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300" />
                              )}
                              <span className="text-[11px] text-neutral-400 truncate max-w-[80px]">{item.author}</span>
                            </div>
                            <span className="flex items-center gap-0.5 text-[10px] text-neutral-300 md:hidden">
                              <Heart size={10} /> {formatNum(item.likes)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="text-center py-8">
                {insHasMore ? (
                  <button
                    onClick={handleLoadMore} disabled={insLoadingMore}
                    className="px-6 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 transition-all disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {insLoadingMore ? <><Loader2 size={14} className="animate-spin" /> 加载中...</> : "加载更多"}
                  </button>
                ) : items.length > 0 ? (
                  <p className="text-xs text-neutral-300">已经到底了</p>
                ) : null}
              </div>
            </div>
          )
        )}
      </div>

      {/* ═══════ PREVIEW MODAL ═══════ */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {previewItem.image_url ? (
                <div className="relative bg-neutral-100 flex-shrink-0">
                  <img src={previewItem.image_url} alt={previewItem.title} className="w-full max-h-[50vh] object-contain" />
                </div>
              ) : (
                <div className={cn("h-48 bg-gradient-to-br flex items-center justify-center", PLACEHOLDER_GRADIENTS[previewItem.id % PLACEHOLDER_GRADIENTS.length])}>
                  <Lightbulb size={32} className="text-white/40" />
                </div>
              )}
              <div className="p-5 overflow-y-auto">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="text-lg font-semibold text-neutral-900">{previewItem.title}</h2>
                  {previewItem.featured && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[11px] font-medium flex items-center gap-1 shrink-0">
                      <Star size={10} fill="currentColor" /> 推荐
                    </span>
                  )}
                </div>
                {previewItem.description && (
                  <p className="text-sm text-neutral-500 mb-4 leading-relaxed">{previewItem.description}</p>
                )}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    {previewItem.author_avatar ? (
                      <img src={previewItem.author_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300" />
                    )}
                    <span className="text-sm text-neutral-600">{previewItem.author}</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-neutral-400"><Eye size={13} /> {formatNum(previewItem.views)}</span>
                  <span className="flex items-center gap-1 text-xs text-neutral-400"><Heart size={13} /> {formatNum(previewItem.likes)}</span>
                </div>
                {previewItem.prompt && (
                  <div className="bg-neutral-50 rounded-xl p-3 mb-3">
                    <p className="text-[11px] text-neutral-400 mb-1 font-medium">Prompt</p>
                    <p className="text-xs text-neutral-600 leading-relaxed">{previewItem.prompt}</p>
                  </div>
                )}
                {previewItem.model_used && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400">模型</span>
                    <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-[11px] text-neutral-600">{previewItem.model_used}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
