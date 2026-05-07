"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Sparkles,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
  Heart,
  Eye,
  Star,
  ImageOff,
  Lightbulb,
  LayoutTemplate,
  Copy,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { inspirationAPI, templateAPI } from "@/lib/api";
import { usePageTitle } from "@/hooks/use-page-title";

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */
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

interface TemplateItem {
  id: number;
  title: string;
  description: string;
  image_url: string;
  category: string;
  scene: string;
  usage: string;
  industry: string;
  style: string;
  color: string;
  layout: string;
  width: number;
  height: number;
  downloads: number;
  views: number;
  featured: boolean;
  prompt: string;
  prompt_en: string;
  model_used: string;
}

type MainTab = "inspiration" | "template";

/* ═══════════════════════════════════════════════════════
   Template Filter Config
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

const INSPIRATION_TAGS = [
  "全部", "电商", "美食", "人像", "建筑", "自然", "科技", "抽象", "插画", "3D", "海报", "摄影",
];

const PLACEHOLDER_GRADIENTS = [
  "from-blue-200 to-cyan-100", "from-purple-200 to-pink-100",
  "from-amber-200 to-orange-100", "from-emerald-200 to-teal-100",
  "from-rose-200 to-red-100", "from-indigo-200 to-blue-100",
  "from-yellow-200 to-lime-100", "from-fuchsia-200 to-purple-100",
];

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

/* ═══════════════════════════════════════════════════════
   Main Page — Merged Inspiration + Templates
   ═══════════════════════════════════════════════════════ */
