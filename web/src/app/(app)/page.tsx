"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Plus,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  FileText,
  Search as SearchIcon,
  Sparkles,
  Eraser,
  Image as ImageIcon,
  Crop,
  CreditCard,
  Video,
  Copy,
  
  LayoutGrid,
  Zap,
  SlidersHorizontal,
  Loader2,
  Download,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { modelAPI, imageAPI, generationAPI, inspirationAPI } from "@/lib/api";
import { downloadImage } from "@/lib/download";
import { useModulesStore } from "@/store/modules";
import Footer from "@/components/footer";
import { usePageTitle } from "@/hooks/use-page-title";
import { useOptimizePrompt } from "@/hooks/use-optimize-prompt";

/* ═══════════════════════════════════════════════════════
   Agent 配置
   ═══════════════════════════════════════════════════════ */
interface DropdownOption { label: string; options: string[] }

interface AgentConfig {
  label: string;
  icon: any;
  color: string;          // border & dot color when active
  borderColor: string;    // tailwind border class
  dropdowns: DropdownOption[];
  placeholder: string;
  cards: { title: string; images: string[] }[];
  moduleKey?: string;
}

const AGENTS: AgentConfig[] = [
  {
    label: "电商商品Agent",
    icon: ShoppingBag,
    color: "#F75A60",
    borderColor: "border-red-400",
    dropdowns: [
      { label: "亚马逊", options: ["亚马逊", "Shopify", "速卖通", "独立站"] },
      { label: "美国", options: ["美国", "日本", "英国", "德国", "法国"] },
      { label: "英语", options: ["英语", "日语", "德语", "法语", "中文"] },
      { label: "1:1", options: ["1:1", "3:4", "4:3", "16:9", "9:16"] },
    ],
    placeholder: "可输入商品信息生成需求（如：帮我生成商品套图，商品更点是复古质感）",
    cards: [
      { title: "亚马逊套图", images: ["/images/ec1.webp"] },
      { title: "白底精修图", images: ["/images/ec2.webp"] },
      { title: "A+ 详情页", images: ["/images/ec3.webp"] },
      { title: "商品换背景", images: ["/images/ec4.webp"] },
    ],
  },
  {
    label: "文生图片Agent",
    icon: ImageIcon,
    color: "#FF8C42",
    borderColor: "border-orange-400",
    dropdowns: [
      { label: "1:1", options: ["1:1", "3:4", "4:3", "9:16", "16:9"] },
    ],
    placeholder: "描述你想生成的图片（如：一只可爱的猫咪坐在窗台上，阳光洒进来，水彩风格）",
    cards: [
      { title: "文字生成图片", images: ["/images/ec1.webp"] },
      { title: "风格转换", images: ["/images/ec2.webp"] },
      { title: "创意插画", images: ["/images/ec3.webp"] },
      { title: "图片编辑", images: ["/images/ec4.webp"] },
    ],
  },
  {
    label: "海报Agent",
    icon: Crop,
    color: "#59CD6D",
    borderColor: "border-green-400",
    dropdowns: [
      { label: "请选择海报类型", options: ["社媒海报", "商品促销", "节日祝福", "宣传海报", "活动海报"] },
      { label: "请选择比例", options: ["1:1", "3:4", "9:16", "16:9", "A4"] },
    ],
    placeholder: "您可以输入更多海报信息，假如时间、地点、卖点折扣等。",
    cards: [
      { title: "社媒海报", images: ["/images/poster1.webp"] },
      { title: "商品促销海报", images: ["/images/poster2.webp"] },
      { title: "节日祝福海报", images: ["/images/poster3.webp"] },
      { title: "商家宣传海报", images: ["/images/poster4.webp"] },
    ],
  },
  {
    label: "视频Agent",
    icon: Video,
    color: "#3382FD",
    borderColor: "border-blue-400",
    moduleKey: "video",
    dropdowns: [
      { label: "请选择比例", options: ["16:9", "9:16", "1:1", "4:3"] },
      { label: "请选择时长", options: ["5秒", "10秒", "15秒", "30秒"] },
    ],
    placeholder: "您可以继续输入与产品相关的详细信息，假如产品亮点、锚定平台、视频语言、销售国家/地区等。",
    cards: [
      { title: "Seedance2.0", images: ["/images/video1.webp"] },
      { title: "商品互动视频", images: ["/images/video2.webp"] },
      { title: "复刻爆款带货视频", images: ["/images/video3.webp"] },
      { title: "卡点变装视频", images: ["/images/video4.webp"] },
    ],
  },
];

