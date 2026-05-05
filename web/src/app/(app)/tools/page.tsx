"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  PenTool,
  Scissors,
  Eraser,
  Sparkles,
  Expand,
  CreditCard,
  LayoutGrid as GridIcon,
  ShoppingBag,
  FileText,
  Video,
  Copy,
  Shirt,
  Image as ImageIcon,
  FileType,
  Presentation,
  Type,
  Wand2,
  Combine,
  UserCircle,
  Layers,
} from "lucide-react";
import { useModulesStore } from "@/store/modules";
import { usePageTitle } from "@/hooks/use-page-title";

/* ── Recently used ──────────────────────────── */
const recentTools = [
  { label: "图片编辑", icon: PenTool, href: "/editor" },
  { label: "智能抠图", icon: Scissors, href: "/cutout" },
  { label: "AI Logo", icon: FileType, href: "/coming-soon?tool=logo" },
  { label: "AI 文案", icon: Type, href: "/coming-soon?tool=copywriting" },
  { label: "AI 消除", icon: Eraser, href: "/eraser" },
  { label: "文生图片", icon: ImageIcon, href: "/generate" },
];

/* ── AI 商拍 ────────────────────────────────── */
const aiShootTools = [
  { title: "AI 商品套图", desc: "主图场景全套一键生成", href: "/product-photo", icon: ShoppingBag, gradient: "from-blue-100 to-cyan-50" },
  { title: "A+ 详情页", desc: "高转化详情页一键生成", href: "/a-plus", icon: FileText, gradient: "from-amber-100 to-yellow-50" },
  { title: "批量套图", desc: "夜间托管生图，效率提升", href: "/coming-soon?tool=batch-photo", icon: Layers, gradient: "from-emerald-100 to-green-50" },
  { title: "爆款图复刻", desc: "一键复刻电商爆款图片", href: "/coming-soon?tool=copy-hot", icon: Copy, gradient: "from-red-100 to-orange-50" },
  { title: "AI 带货视频", desc: "爆款带货视频一键生成", href: "/video", icon: Video, gradient: "from-purple-100 to-violet-50", moduleKey: "video" },
  { title: "文生图片", desc: "AI 从文字生成精美图片", href: "/generate", icon: ImageIcon, gradient: "from-pink-100 to-rose-50" },
];

/* ── 图像处理 ───────────────────────────────── */
const imageTools = [
  { title: "图片编辑", desc: "轻松设计质感图片", href: "/editor", icon: PenTool, gradient: "from-pink-100 to-rose-50" },
  { title: "智能抠图", desc: "3秒智能识别除背景", href: "/cutout", icon: Scissors, gradient: "from-emerald-100 to-teal-50" },
  { title: "AI 消除", desc: "一键消除，不留痕迹", href: "/eraser", icon: Eraser, gradient: "from-orange-100 to-amber-50" },
  { title: "变清晰", desc: "告别渣画质", href: "/upscale", icon: Sparkles, gradient: "from-amber-100 to-yellow-50" },
  { title: "证件照", desc: "换底色/改尺寸/排版", href: "/coming-soon?tool=id-photo", icon: CreditCard, gradient: "from-blue-100 to-sky-50" },
  { title: "无损改尺寸", desc: "缩放图片，清晰不失真", href: "/coming-soon?tool=resize", icon: Expand, gradient: "from-indigo-100 to-blue-50" },
  { title: "拼图", desc: "1秒拼出高级感", href: "/coming-soon?tool=collage", icon: Combine, gradient: "from-violet-100 to-purple-50" },
  { title: "AI 扩图", desc: "轻松延展画面", href: "/expand", icon: Expand, gradient: "from-cyan-100 to-teal-50" },
  { title: "形象照", desc: "一键换脸变装", href: "/coming-soon?tool=portrait", icon: UserCircle, gradient: "from-rose-100 to-pink-50" },
  { title: "图片批处理", desc: "一站式批量修图", href: "/coming-soon?tool=batch-edit", icon: GridIcon, gradient: "from-neutral-100 to-neutral-50" },
];

/* ── AI 设计 ────────────────────────────────── */
const designTools = [
  { title: "AI Logo", desc: "在线智能Logo生成", href: "/coming-soon?tool=logo", icon: FileType, gradient: "from-green-100 to-emerald-50" },
  { title: "AI 图文笔记", desc: "爆款图文批量一键排版", href: "/coming-soon?tool=note", icon: ImageIcon, gradient: "from-amber-100 to-orange-50" },
  { title: "LivePPT", desc: "一句话生成高质量PPT", href: "/coming-soon?tool=ppt", icon: Presentation, gradient: "from-blue-100 to-indigo-50" },
  { title: "AI 文案", desc: "10秒生成爆款文案", href: "/coming-soon?tool=copywriting", icon: Type, gradient: "from-purple-100 to-violet-50" },
  { title: "AI 海报", desc: "一键生成宣传海报", href: "/poster", icon: Wand2, gradient: "from-red-100 to-rose-50" },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } } };

