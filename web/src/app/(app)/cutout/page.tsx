"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Scissors, Upload, Download, ArrowLeftRight, Loader2 } from "lucide-react";
import { imageAPI } from "@/lib/api";

export default function CutoutPage() {
  const [previewUrl, setPreviewUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResultUrl("");
    }
  };

  const handleCutout = async () => {
    if (!uploadedFile) return;
    setProcessing(true);
    try {
      const fd = new FormData();
      fd.append("image", uploadedFile);
      const res = await imageAPI.cutout(fd);
      if (res.data?.data?.result_url) setResultUrl(res.data.data.result_url);
    } catch (e) { console.error(e); }
    setProcessing(false);
  };

  return (
    <div className="h-full flex flex-col">
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between px-6 py-4 border-b border-white/60 glass"
      >
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-200/50">
            <Scissors size={16} className="text-white" />
          </motion.div>
          <div>
            <h1 className="text-sm font-semibold text-neutral-900">智能抠图</h1>
            <p className="text-xs text-neutral-400">3 秒 AI 精准去除背景</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCutout}
            disabled={processing}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {processing ? <><Loader2 size={14} className="animate-spin" /> 处理中</> : '开始抠图'}
          </button>
          <button className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center gap-1.5">
            <Download size={14} /> 下载
          </button>
        </div>
      </motion.div>

      <div className="flex-1 flex">
        {previewUrl ? (
          <div className="flex-1 flex items-center justify-center p-8 bg-[repeating-conic-gradient(#f3f4f6_0%_25%,transparent_0%_50%)] bg-[length:20px_20px]">
            <div className="relative max-w-2xl w-full">
              <img src={previewUrl} alt="" className="w-full rounded-xl shadow-lg" />
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-md">
                <span className="text-xs text-neutral-500">原图</span>
                <ArrowLeftRight size={12} className="text-neutral-400" />
                <span className="text-xs text-neutral-500">抠图</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <label className="flex flex-col items-center gap-4 p-16 rounded-2xl border-2 border-dashed border-neutral-200 hover:border-emerald-300 bg-white cursor-pointer transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <Upload size={28} className="text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-900">上传图片开始抠图</p>
                <p className="text-xs text-neutral-400 mt-1">支持 JPG、PNG、WebP，最大 20MB</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
