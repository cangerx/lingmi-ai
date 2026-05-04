"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  Suspense,
  type WheelEvent as ReactWheelEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Download,
  Minus,
  Plus,
  Zap,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Move,
  RotateCcw,
  Image as ImageIcon,
  Pencil,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { imageAPI, generationAPI } from "@/lib/api";
import { downloadImage } from "@/lib/download";
import { usePageTitle } from "@/hooks/use-page-title";
import { useOptimizePrompt } from "@/hooks/use-optimize-prompt";

interface CanvasImage {
  id: string;
  genId?: number;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  prompt?: string;
}

const RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"];
const RATIO_LABELS: Record<string, string> = {
  "1:1": "方图",
  "3:4": "竖图",
  "4:3": "横图",
  "9:16": "长竖图",
  "16:9": "宽横图",
};

export default function GeneratePage() {
  return (
    <Suspense fallback={null}>
      <GenerateContent />
    </Suspense>
  );
}

function GenerateContent() {
  usePageTitle("AI 生图画板");
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState(searchParams.get("prompt") || "");
  const [ratio, setRatio] = useState("1:1");
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [refImage, setRefImage] = useState<string>("");
  const refInputRef = useRef<HTMLInputElement>(null);
  const { optimizing: promptOptimizing, optimize: optimizePrompt } = useOptimizePrompt();

  // Canvas state
  const [images, setImages] = useState<CanvasImage[]>([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const dragStart = useRef({ x: 0, y: 0, imgX: 0, imgY: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const nextPos = useRef({ x: 50, y: 50 });

  // Cleanup polls on unmount
  useEffect(() => {
    return () => {
      Object.values(pollRefs.current).forEach(clearInterval);
    };
  }, []);

  // Auto-generate
  const autoTriggered = useRef(false);
  useEffect(() => {
    const auto = searchParams.get("auto");
    if (auto === "1" && prompt.trim() && !autoTriggered.current && !generating) {
      autoTriggered.current = true;
      doGenerate();
    }
  }, [prompt]);

  const pollGeneration = useCallback((canvasId: string, genId: number) => {
    if (pollRefs.current[canvasId]) clearInterval(pollRefs.current[canvasId]);
    pollRefs.current[canvasId] = setInterval(async () => {
      try {
        const res = await generationAPI.get(genId);
        const gen = res.data?.data;
        if (gen?.status === "completed" || gen?.status === "failed") {
          setImages((prev) =>
            prev.map((img) =>
              img.id === canvasId
                ? {
                    ...img,
                    status: gen.status,
                    src: gen.result_url || img.src,
                    error: gen.error_msg,
                  }
                : img
            )
          );
          clearInterval(pollRefs.current[canvasId]);
          delete pollRefs.current[canvasId];
        }
      } catch {}
    }, 3000);
  }, []);

  const doGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    try {
      const res = await imageAPI.generate({
        prompt,
        ratio,
        n: count,
      });
      const gen = res.data?.data;
      const arr = Array.isArray(gen) ? gen : [gen];

      const newImages: CanvasImage[] = arr.map((g: any, i: number) => {
        const id = `img-${Date.now()}-${i}`;
        const x = nextPos.current.x + i * 320;
        const y = nextPos.current.y;
        return {
          id,
          genId: g?.id,
          src: g?.result_url || "",
          x,
          y,
          width: 300,
          height: ratio === "16:9" ? 169 : ratio === "9:16" ? 533 : ratio === "3:4" ? 400 : ratio === "4:3" ? 225 : 300,
          status: g?.status || "pending",
          error: g?.error_msg,
          prompt,
        };
      });

      nextPos.current.y += 360;
      if (nextPos.current.y > 1200) {
        nextPos.current = { x: nextPos.current.x + 340, y: 50 };
      }

      setImages((prev) => [...prev, ...newImages]);

      // Start polling for pending ones
      newImages.forEach((img) => {
        if (img.genId && img.status !== "completed") {
          pollGeneration(img.id, img.genId!);
        }
      });

      setGenerating(false);
    } catch (e) {
      console.error(e);
      setGenerating(false);
    }
  };

  // Re-generate from an existing image prompt
  const reGenerate = (img: CanvasImage) => {
    if (img.prompt) {
      setPrompt(img.prompt);
    }
  };

  // Canvas pan
  const handleCanvasPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    // Only pan if clicking on canvas background
    if ((e.target as HTMLElement).dataset.canvas === "bg") {
      setIsPanning(true);
      setSelectedId(null);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handleCanvasPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
    }
    if (draggingId) {
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;
      setImages((prev) =>
        prev.map((img) =>
          img.id === draggingId
            ? { ...img, x: dragStart.current.imgX + dx, y: dragStart.current.imgY + dy }
            : img
        )
      );
    }
  };

  const handleCanvasPointerUp = () => {
    setIsPanning(false);
    setDraggingId(null);
  };

  // Image drag
  const handleImagePointerDown = (e: ReactPointerEvent<HTMLDivElement>, img: CanvasImage) => {
    e.stopPropagation();
    setSelectedId(img.id);
    setDraggingId(img.id);
    dragStart.current = { x: e.clientX, y: e.clientY, imgX: img.x, imgY: img.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Zoom
  const handleWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((z) => Math.max(0.1, Math.min(3, z + delta)));
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const deleteImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (pollRefs.current[id]) {
      clearInterval(pollRefs.current[id]);
      delete pollRefs.current[id];
    }
  };

  const selectedImage = images.find((img) => img.id === selectedId);

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Left panel */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
        className="w-full md:w-[320px] border-b md:border-b-0 md:border-r border-neutral-100 bg-white/90 backdrop-blur-sm flex flex-col shrink-0 max-h-[40vh] md:max-h-none"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100/60">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-200/40">
            <ImageIcon size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-neutral-900">AI 生图画板</h1>
            <p className="text-xs text-neutral-400">文字生图 · 无限画板 · 二次编辑</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider">描述</label>
              <button
                onClick={() => optimizePrompt(prompt, setPrompt)}
                disabled={promptOptimizing || !prompt.trim()}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-colors",
                  promptOptimizing || !prompt.trim()
                    ? "text-neutral-300 cursor-not-allowed"
                    : "text-neutral-500 hover:bg-neutral-100/80"
                )}
              >
                {promptOptimizing ? (
                  <Loader2 size={11} className="text-amber-400 animate-spin" />
                ) : (
                  <Zap size={11} className="text-amber-400" />
                )}{" "}
                优化提示词
              </button>
            </div>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  doGenerate();
                }
              }}
              placeholder="描述你想生成的图片，如：赛博朋克风格城市夜景，霓虹灯光..."
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200/60 bg-neutral-50/50 text-sm outline-none focus:border-violet-300 focus:bg-white focus:shadow-sm resize-none transition-all"
            />
          </div>

          {/* Reference image */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">参考图（可选）</label>
            {refImage ? (
              <div className="relative w-full rounded-xl overflow-hidden border border-neutral-200/60 bg-neutral-50">
                <img src={refImage} alt="参考图" className="w-full h-28 object-cover" />
                <button
                  onClick={() => setRefImage("")}
                  className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => refInputRef.current?.click()}
                className="w-full h-20 rounded-xl border-2 border-dashed border-neutral-200/80 hover:border-violet-300 bg-neutral-50/50 flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <Upload size={16} className="text-neutral-300" />
                <span className="text-[11px] text-neutral-400">上传参考图</span>
              </button>
            )}
            <input
              ref={refInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => setRefImage(reader.result as string);
                  reader.readAsDataURL(file);
                }
                e.target.value = "";
              }}
            />
          </div>

          {/* Ratio */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">比例</label>
            <div className="flex gap-1">
              {RATIOS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRatio(r)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-[11px] transition-all text-center",
                    ratio === r
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100"
                  )}
                >
                  {RATIO_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">数量</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCount(Math.max(1, count - 1))}
                className="w-7 h-7 rounded-lg bg-neutral-50 flex items-center justify-center hover:bg-neutral-100 transition-colors"
              >
                <Minus size={12} className="text-neutral-500" />
              </button>
              <span className="text-sm font-semibold w-5 text-center text-neutral-900">{count}</span>
              <button
                onClick={() => setCount(Math.min(4, count + 1))}
                className="w-7 h-7 rounded-lg bg-neutral-50 flex items-center justify-center hover:bg-neutral-100 transition-colors"
              >
                <Plus size={12} className="text-neutral-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Generate button */}
        <div className="p-4 border-t border-neutral-100/60">
          <button
            disabled={!prompt.trim() || generating}
            onClick={doGenerate}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-200/50 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" /> 生成中...
              </>
            ) : (
              <>
                <Sparkles size={16} /> 生成图片
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Right: Infinite Canvas */}
      <div className="flex-1 relative overflow-hidden bg-[#f0f0f0]">
        {/* Canvas toolbar */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-neutral-200/60 p-1">
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.15))}
            className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            title="放大"
          >
            <ZoomIn size={14} className="text-neutral-600" />
          </button>
          <span className="text-[11px] text-neutral-500 min-w-[36px] text-center font-medium">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(0.1, z - 0.15))}
            className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            title="缩小"
          >
            <ZoomOut size={14} className="text-neutral-600" />
          </button>
          <div className="w-px h-4 bg-neutral-200 mx-0.5" />
          <button
            onClick={resetView}
            className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            title="重置视图"
          >
            <Maximize2 size={14} className="text-neutral-600" />
          </button>
        </div>

        {/* Selected image toolbar */}
        <AnimatePresence>
          {selectedImage && selectedImage.status === "completed" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-neutral-200/60 p-1"
            >
              <button
                onClick={() => selectedImage.src && downloadImage(selectedImage.src, `generate-${selectedImage.id}.png`)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100 transition-colors"
                title="下载"
              >
                <Download size={13} /> 下载
              </button>
              <button
                onClick={() => reGenerate(selectedImage)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100 transition-colors"
                title="重新生成"
              >
                <RotateCcw size={13} /> 重新生成
              </button>
              <button
                onClick={() => {
                  if (selectedImage.src) {
                    setPrompt(`基于这张图片进行修改：${selectedImage.prompt || ""}`);
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100 transition-colors"
                title="二次编辑"
              >
                <Pencil size={13} /> 编辑
              </button>
              <div className="w-px h-4 bg-neutral-200 mx-0.5" />
              <button
                onClick={() => deleteImage(selectedImage.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 transition-colors"
                title="删除"
              >
                <Trash2 size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Canvas area */}
        <div
          ref={canvasRef}
          data-canvas="bg"
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onWheel={handleWheel}
          style={{ touchAction: "none" }}
        >
          {/* Grid pattern */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
              backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
              backgroundPosition: `${pan.x % (24 * zoom)}px ${pan.y % (24 * zoom)}px`,
            }}
            data-canvas="bg"
          />

          {/* Transform layer */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
            className="absolute top-0 left-0"
            data-canvas="bg"
          >
            {images.map((img) => (
              <div
                key={img.id}
                onPointerDown={(e) => handleImagePointerDown(e, img)}
                className={cn(
                  "absolute rounded-xl overflow-hidden bg-white shadow-md transition-shadow select-none",
                  selectedId === img.id && "ring-2 ring-violet-500 shadow-lg shadow-violet-200/30",
                  draggingId === img.id && "opacity-90",
                  img.status === "completed" ? "cursor-move" : "cursor-default"
                )}
                style={{
                  left: img.x,
                  top: img.y,
                  width: img.width,
                }}
              >
                {img.status === "completed" && img.src ? (
                  <img
                    src={img.src}
                    alt={img.prompt || ""}
                    className="w-full object-contain pointer-events-none"
                    draggable={false}
                  />
                ) : img.status === "failed" ? (
                  <div
                    className="flex items-center justify-center bg-red-50/50"
                    style={{ height: img.height }}
                  >
                    <div className="text-center px-4">
                      <p className="text-xs text-red-400 font-medium mb-1">生成失败</p>
                      <p className="text-[10px] text-red-300 line-clamp-2">{img.error || "未知错误"}</p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center bg-neutral-50"
                    style={{ height: img.height }}
                  >
                    <div className="text-center">
                      <Loader2 size={24} className="mx-auto text-violet-400 animate-spin mb-2" />
                      <p className="text-xs text-neutral-400">生成中...</p>
                    </div>
                  </div>
                )}
                {/* Image label */}
                {img.prompt && (
                  <div className="px-2.5 py-1.5 border-t border-neutral-100 bg-white">
                    <p className="text-[10px] text-neutral-400 truncate">{img.prompt}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty state */}
          {images.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" data-canvas="bg">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/80 border border-neutral-200/60 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <ImageIcon size={28} className="text-neutral-300" />
                </div>
                <p className="text-sm text-neutral-400 font-medium">无限画板</p>
                <p className="text-xs text-neutral-300 mt-1">输入描述生成图片，拖拽排列，二次编辑</p>
                <p className="text-[11px] text-neutral-300 mt-3">
                  <span className="px-1.5 py-0.5 bg-white rounded text-neutral-400 border border-neutral-200/60 text-[10px]">滚轮</span> 缩放
                  <span className="mx-2">·</span>
                  <span className="px-1.5 py-0.5 bg-white rounded text-neutral-400 border border-neutral-200/60 text-[10px]">拖拽</span> 平移
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