/* ── Tool bar section ─────────────────────────────── */
const boxedTools = [
  { label: "图片编辑", desc: "导入图片，自由编辑", href: "/editor", icon: ImageIcon },
  { label: "创建设计", desc: "从空白画布开始设计", href: "/poster", icon: Crop },
];

const gridTools = [
  { label: "商品套图", href: "/product-photo", icon: ShoppingBag, hot: true },
  { label: "A+/详情页", href: "/a-plus", icon: FileText },
  { label: "智能抠图", href: "/cutout", icon: SearchIcon },
  { label: "变清晰", href: "/upscale", icon: Sparkles },
  { label: "AI消除", href: "/eraser", icon: Eraser },
  { label: "证件照", href: "/coming-soon?tool=id-photo", icon: CreditCard },
  { label: "爆款视频", href: "/video", icon: Video },
  { label: "爆款图复刻", href: "/coming-soon?tool=copy-hot", icon: Copy },
  { label: "文生图片", href: "/generate", icon: ImageIcon },
  { label: "更多", href: "/tools", icon: LayoutGrid },
];

/* ── Tabs for second screen ──────────────────────── */
const tabs = ["精选灵感", "热门工具", "商品图", "海报模板"];

const showcaseItems = Array.from({ length: 8 }).map((_, i) => ({
  id: i,
  gradient: [
    "from-blue-200 to-cyan-100",
    "from-pink-200 to-rose-100",
    "from-amber-200 to-yellow-100",
    "from-emerald-200 to-green-100",
    "from-purple-200 to-violet-100",
    "from-red-200 to-orange-100",
    "from-indigo-200 to-blue-100",
    "from-teal-200 to-cyan-100",
  ][i % 8],
}));

/* ── Motion variants ─────────────────────────────── */
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};
const scaleUp = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ═══════════════════════════════════════════════════════
   Dropdown Component
   ═══════════════════════════════════════════════════════ */
