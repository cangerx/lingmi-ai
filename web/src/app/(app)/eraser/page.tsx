"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eraser, Upload, Download, Undo2, Redo2, ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { imageAPI } from "@/lib/api";

const BRUSH_SIZES = [10, 20, 40, 60];

export default function EraserPage() {
  const [previewUrl, setPreviewUrl] = useState("");
  const [brushSize, setBrushSize] = useState(20);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleErase = async () => {
    if (!uploadedFile) return;
    setProcessing(true);
    try {
      const fd = new FormData();
      fd.append("image", uploadedFile);
      await imageAPI.eraser(fd);
    } catch (e) { console.error(e); }
    setProcessing(false);
  };

  return (
    <div className="h-full flex flex-col">
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35 }} className="flex items-center justify-between px-6 py-3 border-b border-white/60 glass">
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-200/50">
            <Eraser size={16} className="text-white" />
          </motion.div>
          <h1 className="text-sm font-semibold text-neutral-900">AI 消除</h1>
        </div>

        {previewUrl && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-50 border border-[var(--color-border)]">
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
            <button onClick={handleErase} disabled={processing} className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-1.5">
              {processing ? <><Loader2 size={14} className="animate-spin" /> 处理中</> : '消除'}
            </button>
            <button className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center gap-1.5">
              <Download size={14} /> 下载
            </button>
          </div>
        )}
      </motion.div>

      <div className="flex-1 flex items-center justify-center bg-neutral-50">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="max-w-3xl max-h-[80vh] rounded-xl shadow-lg" />
        ) : (
          <label className="flex flex-col items-center gap-4 p-16 rounded-2xl border-2 border-dashed border-neutral-200 hover:border-orange-300 bg-white cursor-pointer transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center">
              <Upload size={28} className="text-orange-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-900">上传图片，涂抹不需要的内容</p>
              <p className="text-xs text-neutral-400 mt-1">AI 将智能填充被消除的区域</p>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
        )}
      </div>
    </div>
  );
}
