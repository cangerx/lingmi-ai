"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Sparkles,
  Loader2,
  Minus,
  Plus,
  Zap,
  Image as ImageIcon,
  Upload,
  X,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { imageAPI, generationAPI, modelAPI } from "@/lib/api";
import { usePageTitle } from "@/hooks/use-page-title";
import { useOptimizePrompt } from "@/hooks/use-optimize-prompt";
import ImageNodeComponent, { type ImageNodeData } from "./components/ImageNode";
import { CanvasProvider } from "./components/CanvasContext";
import ContextMenu, { type ContextMenuProps } from "./components/ContextMenu";

type ImageNode = Node<ImageNodeData, "image">;

const nodeTypes: NodeTypes = {
  image: ImageNodeComponent,
};

const RATIO_LABELS: Record<string, string> = {
  auto: "自适应", "1:1": "方图", "2:3": "竖图", "3:4": "竖图",
  "4:5": "竖图", "9:16": "长竖图", "3:2": "横图", "4:3": "横图",
  "5:4": "横图", "16:9": "宽横图", "21:9": "超宽",
};
const RESOLUTION_LABELS: Record<string, string> = { "1K": "标清 1K", "2K": "高清 2K", "4K": "超清 4K" };
const QUALITY_LABELS: Record<string, string> = { low: "低画质", medium: "标准", standard: "标准", high: "高清", hd: "高清" };
const FALLBACK_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"];


const STYLES = [
  { label: "智能", value: "" },
  { label: "写实摄影", value: "photographic" },
  { label: "数字艺术", value: "digital-art" },
  { label: "动漫", value: "anime" },
  { label: "3D渲染", value: "3d-render" },
  { label: "插画", value: "illustration" },
  { label: "油画", value: "oil-painting" },
  { label: "水彩", value: "watercolor" },
  { label: "像素艺术", value: "pixel-art" },
];

interface ImageModelConfig {
  resolutions?: { values: string[]; default: string };
  ratios?: { values: string[]; default: string };
  qualities?: { values: string[]; default: string };
  max_count?: { values: string[]; default: string };
  formats?: { values: string[]; default: string };
  backgrounds?: { values: string[]; default: string };
}
interface ImageModel {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  provider?: string;
  price_per_call: number;
  badge?: string;
  tags?: string[];
  versions?: { name: string; model: string; tag?: string }[];
  config: ImageModelConfig;
}

export default function GeneratePage() {
  return (
    <Suspense fallback={null}>
      <ReactFlowProvider>
        <GenerateContent />
      </ReactFlowProvider>
    </Suspense>
  );
}

