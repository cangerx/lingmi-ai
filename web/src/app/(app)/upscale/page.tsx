"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Download, ArrowLeftRight, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { imageAPI } from "@/lib/api";
import ImageUploader from "@/components/ui/image-uploader";
import { downloadImage } from "@/lib/download";
import { usePollGeneration } from "@/hooks/use-poll-generation";
import { usePageTitle } from "@/hooks/use-page-title";

const SCALES = [
  { label: "2x", desc: "2 倍放大" },
  { label: "4x", desc: "4 倍放大" },
  { label: "8x", desc: "8 倍超清" },
];

export default function UpscalePage() {
  usePageTitle("变清晰");
  const [previewUrl, setPreviewUrl] = useState("");
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

  const handleUpscale = async () => {
    if (!uploadedFile) return;
    setProcessing(true);
    setResultUrl("");
    try {
      const fd = new FormData();
      fd.append("image", uploadedFile);
      fd.append("scale", scale.replace('x', ''));
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

  return (
    <div className="h-full flex flex-col">
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35 }} className="flex items-center justify-between px-6 py-3 border-b border-neutral-100 glass">
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-200/50">
            <Sparkles size={16} className="text-white" />
          </motion.div>
          <h1 className="text-sm font-semibold text-neutral-900">变清晰</h1>
        </div>

        {previewUrl && (
          <div className="flex items-center gap-3">
            <div className="flex gap-1 px-2 py-1 rounded-lg bg-neutral-50 border border-neutral-200/60">
              {SCALES.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setScale(s.label)}
                  className={cn(
                    "px-3 py-1 rounded text-xs transition-colors",
                    scale === s.label ? "bg-amber-500 text-white" : "text-neutral-600 hover:bg-neutral-100"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button onClick={handleUpscale} disabled={isProcessing} className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center gap-1.5">
              {isProcessing ? <><Loader2 size={14} className="animate-spin" /> 处理中...</> : <><Sparkles size={14} /> 增强</>}
            </button>
            <button
              onClick={() => finalResultUrl && downloadImage(finalResultUrl, `upscale-${scale}.png`)}
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
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-neutral-400 mb-2">原图</p>
              <img src={previewUrl} alt="" className="max-w-md max-h-[60vh] rounded-2xl border border-neutral-200/60 shadow-sm" />
            </div>
            <ArrowLeftRight size={20} className="text-neutral-300 shrink-0" />
            <div className="text-center">
              <p className="text-xs text-neutral-400 mb-2">增强后 ({scale})</p>
              {finalResultUrl ? (
                <img src={finalResultUrl} alt="" className="max-w-md max-h-[60vh] rounded-2xl border border-neutral-200/60 shadow-sm" />
              ) : (
                <div className="max-w-md max-h-[60vh] rounded-2xl border border-neutral-200/60 bg-white flex items-center justify-center aspect-square shadow-sm relative">
                  {isProcessing ? (
                    <div className="text-center">
                      <Loader2 size={24} className="mx-auto text-amber-400 animate-spin mb-2" />
                      <p className="text-xs text-neutral-400">AI 增强中...</p>
                    </div>
                  ) : errorMsg ? (
                    <div className="text-center px-4">
                      <AlertCircle size={24} className="mx-auto text-red-400 mb-2" />
                      <p className="text-xs text-red-500">{errorMsg}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Sparkles size={24} className="mx-auto text-amber-300 mb-2" />
                      <p className="text-xs text-neutral-300">点击增强按钮开始</p>
                    </div>
                  )}
                </div>
              )}
            </div>
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
