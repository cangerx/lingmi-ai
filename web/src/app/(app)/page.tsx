"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Plus,
  Settings2,
  MapPin,
  Star,
  X,
  ChevronDown,
  PenTool,
  PlusSquare,
  ShoppingBag,
  FileText,
  Search as SearchIcon,
  Sparkles,
  Eraser,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════
   Agent 配置
   ═══════════════════════════════════════════════════════ */
interface DropdownOption { label: string; options: string[] }

interface AgentConfig {
  label: string;
  emoji: string;
  color: string;          // border & dot color when active
  borderColor: string;    // tailwind border class
  dropdowns: DropdownOption[];
  placeholder: string;
  cards: { title: string; images: string[] }[];
}

const AGENTS: AgentConfig[] = [
  {
    label: "电商商品Agent",
    emoji: "🛒",
    color: "#F75A60",
    borderColor: "border-red-400",
    dropdowns: [
      { label: "亚马逊", options: ["亚马逊", "Shopify", "速卖通", "独立站"] },
      { label: "美国", options: ["美国", "日本", "英国", "德国", "法国"] },
      { label: "英语", options: ["英语", "日语", "德语", "法语", "中文"] },
      { label: "1:1", options: ["1:1", "3:4", "4:3", "16:9", "9:16"] },
    ],
    placeholder: "可输入商品信息生成需求（如"帮我生成商品套图，商品更点是复古质感。"）",
    cards: [
      { title: "亚马逊套图", images: ["/images/ec1.webp"] },
      { title: "白底精修图", images: ["/images/ec2.webp"] },
      { title: "A+ 详情页", images: ["/images/ec3.webp"] },
      { title: "商品换背景", images: ["/images/ec4.webp"] },
    ],
  },
  {
    label: "服饰穿戴Agent",
    emoji: "👗",
    color: "#FF8C42",
    borderColor: "border-orange-400",
    dropdowns: [
      { label: "我需要定制模特", options: ["我需要定制模特", "使用默认模特"] },
      { label: "女性", options: ["女性", "男性"] },
      { label: "欧美白人", options: ["欧美白人", "亚洲人", "非裔", "混血"] },
      { label: "标准", options: ["标准", "高级", "精细"] },
      { label: "青年", options: ["青年", "中年", "少年"] },
      { label: "3:4", options: ["3:4", "1:1", "4:3", "9:16"] },
    ],
    placeholder: "可输入服饰图生成需求（如"帮我生成一个模特穿上这件衣服，展示该景为日常通勤。"）",
    cards: [
      { title: "服饰穿戴套图", images: ["/images/cloth1.webp"] },
      { title: "服装改色", images: ["/images/cloth2.webp"] },
      { title: "服饰白底精修图", images: ["/images/cloth3.webp"] },
      { title: "换模特", images: ["/images/cloth4.webp"] },
    ],
  },
  {
    label: "海报Agent",
    emoji: "🖼",
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
    emoji: "🎬",
    color: "#3382FD",
    borderColor: "border-blue-400",
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

/* ── Quick tool bar (bottom fixed) ──────────────── */
const quickTools = [
  { label: "图片编辑", desc: "导入图片，自由编辑", href: "/editor", icon: PenTool, boxed: true },
  { label: "创建设计", desc: "从空白画布开始设计", href: "/poster", icon: PlusSquare, boxed: true },
  { label: "商品套图", href: "/product-photo", icon: ShoppingBag, hot: true },
  { label: "A+/详情页", href: "/tools", icon: FileText },
  { label: "智能抠图", href: "/cutout", icon: SearchIcon },
  { label: "变清晰", href: "/upscale", icon: Sparkles },
  { label: "AI消除", href: "/eraser", icon: Eraser },
];

/* ── Tabs for second screen ──────────────────────── */
const tabs = ["最近打开", "一键同款", "海报模板", "热门", "商品图", "模特穿戴"];

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
function MiniDropdown({ label, options }: { label: string; options: string[] }) {
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
                onClick={() => { setValue(opt); setOpen(false); }}
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
   HomePage
   ═══════════════════════════════════════════════════════ */
export default function HomePage() {
  const [input, setInput] = useState("");
  const [activeAgent, setActiveAgent] = useState(0);
  const [activeTab, setActiveTab] = useState("热门");
  const agent = AGENTS[activeAgent];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#fafafa] relative pb-16">
      {/* ═══════ FIRST SCREEN ═══════ */}
      <section className="pt-10 pb-6 px-6 relative overflow-hidden min-h-[calc(100vh-120px)] flex flex-col">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-gradient-to-br from-blue-200/35 to-cyan-200/20 rounded-full blur-3xl" />
          <div className="absolute top-[5%] right-[-5%] w-[450px] h-[450px] bg-gradient-to-br from-purple-200/30 to-violet-200/15 rounded-full blur-3xl" />
          <div className="absolute bottom-[10%] left-[30%] w-[350px] h-[350px] bg-gradient-to-br from-pink-200/20 to-orange-200/10 rounded-full blur-3xl" />
        </div>

        <motion.div
          className="max-w-3xl mx-auto text-center relative z-10 flex-1 flex flex-col"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Title */}
          <motion.h1 variants={fadeUp} className="text-3xl font-bold text-neutral-900 mb-6 tracking-tight">
            和我聊聊，你想要什么设计~
          </motion.h1>

          {/* Agent tags */}
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-2.5 mb-6">
            {AGENTS.map((a, i) => (
              <motion.button
                key={a.label}
                onClick={() => setActiveAgent(i)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-all border-2",
                  activeAgent === i
                    ? `bg-white ${a.borderColor} shadow-sm font-medium text-neutral-900`
                    : "bg-white/70 border-transparent text-neutral-500 hover:bg-white hover:border-neutral-200"
                )}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: a.color }}
                />
                <span>{a.label}</span>
                {activeAgent === i && (
                  <X size={14} className="text-neutral-400 ml-0.5" />
                )}
              </motion.button>
            ))}
          </motion.div>

          {/* Chat input area */}
          <motion.div
            variants={scaleUp}
            className="rounded-2xl overflow-hidden shadow-lg"
            style={{
              background: "white",
              border: `2px solid color-mix(in srgb, ${agent.color} 30%, transparent)`,
            }}
          >
            {/* Dropdown selectors row */}
            <div className="flex items-center gap-1 px-4 pt-3 pb-1 flex-wrap">
              {agent.dropdowns.length > 0 && agent.label === "电商商品Agent" && (
                <input
                  type="text"
                  placeholder="请输入产品名称"
                  className="text-xs text-neutral-600 placeholder:text-neutral-400 outline-none bg-transparent w-28 px-1 py-1 border-b border-transparent focus:border-neutral-300 transition-colors"
                />
              )}
              {agent.label === "海报Agent" && (
                <input
                  type="text"
                  placeholder="请输入主标题"
                  className="text-xs text-neutral-600 placeholder:text-neutral-400 outline-none bg-transparent w-24 px-1 py-1 border-b border-transparent focus:border-neutral-300 transition-colors"
                />
              )}
              {agent.dropdowns.map((dd) => (
                <MiniDropdown key={dd.label} label={dd.label} options={dd.options} />
              ))}
            </div>

            {/* Textarea */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={agent.placeholder}
              rows={3}
              className="w-full resize-none px-5 pt-2 pb-2 text-sm outline-none bg-transparent placeholder:text-neutral-400"
            />

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-100/60">
              <div className="flex items-center gap-1">
                <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-neutral-500 hover:bg-neutral-50 transition-colors">
                  <Plus size={14} /> 添加
                </button>
                <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-50 text-[11px] text-neutral-500">
                  <Settings2 size={12} /> seedance 2.0
                </span>
                <button className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-50 transition-colors"><MapPin size={15} /></button>
                <button className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-50 transition-colors"><Settings2 size={15} /></button>
                <button className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-50 transition-colors"><Star size={15} /></button>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium text-white shadow-md transition-all"
                style={{ backgroundColor: agent.color }}
              >
                <Send size={14} /> 发送
              </motion.button>
            </div>
          </motion.div>

          {/* Feature cards below input */}
          <motion.div variants={fadeUp} className="mt-6 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeAgent}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-4 gap-4"
              >
                {agent.cards.map((card) => (
                  <div
                    key={card.title}
                    className="group rounded-2xl bg-gradient-to-b from-neutral-50 to-white border border-neutral-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    <div className="px-4 pt-3 pb-2">
                      <h3 className="text-sm font-semibold text-neutral-800">{card.title}</h3>
                    </div>
                    <div className="px-3 pb-3 flex justify-center">
                      <Image
                        src={card.images[0]}
                        alt={card.title}
                        width={240}
                        height={120}
                        className="rounded-lg object-cover w-full h-[100px] group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════ SECOND SCREEN — Tab Content ═══════ */}
      <section className="px-6 pb-12">
        <div className="max-w-5xl mx-auto">
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative px-4 py-2 rounded-xl text-sm transition-all",
                  activeTab === tab
                    ? "text-white font-medium"
                    : "text-neutral-500 hover:bg-neutral-100/80 hover:text-neutral-700"
                )}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-0 bg-neutral-900 rounded-xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            ))}
          </div>

          {/* Showcase Grid */}
          <motion.div
            className="mb-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-bold text-neutral-900">电商套图</h2>
              <p className="text-xs text-neutral-400">主图/详情/场景全套一次性生成！</p>
            </motion.div>
            <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {showcaseItems.map((item, i) => (
                <motion.div key={item.id} variants={fadeUp} custom={i}>
                  <Link
                    href="/product-photo"
                    className="group rounded-2xl overflow-hidden border border-white/60 card-hover gradient-border block"
                  >
                    <div className={cn("aspect-[3/4] bg-gradient-to-br relative overflow-hidden", item.gradient)}>
                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Section: 人物模特 */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-bold text-neutral-900">人物模特</h2>
              <p className="text-xs text-neutral-400">模特换脸、模特装扮拓展</p>
            </motion.div>
            <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {showcaseItems.slice(0, 6).map((item, i) => (
                <motion.div key={item.id + 100} variants={fadeUp} custom={i}>
                  <Link
                    href="/tools"
                    className="group rounded-2xl overflow-hidden border border-white/60 card-hover gradient-border block"
                  >
                    <div className={cn("aspect-[4/5] bg-gradient-to-br relative overflow-hidden", item.gradient)}>
                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ FIXED BOTTOM TOOLBAR ═══════ */}
      <div className="fixed bottom-0 left-[72px] right-0 z-30 bg-white/80 backdrop-blur-xl border-t border-neutral-100">
        <div className="max-w-5xl mx-auto flex items-center gap-1 px-4 py-2">
          {quickTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.label}
                href={tool.href}
                className={cn(
                  "flex items-center gap-2 shrink-0 transition-all text-xs",
                  tool.boxed
                    ? "px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:shadow-sm hover:border-neutral-300 mr-1"
                    : "px-3 py-2 rounded-lg text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
                )}
              >
                <Icon size={15} className={tool.boxed ? "text-neutral-700" : ""} />
                <span className={tool.boxed ? "font-medium text-neutral-800" : ""}>
                  {tool.label}
                  {tool.hot && <span className="ml-1 text-orange-500">🔥</span>}
                </span>
                {tool.boxed && tool.desc && (
                  <span className="text-[11px] text-neutral-400 ml-1 hidden lg:inline">{tool.desc}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
