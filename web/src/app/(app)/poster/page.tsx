"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, Sparkles, Loader2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { imageAPI } from "@/lib/api";

const CATEGORIES = ["全部", "电商促销", "社交媒体", "节日", "美食", "教育", "科技", "地产"];
const SIZES = [
  { name: "手机海报", size: "1080×1920" },
  { name: "方形", size: "1080×1080" },
  { name: "横版", size: "1920×1080" },
  { name: "A4", size: "2480×3508" },
];

export default function PosterPage() {
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("全部");
  const [posterSize, setPosterSize] = useState("1080×1920");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  return (
    <div className="flex h-full">
      {/* Left controls */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
        className="w-[360px] border-r border-neutral-100 bg-white/80 backdrop-blur-sm flex flex-col shrink-0"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100/60">
          <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-200/50">
            <ImageIcon size={16} className="text-white" />
          </motion.div>
          <div>
            <h1 className="text-sm font-semibold text-neutral-900">AI 海报</h1>
            <p className="text-xs text-neutral-400">描述需求，一键生成海报</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">海报描述</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="描述你要生成的海报内容，如：双十一电商促销活动，红色主题，大字标题50%off..."
              className="w-full px-3 py-2 rounded-lg border border-neutral-200/60 text-sm outline-none focus:border-neutral-300 focus:shadow-sm resize-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">分类</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs transition-colors",
                    category === c ? "bg-purple-500 text-white" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">尺寸</label>
            <div className="grid grid-cols-2 gap-2">
              {SIZES.map((s) => (
                <button
                  key={s.size}
                  onClick={() => setPosterSize(s.size)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-all",
                    posterSize === s.size ? "border-purple-500 bg-purple-50/50" : "border-neutral-200/60 hover:border-neutral-300"
                  )}
                >
                  <span className="font-medium text-neutral-900">{s.name}</span>
                  <span className="text-neutral-400">{s.size}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">主标题文字 (可选)</label>
            <input
              type="text"
              placeholder="例如：限时特惠"
              className="w-full px-3 py-2 rounded-lg border border-neutral-200/60 text-sm outline-none focus:border-neutral-300 focus:shadow-sm transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">副标题 (可选)</label>
            <input
              type="text"
              placeholder="例如：全场 5 折起"
              className="w-full px-3 py-2 rounded-lg border border-neutral-200/60 text-sm outline-none focus:border-neutral-300 focus:shadow-sm transition-colors"
            />
          </div>
        </div>

        <div className="p-5 border-t border-neutral-200/60">
          <button
            disabled={!prompt.trim() || generating}
            onClick={async () => {
              setGenerating(true);
              try {
                const res = await imageAPI.poster({ prompt, category, size: posterSize });
                setResults(Array.isArray(res.data?.data) ? res.data.data : [res.data?.data]);
              } catch (e) { console.error(e); }
              setGenerating(false);
            }}
            className="w-full py-2.5 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" /> 生成中...</>
            ) : (
              <><Sparkles size={16} /> 生成海报</>
            )}
          </button>
        </div>
      </motion.div>

      {/* Right: Preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex-1 p-6 overflow-y-auto bg-[#fafafa]"
      >
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {results.length > 0
            ? results.map((r: any, i: number) => (
                <div key={i} className="group relative aspect-[9/16] rounded-xl overflow-hidden border border-neutral-200/60 bg-white">
                  {r?.result_url ? (
                    <img src={r.result_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-xs text-neutral-400">{r?.status === 'pending' ? '生成中...' : '完成'}</p>
                    </div>
                  )}
                  <button className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download size={14} />
                  </button>
                </div>
              ))
            : [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-[9/16] rounded-xl bg-white border border-neutral-200/60 flex items-center justify-center">
                  <div className="text-center">
                    <ImageIcon size={28} className="mx-auto text-neutral-200 mb-2" />
                    <p className="text-xs text-neutral-300">海报 {i}</p>
                  </div>
                </div>
              ))}
        </div>
      </motion.div>
    </div>
  );
}
