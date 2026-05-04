"use client";

import { useState } from "react";
import {
  PenTool,
  Upload,
  Download,
  Type,
  Square,
  Circle,
  Palette,
  Layers,
  RotateCw,
  FlipHorizontal,
  Crop,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LEFT_TOOLS = [
  { icon: Crop, name: "裁剪" },
  { icon: RotateCw, name: "旋转" },
  { icon: FlipHorizontal, name: "翻转" },
  { icon: SlidersHorizontal, name: "调整" },
  { icon: Type, name: "文字" },
  { icon: Square, name: "形状" },
  { icon: Palette, name: "滤镜" },
  { icon: Layers, name: "图层" },
];

export default function EditorPage() {
  const [previewUrl, setPreviewUrl] = useState("");
  const [activeTool, setActiveTool] = useState("裁剪");

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPreviewUrl(URL.createObjectURL(file));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-200/60 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center">
            <PenTool size={16} className="text-white" />
          </div>
          <h1 className="text-sm font-semibold text-neutral-900">图片编辑</h1>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-lg border border-neutral-200/60 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center gap-1.5">
            <Download size={14} /> 导出
          </button>
        </div>
      </div>

      {previewUrl ? (
        <div className="flex-1 flex">
          {/* Left toolbar */}
          <div className="w-16 border-r border-neutral-200/60 bg-white flex flex-col items-center py-3 gap-1">
            {LEFT_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.name}
                  onClick={() => setActiveTool(tool.name)}
                  className={cn(
                    "w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors",
                    activeTool === tool.name ? "bg-pink-50 text-pink-600" : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"
                  )}
                >
                  <Icon size={18} />
                  <span className="text-[10px]">{tool.name}</span>
                </button>
              );
            })}
          </div>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center bg-neutral-100 p-8">
            <img src={previewUrl} alt="" className="max-w-full max-h-full rounded-lg shadow-lg" />
          </div>

          {/* Right panel */}
          <div className="w-[240px] border-l border-neutral-200/60 bg-white p-4">
            <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">{activeTool}</h3>
            <div className="space-y-4">
              {activeTool === "调整" && (
                <>
                  {["亮度", "对比度", "饱和度", "锐化"].map((label) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-neutral-600">{label}</span>
                        <span className="text-neutral-400">0</span>
                      </div>
                      <input type="range" min="-100" max="100" defaultValue="0" className="w-full accent-pink-500" />
                    </div>
                  ))}
                </>
              )}
              {activeTool !== "调整" && (
                <div className="py-4 text-center space-y-2">
                  <p className="text-xs text-neutral-400">选择工具后在画布上操作</p>
                  <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                    <p className="text-[11px] text-amber-600 font-medium">🚧 功能开发中</p>
                    <p className="text-[10px] text-amber-500 mt-0.5">编辑工具即将上线</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <label className="flex flex-col items-center gap-4 p-16 rounded-2xl border-2 border-dashed border-neutral-200 hover:border-pink-300 bg-white cursor-pointer transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center">
              <Upload size={28} className="text-pink-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-900">上传图片开始编辑</p>
              <p className="text-xs text-neutral-400 mt-1">裁剪、旋转、调色、加文字</p>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
        </div>
      )}
    </div>
  );
}