function MiniDropdown({ label, options, onChange }: { label: string; options: string[]; onChange?: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(label);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => { setValue(label); }, [label]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-neutral-600 hover:bg-neutral-100 transition-colors whitespace-nowrap"
      >
        {value}
        <ChevronDown size={12} className={cn("text-neutral-400 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-neutral-200 shadow-lg py-1 z-50 min-w-[100px]"
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { setValue(opt); setOpen(false); onChange?.(opt); }}
                className={cn(
                  "block w-full text-left px-3 py-1.5 text-xs transition-colors",
                  value === opt ? "bg-neutral-50 text-neutral-900 font-medium" : "text-neutral-600 hover:bg-neutral-50"
                )}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Ratio Icon — visual box matching the ratio
   ═══════════════════════════════════════════════════════ */
function RatioIcon({ ratio, active }: { ratio: string; active: boolean }) {
  const color = active ? "#ffffff" : "#a3a3a3";
  const dims: Record<string, [number, number]> = {
    "auto": [14, 14], "1:1": [14, 14], "1:2": [9, 18], "2:3": [10, 16],
    "3:4": [11, 15], "4:5": [12, 15], "9:16": [9, 16], "2:1": [18, 9],
    "3:2": [16, 10], "4:3": [15, 11], "5:4": [15, 12], "16:9": [18, 10], "21:9": [20, 8],
  };
  const [w, h] = dims[ratio] || [14, 14];
  return (
    <motion.svg
      width={22} height={22} viewBox="0 0 22 22" fill="none"
      initial={false}
      animate={{ scale: active ? 1.1 : 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <rect
        x={(22 - w) / 2} y={(22 - h) / 2}
        width={w} height={h}
        rx={2}
        stroke={color}
        strokeWidth={1.5}
        fill={active ? "rgba(255,255,255,0.15)" : "none"}
      />
    </motion.svg>
  );
}

/* ═══════════════════════════════════════════════════════
   HomePage
   ═══════════════════════════════════════════════════════ */
interface ImageModelConfig {
  resolutions?: { values: string[]; default: string };
  ratios?: { values: string[]; default: string };
  qualities?: { values: string[]; default: string };
  max_count?: { values: string[]; default: string };
}
interface ImageModelItem {
  name: string;
  display_name: string;
  icon: string;
  description: string;
  badge: string;
  tags: string[];
  vip_only: boolean;
  config: ImageModelConfig;
}

export default function HomePage() {
  usePageTitle("智能创作平台");
  const router = useRouter();
  const [input, setInput] = useState("");
  const [activeAgent, setActiveAgent] = useState(0);
  const [activeTab, setActiveTab] = useState("精选灵感");
  const [showFloat, setShowFloat] = useState(false);
  const [floatInput, setFloatInput] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const { isEnabled, loaded: modulesLoaded, fetchModules } = useModulesStore();

  useEffect(() => {
    if (!modulesLoaded) fetchModules();
  }, [modulesLoaded, fetchModules]);

  // Showcase inspiration data
  const [showcaseData, setShowcaseData] = useState<any[]>([]);
  useEffect(() => {
    inspirationAPI.list({ page: 1, page_size: 12 }).then((res) => {
      setShowcaseData(res.data?.data ?? []);
    }).catch(() => {});
  }, []);

  const visibleAgents = AGENTS.filter((a) => !a.moduleKey || isEnabled(a.moduleKey));
  const agent = visibleAgents[activeAgent] || visibleAgents[0] || AGENTS[0];

  // Image model state
  const [imageModels, setImageModels] = useState<ImageModelItem[]>([]);
  const [selModel, setSelModel] = useState("");
  const [selResolution, setSelResolution] = useState("");
  const [selRatio, setSelRatio] = useState("");
  const [selQuality, setSelQuality] = useState("");
  const [selCount, setSelCount] = useState(1);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    modelAPI.imageModels().then((res) => {
      const data: ImageModelItem[] = res.data?.data ?? [];
      setImageModels(data);
      if (data.length > 0) {
        setSelModel(data[0].name);
        const cfg = data[0].config;
        setSelResolution(cfg.resolutions?.default || "");
        setSelRatio(cfg.ratios?.default || "");
        setSelQuality(cfg.qualities?.default || "");
      }
    }).catch(() => {});
  }, []);

  const curImgModel = imageModels.find((m) => m.name === selModel);
  const imgCfg = curImgModel?.config;

  function onModelChange(name: string) {
    setSelModel(name);
    const m = imageModels.find((x) => x.name === name);
    if (m) {
      setSelResolution(m.config.resolutions?.default || "");
      setSelRatio(m.config.ratios?.default || "");
      setSelQuality(m.config.qualities?.default || "");
    }
  }

  // Close settings popover on click-outside
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Generation modal state
  const [showGenModal, setShowGenModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResults, setGenResults] = useState<any[]>([]);
  const [genPrompt, setGenPrompt] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const pollGeneration = useCallback((genId: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await generationAPI.get(genId);
        const gen = res.data?.data;
        if (gen?.status === "completed" || gen?.status === "failed") {
          setGenResults((prev) => prev.map((r) => (r.id === genId ? gen : r)));
          setGenerating(false);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch { /* ignore */ }
    }, 3000);
  }, []);

  const handleGenerate = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setGenPrompt(text.trim());
    setShowGenModal(true);
    setGenerating(true);
    setGenResults([]);
    try {
      const res = await imageAPI.generate({
        prompt: text.trim(),
        model: selModel || undefined,
        ratio: selRatio || undefined,
        n: selCount,
        quality: selQuality || undefined,
        resolution: selResolution || undefined,
      });
      const gen = res.data?.data;
      setGenResults(Array.isArray(gen) ? gen : [gen]);
      if (gen?.id && gen?.status !== "completed") {
        pollGeneration(gen.id);
      } else {
        setGenerating(false);
      }
    } catch (e) {
      console.error(e);
      setGenerating(false);
    }
  }, [selModel, selRatio, selCount, selQuality, selResolution, pollGeneration]);

  const handleSend = useCallback((text: string) => {
    if (!text.trim()) return;
    const q = encodeURIComponent(text.trim());
    // Smart routing based on active agent
    if (agent.label.includes("电商")) {
      router.push(`/product-photo?prompt=${q}`);
    } else if (agent.label.includes("文生图片")) {
      router.push(`/generate?prompt=${q}&auto=1`);
    } else if (agent.label.includes("海报")) {
      router.push(`/poster?prompt=${q}&auto=1`);
    } else if (agent.label.includes("视频")) {
      router.push(`/video?prompt=${q}&auto=1`);
    } else {
      handleGenerate(text);
    }
  }, [router, agent, handleGenerate]);

  const { optimizing, optimize: handleOptimizePrompt } = useOptimizePrompt();

  useEffect(() => {
    const container = document.querySelector('[data-scroll-root]');
    if (!container) return;
    const onScroll = () => {
      if (chatRef.current) {
        const rect = chatRef.current.getBoundingClientRect();
        setShowFloat(rect.bottom < 0);
      }
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div data-scroll-root className="flex-1 flex flex-col h-full overflow-y-auto bg-[#fafafa] relative">
      {/* ═══════ FIRST SCREEN ═══════ */}
      <section className="pt-[100px] pb-8 px-6 relative">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-gradient-to-br from-blue-200/35 to-cyan-200/20 rounded-full blur-3xl" />
          <div className="absolute top-[5%] right-[-5%] w-[450px] h-[450px] bg-gradient-to-br from-purple-200/30 to-violet-200/15 rounded-full blur-3xl" />
          <div className="absolute bottom-[10%] left-[30%] w-[350px] h-[350px] bg-gradient-to-br from-pink-200/20 to-orange-200/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Title */}
          <h1 className="text-3xl font-bold text-neutral-900 mb-6 tracking-tight">
            和我聊聊，你想要什么设计~
          </h1>

          {/* Agent tags */}
          <div className="flex items-center justify-center gap-2 mb-7">
            {visibleAgents.map((a, i) => (
              <motion.button
                key={a.label}
                onClick={() => setActiveAgent(i)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] transition-all",
                  activeAgent === i
                    ? "bg-white font-medium text-neutral-900"
                    : "bg-white/60 text-neutral-500 hover:bg-white/90"
                )}
                style={activeAgent === i ? { boxShadow: `0 0 0 1.5px ${a.color}` } : undefined}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: a.color }}
                />
                <span>{a.label}</span>
                {activeAgent === i && (
                  <X size={12} className="text-neutral-400 ml-0.5" />
                )}
              </motion.button>
            ))}
          </div>

          {/* Chat input area */}
          <div
            ref={chatRef}
            className={cn(
              "rounded-2xl shadow-lg shadow-neutral-200/40 bg-white text-left transition-all duration-300 overflow-visible",
              optimizing && "ring-2 ring-amber-300/50 shadow-amber-200/30"
            )}
            style={{ border: `1.5px solid ${optimizing ? '#f59e0b40' : agent.color + '30'}` }}
          >
            {/* Textarea */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
              placeholder="和我聊聊，你想要什么设计。"
              rows={2}
              className="w-full resize-none border-none px-5 pt-4 pb-2 text-sm outline-none ring-0 focus:ring-0 focus:outline-none bg-transparent placeholder:text-neutral-400 md:min-h-[6.5rem]"
            />

            {/* Bottom toolbar — single row */}
            <div className="flex items-center gap-0.5 px-3 py-2">
              {/* Upload image */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100/80 transition-colors"
              >
                <Plus size={14} className="text-neutral-400" /> 图片
              </motion.button>

              <div className="w-px h-3.5 bg-neutral-200/80 mx-0.5" />

              {/* Model selector */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowModelPicker(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100/80 transition-colors"
              >
                <Sparkles size={13} className="text-neutral-400" />
                {curImgModel?.display_name || '模型'}
                <ChevronDown size={11} className={cn("text-neutral-400 transition-transform", showModelPicker && "rotate-180")} />
              </motion.button>

              {/* Settings trigger */}
              <div ref={settingsRef} className="relative">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowSettings(!showSettings)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors",
                    showSettings ? "bg-neutral-100 text-neutral-700" : "text-neutral-500 hover:bg-neutral-100/80"
                  )}
                >
                  <SlidersHorizontal size={13} className="text-neutral-400" />
                  {selRatio || '1:1'} · {selCount}张
                  <ChevronDown size={11} className={cn("text-neutral-400 transition-transform", showSettings && "rotate-180")} />
                </motion.button>

                  {/* Settings popover */}
                  <AnimatePresence>
                    {showSettings && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className="absolute bottom-full left-0 mb-2 w-[320px] bg-white/95 backdrop-blur-xl rounded-2xl border border-neutral-200/60 shadow-xl shadow-neutral-200/30 p-4 z-50 space-y-4 max-h-[60vh] overflow-y-auto"
                      >
                        {/* 图像质量 */}
                        {imgCfg?.qualities && imgCfg.qualities.values.length > 0 && (
                          <div>
                            <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-2">图像质量</div>
                            <div className="flex rounded-xl bg-neutral-100/80 p-0.5">
                              {imgCfg.qualities.values.map((q) => (
                                <button
                                  key={q}
                                  onClick={() => setSelQuality(q)}
                                  className={cn(
                                    "relative flex-1 py-1.5 rounded-lg text-xs transition-all",
                                    selQuality === q ? "bg-white text-neutral-900 shadow-sm font-medium" : "text-neutral-400 hover:text-neutral-600"
                                  )}
                                >
                                  {q === 'low' ? '低画质' : q === 'medium' || q === 'standard' ? '标准画质' : q === 'high' || q === 'hd' ? '高画质' : q}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 清晰度 */}
                        {imgCfg?.resolutions && imgCfg.resolutions.values.length > 0 && (
                          <div>
                            <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-2">清晰度</div>
                            <div className="flex rounded-xl bg-neutral-100/80 p-0.5">
                              {imgCfg.resolutions.values.map((r) => (
                                <button
                                  key={r}
                                  onClick={() => setSelResolution(r)}
                                  className={cn(
                                    "flex-1 py-1.5 rounded-lg text-xs transition-all",
                                    selResolution === r ? "bg-white text-neutral-900 shadow-sm font-medium" : "text-neutral-400 hover:text-neutral-600"
                                  )}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 图片尺寸 */}
                        {imgCfg?.ratios && imgCfg.ratios.values.length > 0 && (
                          <div>
                            <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-2">图片尺寸</div>
                            <div className="grid grid-cols-5 gap-1.5">
                              {imgCfg.ratios.values.map((r) => (
                                <motion.button
                                  key={r}
                                  whileHover={{ scale: 1.06 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setSelRatio(r)}
                                  className={cn(
                                    "flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all",
                                    selRatio === r ? "bg-neutral-900 text-white shadow-sm" : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100"
                                  )}
                                >
                                  <RatioIcon ratio={r} active={selRatio === r} />
                                  <span className="text-[10px] leading-none">{r === 'auto' ? '自适应' : r}</span>
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 生成数量 */}
                        <div>
                          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-2">生成数量</div>
                          <div className="flex rounded-xl bg-neutral-100/80 p-0.5">
                            {[1, 2, 3, 4].map((n) => (
                              <button
                                key={n}
                                onClick={() => setSelCount(n)}
                                className={cn(
                                  "flex-1 py-1.5 rounded-lg text-xs transition-all",
                                  selCount === n ? "bg-white text-neutral-900 shadow-sm font-medium" : "text-neutral-400 hover:text-neutral-600"
                                )}
                              >
                                {n}张
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              <div className="w-px h-3.5 bg-neutral-200/80 mx-0.5" />

              {/* Prompt optimize */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleOptimizePrompt(input, setInput)}
                disabled={optimizing || !input.trim()}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors",
                  optimizing || !input.trim() ? "text-neutral-300 cursor-not-allowed" : "text-neutral-500 hover:bg-neutral-100/80"
                )}
              >
                {optimizing ? <Loader2 size={13} className="text-amber-400 animate-spin" /> : <Zap size={13} className="text-amber-400" />} 优化提示词
              </motion.button>

              <div className="flex-1" />

              {/* Send */}
              <motion.button
                onClick={() => handleSend(input)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium text-white transition-all",
                  input.trim() ? "cursor-pointer shadow-md" : "cursor-not-allowed opacity-50"
                )}
                style={{ backgroundColor: agent.color }}
              >
                <Send size={14} /> 发送
              </motion.button>
            </div>
          </div>

          {/* Model Picker Modal */}
          <AnimatePresence>
            {showModelPicker && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4"
                onClick={() => setShowModelPicker(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-neutral-300/30 w-full max-w-[600px] max-h-[65vh] overflow-y-auto p-5 border border-neutral-200/40"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-neutral-900">选择模型</h2>
                    <button onClick={() => setShowModelPicker(false)} className="p-1 rounded-lg hover:bg-neutral-50 transition-colors">
                      <X size={16} className="text-neutral-400" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {imageModels.map((m, idx) => (
                      <motion.button
                        key={m.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.2 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { onModelChange(m.name); setShowModelPicker(false); }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                          selModel === m.name
                            ? "border-neutral-400 bg-neutral-50 shadow-sm"
                            : "border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50/50"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          selModel === m.name ? "bg-neutral-800" : "bg-neutral-100"
                        )}>
                          <Sparkles size={14} className={selModel === m.name ? "text-white" : "text-neutral-400"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-neutral-900">{m.display_name}</span>
                            {m.badge && <span className="text-[9px] px-1 py-px rounded-full bg-red-500 text-white font-medium">{m.badge}</span>}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {m.config.resolutions?.values?.includes('4K') && (
                              <span className="text-[10px] px-1 py-px rounded-full bg-neutral-100 text-neutral-500">超清4K</span>
                            )}
                            {(m.config.ratios?.values?.length ?? 0) > 3 && (
                              <span className="text-[10px] px-1 py-px rounded-full bg-neutral-100 text-neutral-500">多尺寸</span>
                            )}
                            {m.config.qualities?.values?.includes('hd') && (
                              <span className="text-[10px] px-1 py-px rounded-full bg-neutral-100 text-neutral-500">HD画质</span>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generation Result Modal */}
          <AnimatePresence>
            {showGenModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => { if (!generating) { setShowGenModal(false); if (pollRef.current) clearInterval(pollRef.current); } }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-[680px] max-h-[80vh] overflow-y-auto border border-neutral-200/40"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-semibold text-neutral-900 mb-0.5">图片生成</h2>
                      <p className="text-xs text-neutral-400 truncate">{genPrompt}</p>
                    </div>
                    <button
                      onClick={() => { setShowGenModal(false); if (pollRef.current) clearInterval(pollRef.current); setGenerating(false); }}
                      className="p-1.5 rounded-lg hover:bg-neutral-50 transition-colors shrink-0 ml-3"
                    >
                      <X size={16} className="text-neutral-400" />
                    </button>
                  </div>

                  {/* Results grid */}
                  <div className="px-5 pb-5">
                    <div className="grid grid-cols-2 gap-3">
                      {genResults.length > 0
                        ? genResults.map((r: any, i: number) => (
                            <motion.div
                              key={r?.id || i}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.08, duration: 0.3 }}
                              className="group relative aspect-square rounded-xl overflow-hidden border border-neutral-200/60 bg-neutral-50"
                            >
                              {r?.result_url ? (
                                <img src={r.result_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="text-center">
                                    {(r?.status === "pending" || r?.status === "processing") ? (
                                      <>
                                        <Loader2 size={24} className="mx-auto text-neutral-300 animate-spin mb-2" />
                                        <p className="text-xs text-neutral-400">生成中...</p>
                                      </>
                                    ) : r?.status === "failed" ? (
                                      <p className="text-xs text-red-400">生成失败</p>
                                    ) : (
                                      <p className="text-xs text-neutral-400">完成</p>
                                    )}
                                  </div>
                                </div>
                              )}
                              {r?.result_url && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => downloadImage(r.result_url, `gen-${i + 1}.png`)}
                                  className="absolute bottom-2 right-2 p-2 rounded-xl bg-black/50 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Download size={14} />
                                </motion.button>
                              )}
                            </motion.div>
                          ))
                        : generating
                          ? Array.from({ length: selCount }).map((_, i) => (
                              <div key={i} className="aspect-square rounded-xl bg-neutral-50 border border-dashed border-neutral-200 flex items-center justify-center">
                                <div className="text-center">
                                  <Loader2 size={24} className="mx-auto text-neutral-300 animate-spin mb-2" />
                                  <p className="text-[11px] text-neutral-300">生成中...</p>
                                </div>
                              </div>
                            ))
                          : null
                      }
                    </div>

                    {/* Actions */}
                    {!generating && genResults.length > 0 && (
                      <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-neutral-100">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleGenerate(genPrompt)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                        >
                          <Sparkles size={13} /> 重新生成
                        </motion.button>
                        <button
                          onClick={() => { setShowGenModal(false); }}
                          className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-500 hover:bg-neutral-50 transition-colors"
                        >
                          关闭
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feature cards below input */}
          <div className="mt-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeAgent}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
              >
                {agent.cards.map((card) => (
                  <Link
                    key={card.title}
                    href={agent.label.includes("\u7535\u5546") ? "/product-photo" : agent.label.includes("\u6587\u751f\u56fe\u7247") ? "/generate" : agent.label.includes("\u6d77\u62a5") ? "/poster" : agent.label.includes("\u89c6\u9891") ? "/video" : "/tools"}
                    className="group rounded-2xl bg-[#f0f7f4] border border-neutral-100/80 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    <div className="pt-4 pb-2 text-center">
                      <h3 className="text-[13px] font-semibold text-neutral-800">{card.title}</h3>
                    </div>
                    <div className="px-2 pb-2 flex justify-center">
                      <Image
                        src={card.images[0]}
                        alt={card.title}
                        width={260}
                        height={140}
                        className="rounded-xl object-cover w-full h-[110px] group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    </div>
                  </Link>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ═══════ TOOL BAR SECTION (inline) ═══════ */}
      <section className="px-6 pb-6">
        <div className="max-w-5xl mx-auto flex gap-3">
          {/* Left: boxed tool cards */}
          <div className="flex gap-3 shrink-0 overflow-x-auto">
            {boxedTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.label}
                  href={tool.href}
                  className="w-[140px] sm:w-[160px] px-4 pt-4 pb-3 rounded-xl border border-neutral-200 bg-white hover:shadow-md hover:border-neutral-300 transition-all flex flex-col justify-between shrink-0"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-800">{tool.label}</h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{tool.desc}</p>
                  </div>
                  <Icon size={18} className="text-neutral-400 mt-3" />
                </Link>
              );
            })}
          </div>

          {/* Right: 2-row tool grid */}
          <div className="flex-1 grid grid-cols-3 sm:grid-cols-5 gap-x-1 gap-y-0.5">
            {gridTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.label}
                  href={tool.href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all whitespace-nowrap"
                >
                  <Icon size={14} className="text-neutral-400 shrink-0" />
                  <span>{tool.label}</span>
                  {tool.hot && <Zap size={12} className="text-orange-500" />}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════ SECOND SCREEN — Tab Content ═══════ */}
      <section className="px-6 pb-12">
        <div className="max-w-5xl mx-auto">
          {/* Tabs */}
          <div className="flex items-center gap-0.5 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative px-4 py-2 rounded-lg text-sm transition-all",
                  activeTab === tab
                    ? "text-neutral-900 font-bold"
                    : "text-neutral-400 hover:text-neutral-600"
                )}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-neutral-900 rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Tab: 精选灵感 */}
            {activeTab === "精选灵感" && (
              <motion.div key="inspiration" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-neutral-900">精选灵感</h2>
                    <p className="text-xs text-neutral-400">来自社区的优秀 AI 创作</p>
                  </div>
                  <Link href="/inspiration" className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">查看更多 →</Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {(showcaseData.length > 0 ? showcaseData.slice(0, 8) : showcaseItems).map((item: any, i: number) => (
                    <motion.div key={item.id ?? i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Link href="/inspiration" className="group rounded-2xl overflow-hidden border border-white/60 card-hover gradient-border block">
                        {item.image_url ? (
                          <div className="aspect-[3/4] relative overflow-hidden bg-neutral-100">
                            <img src={item.image_url} alt={item.title || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-[10px] text-white font-medium line-clamp-1">{item.title}</p>
                              <p className="text-[9px] text-white/70">{item.author || "匿名"}</p>
                            </div>
                          </div>
                        ) : (
                          <div className={cn("aspect-[3/4] bg-gradient-to-br relative overflow-hidden", item.gradient)}>
                            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
                          </div>
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Tab: 热门工具 */}
            {activeTab === "热门工具" && (
              <motion.div key="tools" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-lg font-bold text-neutral-900">热门工具</h2>
                  <p className="text-xs text-neutral-400">一键开始 AI 创作</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {[
                    { title: "AI 商品套图", desc: "一键生成电商套图", href: "/product-photo", gradient: "from-blue-200 to-cyan-100" },
                    { title: "文生图片", desc: "文字描述生成图片", href: "/generate", gradient: "from-pink-200 to-rose-100" },
                    { title: "AI 海报", desc: "智能海报设计", href: "/poster", gradient: "from-amber-200 to-yellow-100" },
                    { title: "智能抠图", desc: "一键去除背景", href: "/cutout", gradient: "from-emerald-200 to-green-100" },
                    { title: "AI 视频", desc: "文字/图片生成视频", href: "/video", gradient: "from-purple-200 to-violet-100" },
                    { title: "变清晰", desc: "超分辨率增强", href: "/upscale", gradient: "from-red-200 to-orange-100" },
                  ].map((tool, i) => (
                    <motion.div key={tool.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Link href={tool.href} className="group rounded-2xl overflow-hidden border border-white/60 card-hover gradient-border block">
                        <div className={cn("aspect-[4/5] bg-gradient-to-br relative overflow-hidden flex flex-col items-center justify-center gap-2", tool.gradient)}>
                          <h3 className="text-sm font-bold text-neutral-800">{tool.title}</h3>
                          <p className="text-[11px] text-neutral-500">{tool.desc}</p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Tab: 商品图 */}
            {activeTab === "商品图" && (
              <motion.div key="product" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-lg font-bold text-neutral-900">AI 商品图</h2>
                  <p className="text-xs text-neutral-400">主图/场景/详情全套一键生成</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { title: "亚马逊套图", desc: "主图+副图+场景图", href: "/product-photo" },
                    { title: "白底精修图", desc: "干净商品展示", href: "/product-photo" },
                    { title: "A+ 详情页", desc: "高转化详情页", href: "/a-plus" },
                    { title: "商品换背景", desc: "一键场景替换", href: "/product-photo" },
                  ].map((item, i) => (
                    <motion.div key={item.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Link href={item.href} className="block p-5 rounded-2xl bg-white border border-neutral-200/60 hover:shadow-md hover:border-neutral-300 transition-all">
                        <h3 className="text-sm font-semibold text-neutral-800 mb-1">{item.title}</h3>
                        <p className="text-xs text-neutral-400">{item.desc}</p>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Tab: 海报模板 */}
            {activeTab === "海报模板" && (
              <motion.div key="poster" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-lg font-bold text-neutral-900">AI 海报</h2>
                  <p className="text-xs text-neutral-400">一键生成高质量宣传海报</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { title: "社媒海报", desc: "适合社交媒体分享", href: "/poster" },
                    { title: "商品促销海报", desc: "节日促销活动宣传", href: "/poster" },
                    { title: "节日祝福海报", desc: "温馨节日问候", href: "/poster" },
                    { title: "商家宣传海报", desc: "品牌活动推广", href: "/poster" },
                  ].map((item, i) => (
                    <motion.div key={item.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Link href={item.href} className="block p-5 rounded-2xl bg-white border border-neutral-200/60 hover:shadow-md hover:border-neutral-300 transition-all">
                        <h3 className="text-sm font-semibold text-neutral-800 mb-1">{item.title}</h3>
                        <p className="text-xs text-neutral-400">{item.desc}</p>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <Footer />

      {/* ═══════ FLOATING CHAT BUBBLE ═══════ */}
      <AnimatePresence>
        {showFloat && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
            className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[480px] max-w-[calc(100vw-32px)] md:max-w-[calc(100vw-120px)]"
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-neutral-300/40 border border-neutral-200/40">
              <textarea
                value={floatInput}
                onChange={(e) => setFloatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(floatInput); } }}
                placeholder="和我聊聊，你想要什么设计。"
                rows={2}
                className="w-full resize-none border-none px-4 pt-3 pb-1 text-sm outline-none ring-0 focus:ring-0 focus:outline-none bg-transparent placeholder:text-neutral-400"
              />
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-0.5">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-50 transition-colors"><Plus size={14} /></motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleOptimizePrompt(floatInput, setFloatInput)} disabled={optimizing || !floatInput.trim()} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-50 transition-colors disabled:opacity-30">{optimizing ? <Loader2 size={14} className="text-amber-400 animate-spin" /> : <Zap size={14} className="text-amber-400" />}</motion.button>
                </div>
                <motion.button
                  onClick={() => handleSend(floatInput)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-xl text-white transition-all"
                  style={{ backgroundColor: floatInput.trim() ? agent.color : "#d4d4d4" }}
                >
                  <Send size={14} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
