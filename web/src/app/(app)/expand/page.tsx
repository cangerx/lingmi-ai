"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Expand, Download, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { imageAPI } from "@/lib/api";
import ImageUploader from "@/components/ui/image-uploader";
import { downloadImage } from "@/lib/download";
import { usePollGeneration } from "@/hooks/use-poll-generation";
import { usePageTitle } from "@/hooks/use-page-title";

const DIRECTIONS = [
  { name: "四周", value: "all" },
  { name: "向左", value: "left" },
  { name: "向右", value: "right" },
  { name: "向上", value: "up" },
  { name: "向下", value: "down" },
];

const SCALES = ["1.5x", "2x", "3x"];

export default function ExpandPage() {
  usePageTitle("AI 扩图");
  const [previewUrl, setPreviewUrl] = useState("");
  const [direction, setDirection] = useState("all");
  const [scale, setScale] = useState("2x");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState("");
  const { result: pollResult, polling, error: pollError, startPolling } = usePollGeneration();

  const finalResultUrl = pollResult?.status === "completed" ? pollResult.result_url || "" : resultUrl;
  const isProcessing = processing || polling;
  const errorMsg = pollError || (pollResult?.status === "failed" ? pollResult.error_msg : null);

  const handleFileSelect = (file: File, url: string) => {
    setUploadedFile(file);
    setPreviewUrl(url);
    setResultUrl("");
  };

  const handleExpand = async () => {
    if (!uploadedFile) return;
    setProcessing(true);
    setResultUrl("");
    try {
      const fd = new FormData();
      fd.append("image", uploadedFile);
      fd.append("direction", direction);
      fd.append("scale", scale);
      const res = await imageAPI.expand(fd);
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

  return (
    <div className="h-full flex flex-col">
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35 }} className="flex items-center justify-between px-6 py-3 border-b border-neutral-100 glass">
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-md shadow-cyan-200/50">
            <Expand size={16} className="text-white" />
          </motion.div>
          <h1 className="text-sm font-semibold text-neutral-900">AI 扩图</h1>
        </div>

        {previewUrl && (
          <div className="flex items-center gap-3">
            <div className="flex gap-1 px-2 py-1 rounded-lg bg-neutral-50 border border-neutral-200/60">
              {DIRECTIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDirection(d.value)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs transition-colors",
                    direction === d.value ? "bg-cyan-500 text-white" : "text-neutral-600 hover:bg-neutral-100"
                  )}
                >
                  {d.name}
                </button>
              ))}
            </div>
            <div className="flex gap-1 px-2 py-1 rounded-lg bg-neutral-50 border border-neutral-200/60">
              {SCALES.map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs transition-colors",
                    scale === s ? "bg-cyan-500 text-white" : "text-neutral-600 hover:bg-neutral-100"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <button onClick={handleExpand} disabled={isProcessing} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600 disabled:opacity-50 transition-colors flex items-center gap-1.5">
              {isProcessing ? <><Loader2 size={14} className="animate-spin" /> 处理中...</> : '扩展'}
            </button>
            <button
              onClick={() => finalResultUrl && downloadImage(finalResultUrl, "expand.png")}
              disabled={!finalResultUrl}
              className="px-3 py-1.5 rounded-lg border border-neutral-200/60 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              <Download size={14} /> 下载
            </button>
          </div>
        )}
      </motion.div>

      <div className="flex-1 flex items-center justify-center bg-neutral-50">
        {previewUrl ? (
          <div className="relative">
            {finalResultUrl ? (
              <div className="text-center">
                <p className="text-xs text-neutral-400 mb-2">扩展结果</p>
                <img src={finalResultUrl} alt="" className="max-w-2xl max-h-[70vh] rounded-xl shadow-lg" />
              </div>
            ) : (
              <>
                <div className="border-2 border-dashed border-cyan-300 rounded-xl p-8">
                  <img src={previewUrl} alt="" className="max-w-xl max-h-[60vh] rounded-lg shadow-lg" />
                </div>
                <p className="text-center text-xs text-neutral-400 mt-3">虚线区域为扩展范围</p>
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl">
                    <div className="bg-white/90 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-cyan-500" />
                      <span className="text-sm text-neutral-700">AI 扩展中...</span>
                    </div>
                  </div>
                )}
                {errorMsg && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 px-4 py-2 rounded-xl flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-500" />
                    <span className="text-xs text-red-600">{errorMsg}</span>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <ImageUploader
            onFileSelect={handleFileSelect}
            accentColor="cyan"
            hint="上传图片，AI 延展画面"
            subHint="智能生成超出画面边界的内容"
            className="max-w-md w-full"
          />
        )}
      </div>
    </div>
  );
}
