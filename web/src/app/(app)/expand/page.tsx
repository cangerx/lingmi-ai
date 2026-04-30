"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Expand, Upload, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { imageAPI } from "@/lib/api";

const DIRECTIONS = [
  { name: "四周", value: "all" },
  { name: "向左", value: "left" },
  { name: "向右", value: "right" },
  { name: "向上", value: "up" },
  { name: "向下", value: "down" },
];

const SCALES = ["1.5x", "2x", "3x"];

export default function ExpandPage() {
  const [previewUrl, setPreviewUrl] = useState("");
  const [direction, setDirection] = useState("all");
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

  const handleExpand = async () => {
    if (!uploadedFile) return;
    setProcessing(true);
    try {
      const fd = new FormData();
      fd.append("image", uploadedFile);
      fd.append("direction", direction);
      fd.append("scale", scale);
      await imageAPI.expand(fd);
    } catch (e) { console.error(e); }
    setProcessing(false);
  };

  return (
    <div className="h-full flex flex-col">
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35 }} className="flex items-center justify-between px-6 py-3 border-b border-white/60 glass">
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-md shadow-cyan-200/50">
            <Expand size={16} className="text-white" />
          </motion.div>
          <h1 className="text-sm font-semibold text-neutral-900">AI 扩图</h1>
        </div>

        {previewUrl && (
          <div className="flex items-center gap-3">
            <div className="flex gap-1 px-2 py-1 rounded-lg bg-neutral-50 border border-[var(--color-border)]">
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
            <div className="flex gap-1 px-2 py-1 rounded-lg bg-neutral-50 border border-[var(--color-border)]">
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
            <button onClick={handleExpand} disabled={processing} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600 disabled:opacity-50 transition-colors flex items-center gap-1.5">
              {processing ? <><Loader2 size={14} className="animate-spin" /> 处理中</> : '扩展'}
            </button>
            <button className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center gap-1.5">
              <Download size={14} /> 下载
            </button>
          </div>
        )}
      </motion.div>

      <div className="flex-1 flex items-center justify-center bg-neutral-50">
        {previewUrl ? (
          <div className="relative">
            <div className="border-2 border-dashed border-cyan-300 rounded-xl p-8">
              <img src={previewUrl} alt="" className="max-w-xl max-h-[60vh] rounded-lg shadow-lg" />
            </div>
            <p className="text-center text-xs text-neutral-400 mt-3">虚线区域为扩展范围</p>
          </div>
        ) : (
          <label className="flex flex-col items-center gap-4 p-16 rounded-2xl border-2 border-dashed border-neutral-200 hover:border-cyan-300 bg-white cursor-pointer transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-cyan-50 flex items-center justify-center">
              <Upload size={28} className="text-cyan-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-900">上传图片，AI 延展画面</p>
              <p className="text-xs text-neutral-400 mt-1">智能生成超出画面边界的内容</p>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
        )}
      </div>
    </div>
  );
}
