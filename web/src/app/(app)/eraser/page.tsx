"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eraser, Download, Undo2, Redo2, ZoomIn, ZoomOut, Loader2, AlertCircle, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { imageAPI } from "@/lib/api";
import ImageUploader from "@/components/ui/image-uploader";
import { downloadImage } from "@/lib/download";
import { usePollGeneration } from "@/hooks/use-poll-generation";
import { usePageTitle } from "@/hooks/use-page-title";

const BRUSH_SIZES = [10, 20, 40, 60];

export default function EraserPage() {
  usePageTitle("AI 消除");
  const [previewUrl, setPreviewUrl] = useState("");
  const [brushSize, setBrushSize] = useState(20);
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

  const handleErase = async () => {
    if (!uploadedFile) return;
    setProcessing(true);
    setResultUrl("");
    try {
      const fd = new FormData();
      fd.append("image", uploadedFile);
      const res = await imageAPI.eraser(fd);
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
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35 }} className="flex items-center justify-between px-6 py-3 border-b border-neutral-100 dark:border-neutral-800 glass">
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-200/50">
            <Eraser size={16} className="text-white" />
          </motion.div>
          <h1 className="text-sm font-semibold text-neutral-900">AI 消除</h1>
        </div>

        {previewUrl && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-50 border border-neutral-200/60">
              <span className="text-xs text-neutral-500 mr-1">画笔:</span>
              {BRUSH_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setBrushSize(s)}
                  className={cn(
                    "w-7 h-7 rounded flex items-center justify-center transition-colors",
                    brushSize === s ? "bg-orange-500 text-white" : "hover:bg-neutral-100 text-neutral-600"
                  )}
                >
                  <div className="rounded-full bg-current" style={{ width: s / 4, height: s / 4 }} />
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"><Undo2 size={16} className="text-neutral-500" /></button>
              <button className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"><Redo2 size={16} className="text-neutral-500" /></button>
              <button className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"><ZoomIn size={16} className="text-neutral-500" /></button>
              <button className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"><ZoomOut size={16} className="text-neutral-500" /></button>
            </div>
            <button onClick={handleErase} disabled={isProcessing} className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-1.5">
              {isProcessing ? <><Loader2 size={14} className="animate-spin" /> 处理中...</> : '消除'}
            </button>
            <button
              onClick={() => finalResultUrl && downloadImage(finalResultUrl, "eraser.png")}
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
              <div className="flex items-center gap-6 p-8">
                <div className="text-center">
                  <p className="text-xs text-neutral-400 mb-2">原图</p>
                  <img src={previewUrl} alt="" className="max-w-md max-h-[60vh] rounded-xl shadow-lg" />
                </div>
                <ArrowLeftRight size={20} className="text-neutral-300 shrink-0" />
                <div className="text-center">
                  <p className="text-xs text-neutral-400 mb-2">消除结果</p>
                  <img src={finalResultUrl} alt="" className="max-w-md max-h-[60vh] rounded-xl shadow-lg" />
                </div>
              </div>
            ) : (
              <>
                <img src={previewUrl} alt="" className="max-w-3xl max-h-[80vh] rounded-xl shadow-lg" />
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                    <div className="bg-white/90 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-orange-500" />
                      <span className="text-sm text-neutral-700">AI 处理中...</span>
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
            accentColor="orange"
            hint="上传图片，涂抹不需要的内容"
            subHint="AI 将智能填充被消除的区域"
            className="max-w-md w-full"
          />
        )}
      </div>
    </div>
  );
}
