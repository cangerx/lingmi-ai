"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  X,
  ChevronDown,
  ShoppingBag,
  FileText,
  Sparkles,
  Image as ImageIcon,
  Palette,
  PenLine,
  ArrowRight,
  Zap,
  Loader2,
  Download,
  Paperclip,
  Globe,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { modelAPI, imageAPI, generationAPI, inspirationAPI } from "@/lib/api";
import { downloadImage } from "@/lib/download";
import Footer from "@/components/footer";
import { usePageTitle } from "@/hooks/use-page-title";
import { useOptimizePrompt } from "@/hooks/use-optimize-prompt";

/* ═══════════════════════════════════════════════════════
   Mode 配置 — 聚焦图片生成 + 文案创作
   ═══════════════════════════════════════════════════════ */
interface ModeConfig {
  key: string;
  label: string;
  icon: any;
  color: string;
  bg: string;
  subtitle: string;
  placeholder: string;
  params: { key: string; label: string; options: string[]; default: string }[];
  shortcuts: { title: string; desc: string; href: string; icon: any }[];
}

const MODES: ModeConfig[] = [
  {
    key: "image",
    label: "图文创作",
    icon: ImageIcon,
    color: "#FF8C42",
    bg: "from-orange-50 to-amber-50/50",
    subtitle: "支持小红书、公众号贴图等平台图文创作",
    placeholder: "描述你想要创作的图文内容...",
    params: [
      { key: "ratio", label: "尺寸", options: ["1:1", "3:4", "4:3", "9:16", "16:9"], default: "3:4" },
      { key: "style", label: "风格", options: ["智能", "写实", "插画", "3D", "动漫"], default: "智能" },
    ],
    shortcuts: [
      { title: "去画布", desc: "图文创作", href: "/generate", icon: Palette },
      { title: "文案创作", desc: "智能文案生成", href: "#copywriting", icon: PenLine },
    ],
  },
  {
    key: "poster",
    label: "海报设计",
    icon: Wand2,
    color: "#59CD6D",
    bg: "from-emerald-50 to-green-50/50",
    subtitle: "支持海报设计、长图海报、详情页和可编辑设计稿生成",
    placeholder: "描述你想要设计的图文海报主题、风格或具体内容...",
    params: [
      { key: "ratio", label: "智能尺寸", options: ["智能尺寸", "1:1", "3:4", "9:16", "16:9", "A4"], default: "智能尺寸" },
      { key: "style", label: "风格", options: ["智能", "简约", "国潮", "赛博", "复古"], default: "智能" },
    ],
    shortcuts: [],
  },
  {
    key: "product",
    label: "商品图",
    icon: ShoppingBag,
    color: "#3382FD",
    bg: "from-blue-50 to-sky-50/50",
    subtitle: "电商商品主图、场景图、白底图一键生成",
    placeholder: "输入商品信息或卖点，如：高端护肤品，简约大气的白色背景...",
    params: [
      { key: "platform", label: "平台", options: ["淘宝/天猫", "亚马逊", "京东", "拼多多", "Shopee", "独立站"], default: "淘宝/天猫" },
      { key: "ratio", label: "尺寸", options: ["1:1", "3:4", "4:5", "16:9"], default: "1:1" },
    ],
    shortcuts: [
      { title: "商品套图", desc: "主图场景全套生成", href: "/product-photo", icon: ShoppingBag },
      { title: "A+ 详情页", desc: "高转化详情页生成", href: "/a-plus", icon: FileText },
      { title: "智能抠图", desc: "3秒去除背景", href: "/cutout", icon: Sparkles },
    ],
  },
  {
    key: "copywriting",
    label: "文案创作",
    icon: PenLine,
    color: "#F5A623",
    bg: "from-amber-50 to-yellow-50/50",
    subtitle: "电商文案、种草笔记、营销文案智能生成",
    placeholder: "输入商品或主题信息，AI 帮你写出爆款文案...",
    params: [
      { key: "platform", label: "平台", options: ["小红书", "淘宝", "抖音", "亚马逊", "公众号"], default: "小红书" },
      { key: "tone", label: "风格", options: ["种草", "专业", "活泼", "高端", "促销"], default: "种草" },
    ],
    shortcuts: [
      { title: "商品描述", desc: "多平台商品文案", href: "#", icon: ShoppingBag },
      { title: "种草文案", desc: "小红书风格笔记", href: "#", icon: PenLine },
      { title: "标题优化", desc: "高点击率标题", href: "#", icon: Sparkles },
    ],
  },
];

