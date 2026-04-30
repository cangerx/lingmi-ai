"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Upload, Loader2, ArrowRight, Sparkles, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { imageAPI } from "@/lib/api";

const SCENES = [
  { name: "白底", preview: "bg-white" },
  { name: "场景", preview: "bg-gradient-to-br from-amber-50 to-orange-100" },
  { name: "户外", preview: "bg-gradient-to-br from-green-50 to-emerald-100" },
  { name: "室内", preview: "bg-gradient-to-br from-blue-50 to-indigo-100" },
  { name: "节日", preview: "bg-gradient-to-br from-red-50 to-pink-100" },
  { name: "简约", preview: "bg-gradient-to-br from-neutral-50 to-neutral-100" },
];

const RATIOS = ["1:1", "3:4", "4:3", "16:9", "9:16"];

export default function ProductPhotoPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [activeScene, setActiveScene] = useState("白底");
  const [activeRatio, setActiveRatio] = useState("1:1");
  const [generating, setGenerating] = useState(false);
  const [count, setCount] = useState(4);
  const [results, setResults] = useState<any[]>([]);
  const [prompt, setPrompt] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="flex h-full">
      {/* Left: Upload & Controls */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
        className="w-[360px] border-r border-neutral-100 bg-white/80 backdrop-blur-sm flex flex-col shrink-0"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100/60">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-200/50"
          >
            <ShoppingBag size={16} className="text-white" />
          </motion.div>
          <div>
            <h1 className="text-sm font-semibold text-neutral-900">AI 商品图</h1>
            <p className="text-xs text-neutral-400">上传商品，一键生成场景图</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Upload */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">上传商品图</label>
            {previewUrl ? (
              <div className="relative group">
                <img src={previewUrl} alt="" className="w-full rounded-xl border border-neutral-200/60 object-contain max-h-[200px]" />
                <button
                  onClick={() => { setUploadedFile(null); setPreviewUrl(""); }}
                  className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  更换
                </button>
              </div>
            ) : (
              <label
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed border-neutral-200 hover:border-blue-300 bg-neutral-50/50 cursor-pointer transition-colors"
              >
                <Upload size={28} className="text-neutral-300" />
                <p className="text-sm text-neutral-500">点击或拖拽上传</p>
                <p className="text-xs text-neutral-400">支持 JPG/PNG/WebP</p>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            )}
          </div>

          {/* Scene */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">选择场景</label>
            <div className="grid grid-cols-3 gap-2">
              {SCENES.map((scene) => (
                <button
                  key={scene.name}
                  onClick={() => setActiveScene(scene.name)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all",
                    activeScene === scene.name
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-neutral-200/60 hover:border-neutral-300"
                  )}
                >
                  <div className={cn("w-full aspect-square rounded-md", scene.preview)} />
                  <span className="text-xs text-neutral-600">{scene.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ratio */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">图片比例</label>
            <div className="flex gap-2">
              {RATIOS.map((r) => (
                <button
                  key={r}
                  onClick={() => setActiveRatio(r)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs transition-colors",
                    activeRatio === r
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">生成数量</label>
            <div className="flex gap-2">
              {[1, 2, 4, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={cn(
                    "w-10 h-10 rounded-lg text-sm transition-colors",
                    count === n
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">补充描述 (可选)</label>
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述你想要的背景或风格..."
              className="w-full px-3 py-2 rounded-xl border border-neutral-200/60 bg-white/60 text-sm outline-none focus:border-neutral-300 focus:shadow-sm resize-none transition-all"
            />
          </div>
        </div>

        <div className="p-5 border-t border-neutral-200/60">
          <button
            disabled={!uploadedFile || generating}
            onClick={async () => {
              if (!uploadedFile) return;
              setGenerating(true);
              try {
                const fd = new FormData();
                fd.append("image", uploadedFile);
                fd.append("scene", activeScene);
                fd.append("ratio", activeRatio);
                fd.append("count", String(count));
                if (prompt) fd.append("prompt", prompt);
                const res = await imageAPI.productPhoto(fd);
                setResults(Array.isArray(res.data?.data) ? res.data.data : [res.data?.data]);
              } catch (e: any) {
                console.error(e);
              } finally {
                setGenerating(false);
              }
            }}
            className="w-full py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" /> 生成中...</>
            ) : (
              <><Sparkles size={16} /> 一键生成</>
            )}
          </button>
        </div>
      </motion.div>

      {/* Right: Result grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex-1 p-6 overflow-y-auto bg-[#fafafa]"
      >
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {results.length > 0
            ? results.map((r: any, i: number) => (
                <div key={i} className="group relative rounded-2xl overflow-hidden border border-neutral-200/60 bg-white/80 shadow-sm hover:shadow-md transition-all">
                  {r?.result_url ? (
                    <img src={r.result_url} alt="" className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="aspect-square flex items-center justify-center">
                      <p className="text-xs text-neutral-400">{r?.status === 'pending' ? '处理中...' : '生成完成'}</p>
                    </div>
                  )}
                  <button className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download size={14} />
                  </button>
                </div>
              ))
            : Array.from({ length: count }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-white/80 border border-neutral-200/60 flex items-center justify-center shadow-sm">
                  <div className="text-center">
                    <ShoppingBag size={28} className="mx-auto text-neutral-200 mb-2" />
                    <p className="text-xs text-neutral-300">生成结果 {i + 1}</p>
                  </div>
                </div>
              ))}
        </div>
      </motion.div>
    </div>
  );
}
