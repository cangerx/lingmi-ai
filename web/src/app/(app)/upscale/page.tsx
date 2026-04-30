"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Upload, Download, ArrowLeftRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { imageAPI } from "@/lib/api";

const SCALES = [
  { label: "2x", desc: "2 倍放大" },
  { label: "4x", desc: "4 倍放大" },
  { label: "8x", desc: "8 倍超清" },
];

export default function UpscalePage() {
  const [previewUrl, setPreviewUrl] = useState("");
  const [scale, setScale] = useState("2x");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpscale = async () => {
    if (!uploadedFile) return;
    setProcessing(true);
    try {
      const fd = new FormData();
      fd.append("image", uploadedFile);
      fd.append("scale", scale.replace('x', ''));
      await imageAPI.upscale(fd);
    } catch (e) { console.error(e); }
    setProcessing(false);
  };

  return (
    <div className="h-full flex flex-col">
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35 }} className="flex items-center justify-between px-6 py-3 border-b border-white/60 glass">
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-200/50">
            <Sparkles size={16} className="text-white" />
          </motion.div>
          <h1 className="text-sm font-semibold text-neutral-900">变清晰</h1>
        </div>

        {previewUrl && (
          <div className="flex items-center gap-3">
            <div className="flex gap-1 px-2 py-1 rounded-lg bg-neutral-50 border border-[var(--color-border)]">
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
            <button onClick={handleUpscale} disabled={processing} className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center gap-1.5">
              {processing ? <><Loader2 size={14} className="animate-spin" /> 处理中</> : <><Sparkles size={14} /> 增强</>}
            </button>
            <button className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center gap-1.5">
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
              <img src={previewUrl} alt="" className="max-w-md max-h-[60vh] rounded-xl border border-[var(--color-border)] shadow-sm" />
            </div>
            <ArrowLeftRight size={20} className="text-neutral-300 shrink-0" />
            <div className="text-center">
              <p className="text-xs text-neutral-400 mb-2">增强后 ({scale})</p>
              <div className="max-w-md max-h-[60vh] rounded-xl border border-[var(--color-border)] bg-white flex items-center justify-center aspect-square shadow-sm">
                <div className="text-center">
                  <Sparkles size={24} className="mx-auto text-amber-300 mb-2" />
                  <p className="text-xs text-neutral-300">点击增强按钮开始</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center gap-4 p-16 rounded-2xl border-2 border-dashed border-neutral-200 hover:border-amber-300 bg-white cursor-pointer transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Upload size={28} className="text-amber-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-900">上传图片，AI 智能增强画质</p>
              <p className="text-xs text-neutral-400 mt-1">告别模糊，最高 8 倍无损放大</p>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
        )}
      </div>
    </div>
  );
}