/* ── Inspiration placeholder ──────────────────── */
const INSPIRATION_PLACEHOLDERS = [
  { gradient: "from-rose-200 to-pink-100" },
  { gradient: "from-blue-200 to-cyan-100" },
  { gradient: "from-amber-200 to-yellow-100" },
  { gradient: "from-emerald-200 to-green-100" },
  { gradient: "from-purple-200 to-violet-100" },
  { gradient: "from-red-200 to-orange-100" },
];

/* ── Motion variants ──────────────────────────── */
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ── Image Model types ────────────────────────── */
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

/* ── Inline Dropdown ──────────────────────────── */
function ParamPill({ label, options, value, onChange, color }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; color: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100/80 transition-colors whitespace-nowrap"
      >
        <span className="text-neutral-400">{label}</span>
        <span className="font-medium">{value}</span>
        <ChevronDown size={11} className={cn("text-neutral-400 transition-transform duration-200", open && "rotate-180")} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="absolute bottom-full left-0 mb-2 bg-white/95 backdrop-blur-xl rounded-xl border border-neutral-200/60 shadow-xl shadow-neutral-200/20 py-1.5 z-50 min-w-[120px]"
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={cn(
                  "block w-full text-left px-3 py-1.5 text-xs transition-colors",
                  value === opt ? "font-medium" : "text-neutral-500 hover:bg-neutral-50"
                )}
                style={value === opt ? { color } : undefined}
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
   HomePage
   ═══════════════════════════════════════════════════════ */
export default function HomePage() {
  usePageTitle("智能创作平台");
  const router = useRouter();
  const [input, setInput] = useState("");
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Image models
  const [imageModels, setImageModels] = useState<ImageModelItem[]>([]);
  const [selModel, setSelModel] = useState("");
  const [showModelPicker, setShowModelPicker] = useState(false);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genResults, setGenResults] = useState<any[]>([]);
  const [genPrompt, setGenPrompt] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Inspiration
  const [showcaseData, setShowcaseData] = useState<any[]>([]);

  const { optimizing, optimize: handleOptimizePrompt } = useOptimizePrompt();

  const mode = MODES.find((m) => m.key === activeMode) || null;

  // Load models
  useEffect(() => {
    modelAPI.imageModels().then((res) => {
      const data: ImageModelItem[] = res.data?.data ?? [];
      setImageModels(data);
      if (data.length > 0) setSelModel(data[0].name);
    }).catch(() => {});
  }, []);

  // Load inspiration
  useEffect(() => {
    inspirationAPI.list({ page: 1, page_size: 12 }).then((res) => {
      setShowcaseData(res.data?.data ?? []);
    }).catch(() => {});
  }, []);

  // Cleanup poll
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Set defaults when mode changes
  useEffect(() => {
    if (mode) {
      const defaults: Record<string, string> = {};
      mode.params.forEach((p) => { defaults[p.key] = p.default; });
      setParamValues(defaults);
    }
  }, [activeMode]);

  const curImgModel = imageModels.find((m) => m.name === selModel);

  const selectMode = (key: string) => {
    setActiveMode(key);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const clearMode = () => {
    setActiveMode(null);
    setParamValues({});
  };

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

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const q = encodeURIComponent(input.trim());

    if (activeMode === "product") {
      router.push(`/product-photo?prompt=${q}`);
    } else if (activeMode === "poster") {
      router.push(`/poster?prompt=${q}&auto=1`);
    } else if (activeMode === "copywriting") {
      router.push(`/chat?prompt=${q}&system=copywriting`);
    } else {
      // Default: image generation
      setGenPrompt(input.trim());
      setShowGenModal(true);
      setGenerating(true);
      setGenResults([]);
      imageAPI.generate({
        prompt: input.trim(),
        model: selModel || undefined,
        ratio: paramValues.ratio || undefined,
        n: 1,
      }).then((res) => {
        const gen = res.data?.data;
        setGenResults(Array.isArray(gen) ? gen : [gen]);
        if (gen?.id && gen?.status !== "completed") {
          pollGeneration(gen.id);
        } else {
          setGenerating(false);
        }
      }).catch(() => setGenerating(false));
    }
  }, [input, activeMode, selModel, paramValues, router, pollGeneration]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto relative" style={{ background: "#FAFAF8" }}>
      {/* ═══════ HERO SECTION ═══════ */}
      <section className="pt-20 pb-6 px-6 relative">
        {/* Subtle background glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          animate={{ opacity: mode ? 1 : 0.6 }}
          transition={{ duration: 0.8 }}
        >
          <div
            className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[120px] opacity-30 transition-colors duration-1000"
            style={{ background: mode ? `radial-gradient(ellipse, ${mode.color}20, transparent 70%)` : "radial-gradient(ellipse, rgba(168,162,158,0.15), transparent 70%)" }}
          />
        </motion.div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 tracking-tight mb-2">
              从一个想法，开始创作
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={activeMode || "default"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="text-sm text-neutral-400 mb-8"
              >
                {mode ? mode.subtitle : "AI 图片生成 · 文案创作 · 电商设计，一站搞定"}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          {/* ═══════ INPUT BOX ═══════ */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              animate={{
                boxShadow: isFocused
                  ? `0 0 0 1px ${mode?.color || '#d4d4d4'}40, 0 4px 30px ${mode?.color || '#d4d4d4'}15, 0 1px 3px rgba(0,0,0,0.04)`
                  : "0 2px 20px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)",
              }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl bg-white border border-neutral-200/60 text-left overflow-visible relative"
            >
              {/* Textarea with optional mode tag */}
              <div className="px-5 pt-4 pb-2">
                <div className="flex items-start gap-2">
                  {/* Mode tag inside input */}
                  <AnimatePresence>
                    {mode && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: -20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white shrink-0 mt-0.5 cursor-pointer"
                        style={{ backgroundColor: mode.color }}
                        onClick={clearMode}
                      >
                        {mode.label}
                        <X size={12} className="opacity-70" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={mode?.placeholder || "有什么想创作的？描述你的想法..."}
                    rows={3}
                    className="flex-1 resize-none border-none text-sm outline-none ring-0 focus:ring-0 focus:outline-none bg-transparent placeholder:text-neutral-400 leading-relaxed"
                  />
                </div>
              </div>

              {/* Bottom toolbar */}
              <div className="flex items-center gap-0.5 px-3 py-2 border-t border-neutral-100/60">
                {/* Mode-specific params */}
                <AnimatePresence mode="popLayout">
                  {mode && mode.params.map((p) => (
                    <motion.div
                      key={p.key}
                      initial={{ opacity: 0, scale: 0.9, x: -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: -10 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <ParamPill
                        label=""
                        options={p.options}
                        value={paramValues[p.key] || p.default}
                        onChange={(v) => setParamValues((prev) => ({ ...prev, [p.key]: v }))}
                        color={mode.color}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Model selector (for image modes) */}
                {(activeMode === "image" || activeMode === "poster" || !activeMode) && imageModels.length > 0 && (
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setShowModelPicker(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100/80 transition-colors"
                  >
                    <Sparkles size={12} className="text-neutral-400" />
                    <span className="font-medium">{curImgModel?.display_name || "模型"}</span>
                    <ChevronDown size={10} className="text-neutral-400" />
                  </motion.button>
                )}

                <div className="w-px h-3.5 bg-neutral-200/60 mx-1" />

                {/* Optimize prompt */}
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleOptimizePrompt(input, setInput)}
                  disabled={optimizing || !input.trim()}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                    optimizing || !input.trim() ? "text-neutral-300 cursor-not-allowed" : "text-neutral-500 hover:bg-neutral-100/80"
                  )}
                >
                  {optimizing ? <Loader2 size={12} className="text-amber-400 animate-spin" /> : <Zap size={12} className="text-amber-400" />}
                </motion.button>

                {/* Attach */}
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100/80 transition-colors"
                >
                  <Paperclip size={14} />
                </motion.button>

                <div className="flex-1" />

                {/* Send button */}
                <motion.button
                  onClick={handleSend}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={!input.trim()}
                  className={cn(
                    "p-2.5 rounded-xl text-white transition-all duration-300",
                    input.trim() ? "shadow-lg" : "opacity-40 cursor-not-allowed"
                  )}
                  style={{
                    backgroundColor: input.trim() ? (mode?.color || "#18181b") : "#d4d4d4",
                    boxShadow: input.trim() ? `0 4px 14px ${mode?.color || "#18181b"}30` : "none",
                  }}
                >
                  <Send size={15} />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>

          {/* ═══════ MODE BUTTONS ═══════ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="flex items-center justify-center gap-2 mt-5"
          >
            {MODES.map((m) => (
              <motion.button
                key={m.key}
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => selectMode(m.key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] transition-all duration-300 border",
                  activeMode === m.key
                    ? "bg-white font-medium text-neutral-900 shadow-md border-transparent"
                    : "bg-white/60 text-neutral-500 hover:bg-white/90 border-transparent hover:border-neutral-200/60"
                )}
                style={activeMode === m.key ? { boxShadow: `0 0 0 1.5px ${m.color}, 0 4px 12px ${m.color}20` } : undefined}
              >
                <m.icon size={14} style={{ color: activeMode === m.key ? m.color : undefined }} />
                <span>{m.label}</span>
              </motion.button>
            ))}
          </motion.div>

          {/* ═══════ MODE SHORTCUTS ═══════ */}
          <AnimatePresence mode="wait">
            {mode && mode.shortcuts.length > 0 && (
              <motion.div
                key={`shortcuts-${activeMode}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6"
              >
                <p className="text-xs text-neutral-400 mb-3">+ 添加快捷语</p>
                <div className="flex items-center justify-center gap-3">
                  {mode.shortcuts.map((s) => (
                    <Link key={s.title} href={s.href}>
                      <motion.div
                        whileHover={{ y: -3, boxShadow: "0 8px 25px rgba(0,0,0,0.08)" }}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-neutral-200/60 shadow-sm hover:border-neutral-300/80 transition-all cursor-pointer min-w-[180px]"
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${mode.color}12` }}
                        >
                          <s.icon size={16} style={{ color: mode.color }} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-neutral-800">{s.title}</p>
                          <p className="text-[11px] text-neutral-400">{s.desc}</p>
                        </div>
                        <ArrowRight size={14} className="text-neutral-300 ml-auto" />
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════ POSTER TEMPLATE GALLERY (poster mode only) ═══════ */}
          <AnimatePresence>
            {activeMode === "poster" && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="mt-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button className="text-sm font-medium text-neutral-900 border-b-2 border-neutral-900 pb-0.5">发现</button>
                    <button className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors">我的</button>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200/60 ml-2">
                      <Globe size={12} className="text-neutral-400" />
                      <input placeholder="搜索海报模板" className="text-xs bg-transparent outline-none w-24 placeholder:text-neutral-400" />
                    </div>
                  </div>
                  <Link href="/generate" className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
                    <Palette size={12} /> 去画布 <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                  {INSPIRATION_PLACEHOLDERS.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.05, y: -3 }}
                      className={cn("w-[140px] h-[200px] rounded-2xl bg-gradient-to-br shrink-0 cursor-pointer border border-white/60 shadow-sm", item.gradient)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ═══════ INSPIRATION SECTION (default mode) ═══════ */}
      <AnimatePresence>
        {!activeMode && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="px-6 pb-12"
          >
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-neutral-900">精选灵感</h2>
                  <p className="text-xs text-neutral-400">来自社区的优秀 AI 创作</p>
                </div>
                <Link href="/inspiration" className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors flex items-center gap-1">
                  查看更多 <ArrowRight size={12} />
                </Link>
              </div>
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3"
              >
                {(showcaseData.length > 0 ? showcaseData.slice(0, 12) : INSPIRATION_PLACEHOLDERS).map((item: any, i: number) => (
                  <motion.div key={item.id ?? i} variants={fadeUp}>
                    <Link href="/inspiration" className="group block rounded-2xl overflow-hidden border border-white/60 shadow-sm hover:shadow-lg transition-all duration-300">
                      {item.image_url ? (
                        <div className="aspect-[3/4] relative overflow-hidden bg-neutral-100">
                          <img src={item.image_url} alt={item.title || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="absolute bottom-0 left-0 right-0 p-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-1 group-hover:translate-y-0">
                            <p className="text-[11px] text-white font-medium line-clamp-1">{item.title}</p>
                            <p className="text-[10px] text-white/70">{item.author || "匿名"}</p>
                          </div>
                        </div>
                      ) : (
                        <div className={cn("aspect-[3/4] bg-gradient-to-br", item.gradient)} />
                      )}
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ═══════ MODEL PICKER MODAL ═══════ */}
      <AnimatePresence>
        {showModelPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModelPicker(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-neutral-300/30 w-full max-w-[560px] max-h-[60vh] overflow-y-auto p-5 border border-neutral-200/40"
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
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelModel(m.name); setShowModelPicker(false); }}
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
                      {m.description && <p className="text-[10px] text-neutral-400 mt-0.5 truncate">{m.description}</p>}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ GENERATION RESULT MODAL ═══════ */}
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
              className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-[640px] max-h-[80vh] overflow-y-auto border border-neutral-200/40"
              onClick={(e) => e.stopPropagation()}
            >
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
              <div className="px-5 pb-5">
                <div className="grid grid-cols-2 gap-3">
                  {genResults.length > 0
                    ? genResults.map((r: any, i: number) => (
                        <motion.div
                          key={r?.id || i}
                          initial={{ opacity: 0, filter: "blur(20px)" }}
                          animate={{ opacity: 1, filter: "blur(0px)" }}
                          transition={{ delay: i * 0.1, duration: 0.6 }}
                          className="group relative aspect-square rounded-xl overflow-hidden border border-neutral-200/60 bg-neutral-50"
                        >
                          {r?.result_url ? (
                            <img src={r.result_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {(r?.status === "pending" || r?.status === "processing") ? (
                                <div className="text-center">
                                  <Loader2 size={24} className="mx-auto text-neutral-300 animate-spin mb-2" />
                                  <p className="text-xs text-neutral-400">生成中...</p>
                                </div>
                              ) : r?.status === "failed" ? (
                                <p className="text-xs text-red-400">生成失败</p>
                              ) : null}
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
                      ? (
                          <div className="col-span-2 aspect-video rounded-xl bg-neutral-50 border border-dashed border-neutral-200 flex items-center justify-center">
                            <div className="text-center">
                              <Loader2 size={28} className="mx-auto text-neutral-300 animate-spin mb-3" />
                              <p className="text-xs text-neutral-400">AI 正在创作...</p>
                            </div>
                          </div>
                        )
                      : null
                  }
                </div>
                {!generating && genResults.length > 0 && (
                  <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-neutral-100">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setGenerating(true);
                        setGenResults([]);
                        imageAPI.generate({ prompt: genPrompt, model: selModel || undefined, ratio: paramValues.ratio || undefined, n: 1 })
                          .then((res) => {
                            const gen = res.data?.data;
                            setGenResults(Array.isArray(gen) ? gen : [gen]);
                            if (gen?.id && gen?.status !== "completed") pollGeneration(gen.id);
                            else setGenerating(false);
                          }).catch(() => setGenerating(false));
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                    >
                      <Sparkles size={13} /> 重新生成
                    </motion.button>
                    <button
                      onClick={() => setShowGenModal(false)}
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

      {/* ═══════ FOOTER ═══════ */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}
