"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Download, Loader2, AlertCircle, RotateCcw, Eye, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { imageAPI } from "@/lib/api";
import ImageUploader from "@/components/ui/image-uploader";
import ResolutionPicker from "@/components/ui/resolution-picker";
import BeforeAfterCompare from "@/components/ui/before-after-compare";
import { downloadImage } from "@/lib/download";
import { usePollGeneration } from "@/hooks/use-poll-generation";
import { usePageTitle } from "@/hooks/use-page-title";

const SCALES = [
  { label: "2x", desc: "2 倍放大" },
  { label: "4x", desc: "4 倍放大" },
  { label: "8x", desc: "8 倍超清" },
];

type ViewMode = "result" | "compare";

export default function UpscalePage() {
  usePageTitle("变清晰");
  const [previewUrl, setPreviewUrl] = useState("");
  const [scale, setScale] = useState("2x");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState("");
  const [resolution, setResolution] = useState("1K");
  const [viewMode, setViewMode] = useState<ViewMode>("result");
  const [imgDim, setImgDim] = useState<{ w: number; h: number } | null>(null);
  const { result: pollResult, polling, error: pollError, startPolling, reset: resetPoll } = usePollGeneration();

  const finalResultUrl = pollResult?.status === "completed" ? pollResult.result_url || "" : resultUrl;
  const isProcessing = processing || polling;
  const errorMsg = pollError || (pollResult?.status === "failed" ? pollResult.error_msg : null);

  const handleFileSelect = (file: File, url: string) => {
    setUploadedFile(file);
    setPreviewUrl(url);
    setResultUrl("");
    setViewMode("result");
    resetPoll();
    // Read image dimensions
    const img = new Image();
    img.onload = () => setImgDim({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  };

  const handleUpscale = async () => {
    if (!uploadedFile) return;
    setProcessing(true);
    setResultUrl("");
    try {
      const fd = new FormData();
      fd.append("image", uploadedFile);
      fd.append("scale", scale.replace("x", ""));
      fd.append("resolution", resolution);
      const res = await imageAPI.upscale(fd);
      const gen = res.data?.data;
      if (gen?.result_url) {
        setResultUrl(gen.result_url);
        setProcessing(false);
      } else if (gen?.id) {
        setProcessing(false);
        startPolling(gen.id);
      } else {
        setProcessing(false);
      }
    } catch (e: any) {
      console.error(e);
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setPreviewUrl("");
    setResultUrl("");
    setUploadedFile(null);
    setImgDim(null);
    setViewMode("result");
    resetPoll();
  };

  useEffect(() => {
    if (finalResultUrl) setViewMode("compare");
  }, [finalResultUrl]);

  const scaleFactor = parseInt(scale.replace("x", ""), 10) || 2;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between px-6 py-3 border-b border-neutral-100 dark:border-neutral-800 glass shrink-0"
      >
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-200/50">
            <Sparkles size={16} className="text-white" />
          </motion.div>
          <div>
            <h1 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">变清晰</h1>
            <p className="text-xs text-neutral-400">AI 智能增强画质，最高 8 倍无损放大</p>
          </div>
        </div>

        {previewUrl && (
          <div className="flex items-center gap-2">
            {!finalResultUrl && (
              <div className="flex gap-1 px-1.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200/60">
                {SCALES.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setScale(s.label)}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs transition-colors",
                      scale === s.label ? "bg-amber-500 text-white font-medium" : "text-neutral-500 hover:bg-neutral-100"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            <ResolutionPicker value={resolution} onChange={setResolution} />

            {finalResultUrl && (
              <div className="flex gap-0.5 px-1 py-0.5 rounded-lg bg-neutral-50 border border-neutral-200/60">
                <button
                  onClick={() => setViewMode("result")}
                  className={cn("p-1.5 rounded transition-colors", viewMode === "result" ? "bg-white shadow-sm text-amber-600" : "text-neutral-400 hover:text-neutral-600")}
                  title="结果"
                >
                  <Layers size={14} />
                </button>
                <button
                  onClick={() => setViewMode("compare")}
                  className={cn("p-1.5 rounded transition-colors", viewMode === "compare" ? "bg-white shadow-sm text-amber-600" : "text-neutral-400 hover:text-neutral-600")}
                  title="滑动对比"
                >
                  <Eye size={14} />
                </button>
              </div>
            )}

            {finalResultUrl ? (
              <button onClick={handleReset} className="px-3 py-1.5 rounded-lg border border-neutral-200/60 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center gap-1.5">
                <RotateCcw size={14} /> 重新上传
              </button>
            ) : (
              <button
                onClick={handleUpscale}
                disabled={isProcessing}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {isProcessing ? <><Loader2 size={14} className="animate-spin" /> 处理中...</> : <><Sparkles size={14} /> 增强</>}
              </button>
            )}
            <button
              onClick={() => finalResultUrl && downloadImage(finalResultUrl, `upscale-${scale}-${resolution}.png`)}
              disabled={!finalResultUrl}
              className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              <Download size={14} /> 下载
            </button>
          </div>
        )}
      </motion.div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-6">
        {previewUrl ? (
          <div className="flex flex-col items-center gap-4">
            {/* Dimension info bar */}
            {imgDim && (
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                  原图 {imgDim.w} x {imgDim.h}
                </span>
                <span className="text-neutral-300">→</span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                  {scale} → {imgDim.w * scaleFactor} x {imgDim.h * scaleFactor}
                </span>
              </div>
            )}

            {finalResultUrl && viewMode === "compare" ? (
              <BeforeAfterCompare
                beforeSrc={previewUrl}
                afterSrc={finalResultUrl}
                beforeLabel="原图"
                afterLabel={`${scale} 增强`}
                className="max-w-2xl w-full"
              />
            ) : finalResultUrl && viewMode === "result" ? (
              <motion.img
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                src={finalResultUrl}
                alt="增强结果"
                className="max-w-2xl max-h-[65vh] rounded-xl shadow-lg"
              />
            ) : (
              <div className="relative">
                <img src={previewUrl} alt="" className="max-w-xl max-h-[60vh] rounded-xl shadow-lg" />
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                    <div className="bg-white/90 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-amber-500" />
                      <span className="text-sm text-neutral-700">AI 增强中...</span>
                    </div>
                  </div>
                )}
                {errorMsg && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 px-4 py-2 rounded-xl flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-500" />
                    <span className="text-xs text-red-600">{errorMsg}</span>
                  </div>
                )}
                {!isProcessing && !errorMsg && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/30 backdrop-blur-sm px-4 py-2 rounded-xl">
                      <p className="text-sm text-white font-medium">点击增强按钮开始</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <ImageUploader
            onFileSelect={handleFileSelect}
            accentColor="amber"
            hint="上传图片，AI 智能增强画质"
            subHint="告别模糊，最高 8 倍无损放大"
            className="max-w-md w-full"
          />
        )}
      </div>
    </div>
  );
}