function ToolCard({ title, desc, href, icon: Icon, gradient }: { title: string; desc: string; href: string; icon: React.ElementType; gradient: string }) {
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
      <Link
        href={href}
        className="group rounded-2xl overflow-hidden border border-neutral-200/60 dark:border-neutral-800/60 bg-white/80 dark:bg-neutral-900/80 hover:shadow-lg hover:border-neutral-200 dark:hover:border-neutral-700 transition-all block"
      >
        <div className={`aspect-[4/3] bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}>
          <Icon size={28} className="text-neutral-400/30 group-hover:scale-110 transition-transform duration-300" />
          <div className="absolute bottom-2 left-2 p-1.5 rounded-lg glass-subtle">
            <Icon size={14} className="text-neutral-500" />
          </div>
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
        </div>
        <div className="px-3 py-2.5">
          <h3 className="text-sm font-semibold text-neutral-900 mb-0.5">{title}</h3>
          <p className="text-xs text-neutral-400 truncate">{desc}</p>
        </div>
      </Link>
    </motion.div>
  );
}

type ToolItem = { title: string; desc: string; href: string; icon: React.ElementType; gradient: string; moduleKey?: string };

function filterTools(tools: ToolItem[], query: string) {
  if (!query.trim()) return tools;
  const q = query.toLowerCase();
  return tools.filter((t) => t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q));
}

export default function ToolsPage() {
  usePageTitle("AI 工具");
  const [searchQuery, setSearchQuery] = useState("");
  const { isEnabled, loaded, fetchModules } = useModulesStore();

  useEffect(() => {
    if (!loaded) fetchModules();
  }, [loaded, fetchModules]);

  const filterModules = (tools: ToolItem[]) =>
    tools.filter((t) => !t.moduleKey || isEnabled(t.moduleKey));

  const filteredShoot = filterModules(filterTools(aiShootTools, searchQuery));
  const filteredImage = filterTools(imageTools, searchQuery);
  const filteredDesign = filterTools(designTools, searchQuery);
  const hasResults = filteredShoot.length > 0 || filteredImage.length > 0 || filteredDesign.length > 0;
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="h-full flex flex-col bg-[#fafafa] dark:bg-[#0A0A0A]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center">
              <GridIcon size={16} className="text-neutral-400" />
            </div>
            <h1 className="text-base font-semibold text-neutral-900">工具中心</h1>
          </div>
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索工具..."
              className="w-full pl-8 pr-4 py-2 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white/60 dark:bg-neutral-800/60 text-sm outline-none focus:border-neutral-300 dark:focus:border-neutral-600 focus:bg-white dark:focus:bg-neutral-800 focus:shadow-sm transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-10">
        {/* Recent — hide when searching */}
        {!isSearching && (
          <motion.section initial="hidden" animate="visible" variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-sm font-medium text-neutral-400 mb-3">最近使用</motion.h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2">
              {recentTools.map((t) => {
                const Icon = t.icon;
                return (
                  <motion.div key={t.label} variants={fadeUp} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link
                      href={t.href}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/80 glass-subtle border border-white/60 hover:shadow-sm transition-all text-sm text-neutral-600 btn-press"
                    >
                      <Icon size={14} className="text-neutral-400 shrink-0" />
                      <span className="truncate">{t.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* AI 商拍 */}
        {filteredShoot.length > 0 && (
          <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-lg font-bold text-neutral-900 mb-4">AI 商拍</motion.h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {filteredShoot.map((t) => (
                <ToolCard key={t.title} {...t} />
              ))}
            </div>
          </motion.section>
        )}

        {/* 图像处理 */}
        {filteredImage.length > 0 && (
          <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-lg font-bold text-neutral-900 mb-4">图像处理</motion.h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {filteredImage.map((t) => (
                <ToolCard key={t.title} {...t} />
              ))}
            </div>
          </motion.section>
        )}

        {/* AI 设计 */}
        {filteredDesign.length > 0 && (
          <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-lg font-bold text-neutral-900 mb-4">AI 设计</motion.h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {filteredDesign.map((t) => (
                <ToolCard key={t.title} {...t} />
              ))}
            </div>
          </motion.section>
        )}

        {/* No results */}
        {isSearching && !hasResults && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search size={32} className="text-neutral-200 mb-3" />
            <p className="text-sm text-neutral-500">未找到“{searchQuery}”相关工具</p>
            <p className="text-xs text-neutral-400 mt-1">试试其他关键词</p>
          </div>
        )}
      </div>
    </div>
  );
}