export default function InspirationPage() {
  usePageTitle("灵感 & 模板");
  const router = useRouter();
  const [mainTab, setMainTab] = useState<MainTab>("inspiration");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("综合排序");

  /* Template filter states */
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

  /* ── Detail modal state ───────── */
  const [selected, setSelected] = useState<InspirationItem | null>(null);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);

  /* ── Template state ───────── */
  const [tplItems, setTplItems] = useState<TemplateItem[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplPage, setTplPage] = useState(1);
  const [tplTotal, setTplTotal] = useState(0);
  const [tplSelected, setTplSelected] = useState<TemplateItem | null>(null);

  const fetchTemplates = useCallback(async () => {
    setTplLoading(true);
    try {
      const params: Record<string, string | number> = { page: tplPage, page_size: 24 };
      if (filterValues.category !== "全部") params.category = filterValues.category;
      if (filterValues.scene !== "全部") params.scene = filterValues.scene;
      if (filterValues.usage !== "全部") params.usage = filterValues.usage;
      if (filterValues.industry !== "全部") params.industry = filterValues.industry;
      if (searchQuery.trim() && mainTab === "template") params.search = searchQuery.trim();
      const sortMap: Record<string, string> = { "综合排序": "default", "最新上传": "newest", "最多下载": "downloads" };
      params.sort_by = sortMap[sortBy] || "default";
      const res = await templateAPI.list(params as any);
      setTplItems(res.data?.data ?? []);
      setTplTotal(res.data?.total ?? 0);
    } catch {} finally { setTplLoading(false); }
  }, [tplPage, filterValues, sortBy, searchQuery, mainTab]);

  useEffect(() => {
    if (mainTab === "template") { fetchTemplates(); }
  }, [mainTab, fetchTemplates]);

  useEffect(() => { setTplPage(1); }, [filterValues, sortBy]);

  const tplTotalPages = Math.ceil(tplTotal / 24);

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

  const colCount = typeof window !== "undefined" ? (window.innerWidth < 640 ? 2 : window.innerWidth < 768 ? 3 : window.innerWidth < 1024 ? 4 : window.innerWidth < 1280 ? 5 : 6) : 6;
  const insColumns: InspirationItem[][] = Array.from({ length: colCount }, () => []);
  items.forEach((item, i) => insColumns[i % colCount].push(item));

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="h-full flex flex-col bg-[#fafafa] dark:bg-[#0A0A0A]">
      {/* ═══════ SEARCH BAR ═══════ */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 px-5 py-3">
        <div className="flex items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={mainTab === "template" ? "搜索模板关键词" : "搜索灵感作品、风格、标签..."}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none focus:border-orange-300 focus:bg-white dark:focus:bg-neutral-800 focus:shadow-sm transition-all placeholder:text-neutral-400"
            />
          </div>
        </div>
      </div>

      {/* ═══════ TAB SWITCH ═══════ */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 px-5">
        <div className="flex items-center">
          {(["inspiration", "template"] as MainTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className={cn(
                "relative px-5 py-3 text-sm font-medium transition-colors",
                mainTab === tab ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
              )}
            >
              {tab === "inspiration" ? "灵感广场" : "模板中心"}
              {mainTab === tab && (
                <motion.div
                  layoutId="ins-tab-indicator"
                  className="absolute bottom-0 left-3 right-3 h-[2px] bg-neutral-900 dark:bg-neutral-100 rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ FILTER / TAG AREA ═══════ */}
      {mainTab === "template" ? (
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 px-5 py-1">
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
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 px-5 py-2.5">
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
          /* ── Template Grid ── */
          tplLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={24} className="animate-spin text-neutral-300" />
            </div>
          ) : tplItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
              <LayoutTemplate size={40} className="mb-3 text-neutral-300" />
              <p className="text-sm">暂无匹配模板</p>
              <p className="text-xs mt-1">换个筛选条件试试</p>
            </div>
          ) : (
            <div className="p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-neutral-400">共 {tplTotal} 个模板</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {tplItems.map((tpl) => (
                  <motion.div
                    key={tpl.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -3 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="group relative rounded-xl overflow-hidden bg-white border border-neutral-100 hover:shadow-lg hover:border-neutral-200/80 transition-all cursor-pointer"
                    onClick={() => setTplSelected(tpl)}
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={tpl.image_url}
                        alt={tpl.title}
                        className="w-full aspect-[3/4] object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {tpl.featured && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500/90 backdrop-blur-sm text-[10px] text-white font-medium flex items-center gap-1">
                          <Star size={10} fill="white" /> 推荐
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="flex items-center gap-1 text-[11px] text-white/90"><Eye size={11} /> {formatNum(tpl.views)}</span>
                        <span className="flex items-center gap-1 text-[11px] text-white/90"><Download size={11} /> {formatNum(tpl.downloads)}</span>
                      </div>
                    </div>
                    <div className="p-2.5">
                      <h3 className="text-[12px] font-medium text-neutral-800 truncate">{tpl.title}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">{tpl.scene}</span>
                        {tpl.style && <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-50 text-neutral-400">{tpl.style}</span>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {tplTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button onClick={() => setTplPage(Math.max(1, tplPage - 1))} disabled={tplPage <= 1}
                    className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 transition-colors">
                    上一页
                  </button>
                  <span className="text-xs text-neutral-400">{tplPage} / {tplTotalPages}</span>
                  <button onClick={() => setTplPage(Math.min(tplTotalPages, tplPage + 1))} disabled={tplPage >= tplTotalPages}
                    className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 transition-colors">
                    下一页
                  </button>
                </div>
              )}
            </div>
          )
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
              <div className="flex gap-2.5">
                {insColumns.map((colItems, colIdx) => (
                  <div key={colIdx} className="flex-1 space-y-2.5">
                    {colItems.map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                        className="group relative rounded-xl overflow-hidden bg-white border border-neutral-100 hover:shadow-lg hover:shadow-neutral-200/50 hover:border-neutral-200/80 transition-all duration-300 cursor-pointer"
                        onClick={() => { setSelected(item); setZoom(1); }}
                      >
                        {item.image_url ? (
                          <div className="relative overflow-hidden">
                            <img
                              src={item.image_url} alt={item.title}
                              className="w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                              style={{ minHeight: 100, maxHeight: 280 }} loading="lazy"
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

      {/* ═══════ DETAIL MODAL (split layout with zoom) ═══════ */}
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
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {/* Image side */}
              <div className="flex-1 bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center p-4 relative min-h-[300px] overflow-hidden">
                {selected.image_url ? (
                  <div style={{ transform: `scale(${zoom})`, transition: "transform 0.2s" }}>
                    <img
                      src={selected.image_url}
                      alt=""
                      className="max-w-full max-h-[70vh] object-contain rounded-lg"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <div className={cn("w-48 h-48 rounded-2xl bg-gradient-to-br flex items-center justify-center", PLACEHOLDER_GRADIENTS[selected.id % PLACEHOLDER_GRADIENTS.length])}>
                    <Lightbulb size={32} className="text-white/40" />
                  </div>
                )}
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

              {/* Info side */}
              <div className="w-full md:w-[300px] border-t md:border-t-0 md:border-l border-neutral-100 dark:border-neutral-800 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    {selected.author_avatar ? (
                      <img src={selected.author_avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300" />
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
                      <p className="text-xs text-neutral-500 leading-relaxed">{selected.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-xs text-neutral-400"><Eye size={13} /> {formatNum(selected.views)}</span>
                    <span className="flex items-center gap-1 text-xs text-neutral-400"><Heart size={13} /> {formatNum(selected.likes)}</span>
                    {selected.featured && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[11px] font-medium flex items-center gap-1">
                        <Star size={10} fill="currentColor" /> 推荐
                      </span>
                    )}
                  </div>

                  {selected.prompt && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">提示词</label>
                        <button
                          onClick={() => copyPrompt(selected.prompt)}
                          className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-neutral-600 transition-colors"
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
                      <label className="block text-[10px] text-neutral-400 mb-0.5">尺寸</label>
                      <p className="text-xs font-medium text-neutral-700">
                        {selected.width && selected.height ? `${selected.width}×${selected.height}` : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {selected.prompt && (
                  <div className="p-4 border-t border-neutral-100">
                    <button
                      onClick={() => {
                        const p = selected.prompt;
                        if (p) {
                          router.push(`/generate?prompt=${encodeURIComponent(p)}${selected.model_used ? `&model=${encodeURIComponent(selected.model_used)}` : ""}`);
                        }
                      }}
                      className="w-full py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={13} /> 使用提示词生成
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ TEMPLATE DETAIL MODAL ═══════ */}
      <AnimatePresence>
        {tplSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setTplSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col md:flex-row overflow-hidden"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {/* Image */}
              <div className="flex-1 bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center p-4 min-h-[300px] overflow-hidden">
                <img
                  src={tplSelected.image_url}
                  alt={tplSelected.title}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>

              {/* Info */}
              <div className="w-full md:w-[280px] border-t md:border-t-0 md:border-l border-neutral-100 dark:border-neutral-800 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-neutral-100">
                  <h3 className="text-sm font-semibold text-neutral-900 truncate">{tplSelected.title}</h3>
                  <button onClick={() => setTplSelected(null)} className="p-1 hover:bg-neutral-100 rounded-lg shrink-0">
                    <X size={16} className="text-neutral-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {tplSelected.description && (
                    <p className="text-xs text-neutral-500 leading-relaxed">{tplSelected.description}</p>
                  )}

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-neutral-400"><Eye size={13} /> {formatNum(tplSelected.views)}</span>
                    <span className="flex items-center gap-1 text-xs text-neutral-400"><Download size={13} /> {formatNum(tplSelected.downloads)}</span>
                    {tplSelected.featured && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[11px] font-medium flex items-center gap-1">
                        <Star size={10} fill="currentColor" /> 推荐
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-neutral-50 rounded-lg p-2.5">
                      <label className="block text-[10px] text-neutral-400 mb-0.5">场景</label>
                      <p className="text-xs font-medium text-neutral-700">{tplSelected.scene || "—"}</p>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-2.5">
                      <label className="block text-[10px] text-neutral-400 mb-0.5">行业</label>
                      <p className="text-xs font-medium text-neutral-700">{tplSelected.industry || "—"}</p>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-2.5">
                      <label className="block text-[10px] text-neutral-400 mb-0.5">风格</label>
                      <p className="text-xs font-medium text-neutral-700">{tplSelected.style || "—"}</p>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-2.5">
                      <label className="block text-[10px] text-neutral-400 mb-0.5">尺寸</label>
                      <p className="text-xs font-medium text-neutral-700">
                        {tplSelected.width && tplSelected.height ? `${tplSelected.width}×${tplSelected.height}` : "—"}
                      </p>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-2.5">
                      <label className="block text-[10px] text-neutral-400 mb-0.5">用途</label>
                      <p className="text-xs font-medium text-neutral-700">{tplSelected.usage || "—"}</p>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-2.5">
                      <label className="block text-[10px] text-neutral-400 mb-0.5">版式</label>
                      <p className="text-xs font-medium text-neutral-700">{tplSelected.layout || "—"}</p>
                    </div>
                  </div>

                  {/* Prompt Section */}
                  {tplSelected.prompt && (
                    <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-violet-700 flex items-center gap-1">
                          <Sparkles size={12} /> 提示词
                        </label>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(tplSelected.prompt);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white/80 text-violet-600 hover:bg-white transition-colors flex items-center gap-1"
                        >
                          <Copy size={10} /> {copied ? "已复制" : "复制"}
                        </button>
                      </div>
                      <p className="text-[11px] text-neutral-700 leading-relaxed">{tplSelected.prompt}</p>
                    </div>
                  )}

                  {tplSelected.prompt_en && (
                    <div className="bg-neutral-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-neutral-600">English Prompt</label>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(tplSelected.prompt_en);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white/80 text-neutral-500 hover:bg-white transition-colors flex items-center gap-1"
                        >
                          <Copy size={10} /> {copied ? "已复制" : "复制"}
                        </button>
                      </div>
                      <p className="text-[11px] text-neutral-600 leading-relaxed">{tplSelected.prompt_en}</p>
                    </div>
                  )}

                  {tplSelected.model_used && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 font-medium">{tplSelected.model_used}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-500">{tplSelected.category}</span>
                    {tplSelected.color && <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">{tplSelected.color}</span>}
                  </div>
                </div>

                <div className="p-4 border-t border-neutral-100">
                  <button
                    onClick={() => {
                      const p = tplSelected.prompt_en || tplSelected.prompt;
                      if (p) {
                        router.push(`/generate?prompt=${encodeURIComponent(p)}`);
                      } else {
                        router.push("/generate");
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={13} /> 使用此模板
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