function GenerateContent() {
  usePageTitle("AI 生图画板");
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState(searchParams.get("prompt") || "");
  const [ratio, setRatio] = useState("1:1");
  const [resolution, setResolution] = useState("");
  const [quality, setQuality] = useState("");
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [refImage, setRefImage] = useState<string>("");
  const refInputRef = useRef<HTMLInputElement>(null);
  const { optimizing: promptOptimizing, optimize: optimizePrompt } = useOptimizePrompt();

  // Model & style state
  const [models, setModels] = useState<ImageModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [showModelPicker, setShowModelPicker] = useState(false);

  function applyDefaults(m: ImageModel) {
    const cfg = m.config;
    if (cfg?.resolutions) setResolution(cfg.resolutions.default || cfg.resolutions.values[0] || "");
    else setResolution("");
    if (cfg?.ratios) setRatio(cfg.ratios.default || cfg.ratios.values[0] || "1:1");
    if (cfg?.qualities) setQuality(cfg.qualities.default || cfg.qualities.values[0] || "");
    else setQuality("");
    const mc = parseInt(cfg?.max_count?.default || "4", 10);
    setCount((prev) => Math.min(prev, mc) || 1);
  }

  function selectModel(name: string) {
    setSelectedModel(name);
    const m = models.find((x) => x.name === name);
    if (m) applyDefaults(m);
  }

  const urlModel = searchParams.get("model") || "";
  useEffect(() => {
    modelAPI.imageModels().then((res) => {
      const list: ImageModel[] = res.data?.data ?? [];
      setModels(list);
      const match = urlModel && list.find((m: ImageModel) => m.name === urlModel);
      if (match) {
        setSelectedModel(match.name);
        applyDefaults(match);
      } else if (list.length > 0 && !selectedModel) {
        setSelectedModel(list[0].name);
        applyDefaults(list[0]);
      }
    }).catch(() => {});
  }, []);

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState<ImageNode>([]);
  const reactFlowInstance = useReactFlow();
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const nextPos = useRef({ x: 50, y: 50 });

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<Omit<ContextMenuProps, "onClose"> | null>(null);
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: ImageNode) => {
    event.preventDefault();
    setCtxMenu({
      nodeId: node.id,
      src: node.data.src,
      prompt: node.data.prompt,
      status: node.data.status,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);
  const onPaneClick = useCallback(() => setCtxMenu(null), []);

  // Cleanup polls on unmount
  useEffect(() => {
    return () => {
      Object.values(pollRefs.current).forEach(clearInterval);
    };
  }, []);

  // Load existing image from URL param (e.g. from works page)
  const imageLoaded = useRef(false);
  useEffect(() => {
    const imageUrl = searchParams.get("image");
    if (imageUrl && !imageLoaded.current) {
      imageLoaded.current = true;
      const id = `img-loaded-${Date.now()}`;
      setNodes((nds) => [
        ...nds,
        {
          id,
          type: "image" as const,
          position: { x: 50, y: 50 },
          data: {
            src: imageUrl,
            status: "completed" as const,
            prompt: searchParams.get("prompt") || "",
            displayWidth: 300,
            displayHeight: 300,
          },
        },
      ]);
      nextPos.current = { x: 50, y: 420 };
    }
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

  const pollGeneration = useCallback((nodeId: string, genId: number) => {
    if (pollRefs.current[nodeId]) clearInterval(pollRefs.current[nodeId]);
    pollRefs.current[nodeId] = setInterval(async () => {
      try {
        const res = await generationAPI.get(genId);
        const gen = res.data?.data;
        if (gen?.status === "completed" || gen?.status === "failed") {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === nodeId
                ? { ...n, data: { ...n.data, status: gen.status, src: gen.result_url || n.data.src, error: gen.error_msg } }
                : n
            )
          );
          clearInterval(pollRefs.current[nodeId]);
          delete pollRefs.current[nodeId];
        }
      } catch {}
    }, 3000);
  }, [setNodes]);

  const getDisplayHeight = useCallback((r: string) => {
    return r === "16:9" ? 169 : r === "9:16" ? 533 : r === "3:4" ? 400 : r === "4:3" ? 225 : 300;
  }, []);

  const handleReGenerate = useCallback((p: string) => setPrompt(p), []);
  const handleEdit = useCallback((p: string) => setPrompt(`基于这张图片进行修改：${p}`), []);
  const handleDelete = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    if (pollRefs.current[id]) {
      clearInterval(pollRefs.current[id]);
      delete pollRefs.current[id];
    }
  }, [setNodes]);

  const doGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    try {
      const stylePrefix = selectedStyle ? `Style: ${selectedStyle}. ` : "";
      const res = await imageAPI.generate({
        prompt: stylePrefix + prompt,
        ratio,
        resolution: resolution || undefined,
        quality: quality || undefined,
        n: count,
        model: selectedModel || undefined,
      });
      const gen = res.data?.data;
      const arr = Array.isArray(gen) ? gen : [gen];
      const displayHeight = getDisplayHeight(ratio);

      const newNodes: ImageNode[] = arr.map((g: any, i: number) => {
        const id = `img-${Date.now()}-${i}`;
        const x = nextPos.current.x + i * 320;
        const y = nextPos.current.y;
        return {
          id,
          type: "image" as const,
          position: { x, y },
          data: {
            src: g?.result_url || "",
            status: g?.status || "pending",
            error: g?.error_msg,
            prompt,
            genId: g?.id,
            displayWidth: 300,
            displayHeight,
          },
        };
      });

      nextPos.current.y += displayHeight + 60;
      if (nextPos.current.y > 1200) {
        nextPos.current = { x: nextPos.current.x + 340, y: 50 };
      }

      setNodes((nds) => [...nds, ...newNodes]);

      // Start polling for pending ones
      newNodes.forEach((node) => {
        if (node.data.genId && node.data.status !== "completed") {
          pollGeneration(node.id, node.data.genId as number);
        }
      });

      setGenerating(false);
    } catch (e) {
      console.error(e);
      setGenerating(false);
    }
  };

  const canvasCallbacks = useMemo(() => ({
    onReGenerate: handleReGenerate,
    onEdit: handleEdit,
    onDelete: handleDelete,
  }), [handleReGenerate, handleEdit, handleDelete]);

  const currentModel = models.find((m) => m.name === selectedModel);
  const cfg = currentModel?.config;
  const maxCount = parseInt(cfg?.max_count?.default || "4", 10);

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Left panel */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
        className="w-full md:w-[320px] border-b md:border-b-0 md:border-r border-neutral-100 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm flex flex-col shrink-0 max-h-[40vh] md:max-h-none"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100/60 dark:border-neutral-800/60">
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
              <motion.button
                whileHover={!promptOptimizing && prompt.trim() ? { scale: 1.05, y: -1 } : {}}
                whileTap={!promptOptimizing && prompt.trim() ? { scale: 0.93 } : {}}
                onClick={() => optimizePrompt(prompt, setPrompt)}
                disabled={promptOptimizing || !prompt.trim()}
                className={cn(
                  "relative flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-300",
                  promptOptimizing
                    ? "bg-amber-50 text-amber-600 shadow-sm shadow-amber-100/60"
                    : !prompt.trim()
                      ? "text-neutral-300 cursor-not-allowed"
                      : "text-neutral-500 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-600 hover:shadow-sm hover:shadow-amber-100/50"
                )}
                title="AI 优化提示词"
              >
                <AnimatePresence mode="wait">
                  {promptOptimizing ? (
                    <motion.span key="spin" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.2 }}>
                      <Loader2 size={11} className="text-amber-500 animate-spin" />
                    </motion.span>
                  ) : (
                    <motion.span key="zap" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, rotate: 90 }}
                      transition={{ duration: 0.2 }}>
                      <Zap size={11} className="text-amber-400" />
                    </motion.span>
                  )}
                </AnimatePresence>
                {promptOptimizing ? "优化中…" : "优化提示词"}
                {promptOptimizing && (
                  <motion.span
                    className="absolute inset-0 rounded-lg border border-amber-300/40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.button>
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
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 bg-neutral-50/50 dark:bg-neutral-800/50 text-sm outline-none focus:border-violet-300 dark:focus:border-violet-500 focus:bg-white dark:focus:bg-neutral-800 focus:shadow-sm resize-none transition-all"
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

          {/* Model Selector */}
          <div className="relative">
            <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">模型</label>
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 bg-neutral-50/50 dark:bg-neutral-800/50 hover:bg-white dark:hover:bg-neutral-800 hover:border-violet-300 dark:hover:border-violet-500 transition-all text-sm"
            >
              <span className="text-neutral-800 dark:text-neutral-200 font-medium truncate">
                {models.find((m) => m.name === selectedModel)?.display_name || selectedModel || "选择模型"}
              </span>
              <ChevronDown size={14} className={cn("text-neutral-400 transition-transform", showModelPicker && "rotate-180")} />
            </button>
            {showModelPicker && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowModelPicker(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl max-h-[360px] overflow-y-auto">
                  {models.map((m) => {
                    const badgeColors: Record<string, string> = { Hot: "bg-red-100 text-red-600", New: "bg-emerald-100 text-emerald-600", Pro: "bg-violet-100 text-violet-600" };
                    return (
                      <button
                        key={m.name}
                        onClick={() => { selectModel(m.name); setShowModelPicker(false); }}
                        className={cn(
                          "w-full px-3 py-3 hover:bg-neutral-50 transition-colors text-left border-b border-neutral-100/60 last:border-b-0",
                          selectedModel === m.name && "bg-violet-50/60"
                        )}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-neutral-800">{m.display_name}</span>
                            {m.badge && <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", badgeColors[m.badge] || "bg-neutral-100 text-neutral-500")}>{m.badge}</span>}
                          </div>
                          <span className={cn("text-[11px] font-medium", m.price_per_call > 0 ? "text-amber-600" : "text-emerald-600")}>
                            {m.price_per_call > 0 ? `${m.price_per_call} 积分` : "免费"}
                          </span>
                        </div>
                        {m.description && <p className="text-[11px] text-neutral-500 leading-relaxed line-clamp-2">{m.description}</p>}
                        {m.tags && m.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {m.tags.map((tag: string) => (
                              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500">{tag}</span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Style Selector */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">风格</label>
            <div className="flex flex-wrap gap-1.5">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSelectedStyle(s.value)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-[11px] transition-all",
                    selectedStyle === s.value
                      ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-sm"
                      : "bg-neutral-50 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution - from model config */}
          {cfg?.resolutions && cfg.resolutions.values.length > 0 && (
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">分辨率</label>
              <div className="flex rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 p-0.5">
                {cfg.resolutions.values.map((r) => (
                  <button
                    key={r}
                    onClick={() => setResolution(r)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs transition-all",
                      resolution === r
                        ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm font-medium"
                        : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    )}
                  >
                    {RESOLUTION_LABELS[r] || r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Aspect Ratio - from model config or fallback */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">宽高比</label>
            <div className="flex flex-wrap gap-1.5">
              {(cfg?.ratios?.values || FALLBACK_RATIOS).map((r) => (
                <button
                  key={r}
                  onClick={() => setRatio(r)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-[11px] transition-all",
                    ratio === r
                      ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-sm"
                      : "bg-neutral-50 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  )}
                >
                  {RATIO_LABELS[r] || r}
                </button>
              ))}
            </div>
          </div>

          {/* Quality - from model config */}
          {cfg?.qualities && cfg.qualities.values.length > 0 && (
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">图像质量</label>
              <div className="flex rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 p-0.5">
                {cfg.qualities.values.map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs transition-all",
                      quality === q
                        ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm font-medium"
                        : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    )}
                  >
                    {QUALITY_LABELS[q] || q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Count */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">数量</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCount(Math.max(1, count - 1))}
                className="w-7 h-7 rounded-lg bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                <Minus size={12} className="text-neutral-500" />
              </button>
              <span className="text-sm font-semibold w-5 text-center text-neutral-900 dark:text-neutral-100">{count}</span>
              <button
                onClick={() => setCount(Math.min(maxCount, count + 1))}
                className="w-7 h-7 rounded-lg bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                <Plus size={12} className="text-neutral-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Generate button */}
        <div className="p-4 border-t border-neutral-100/60 dark:border-neutral-800/60">
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
      <div className="flex-1 relative overflow-hidden">
        <CanvasProvider value={canvasCallbacks}>
        <ReactFlow
          nodes={nodes}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          fitView={nodes.length > 0}
          minZoom={0.05}
          maxZoom={3}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={["Backspace", "Delete"]}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onPaneClick}
          snapToGrid
          snapGrid={[20, 20]}
          className="bg-[#f0f0f0] dark:bg-[#111111]"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#d1d5db" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeStrokeWidth={3}
            pannable
            zoomable
            className="!bg-white/90 dark:!bg-neutral-900/90 !border-neutral-200/60 dark:!border-neutral-700/60 !rounded-xl !shadow-sm"
          />
          {nodes.length === 0 && (
            <Panel position="top-center" className="!pointer-events-none !top-1/2 !-translate-y-1/2">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <ImageIcon size={28} className="text-neutral-300" />
                </div>
                <p className="text-sm text-neutral-400 font-medium">无限画板</p>
                <p className="text-xs text-neutral-300 mt-1">输入描述生成图片，拖拽排列，二次编辑</p>
                <p className="text-[11px] text-neutral-300 mt-3">
                  <span className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 rounded text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/60 text-[10px]">滚轮</span> 缩放
                  <span className="mx-2">·</span>
                  <span className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 rounded text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/60 text-[10px]">拖拽</span> 平移
                </p>
              </div>
            </Panel>
          )}
        </ReactFlow>
        {ctxMenu && <ContextMenu {...ctxMenu} onClose={() => setCtxMenu(null)} />}
        </CanvasProvider>
      </div>
    </div>
  );
}
