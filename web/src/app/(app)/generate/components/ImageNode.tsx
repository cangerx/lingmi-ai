"use client";

import { memo } from "react";
import { type NodeProps, NodeToolbar, NodeResizer, Position } from "@xyflow/react";
import { Loader2, Download, RotateCcw, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadImage } from "@/lib/download";
import { useCanvasCallbacks } from "./CanvasContext";

export interface ImageNodeData {
  [key: string]: unknown;
  src: string;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  prompt?: string;
  genId?: number;
  displayWidth: number;
  displayHeight: number;
}

function ImageNodeComponent({ id, data, selected }: NodeProps & { data: ImageNodeData }) {
  const { src, status, error, prompt, displayWidth, displayHeight } = data;
  const { onReGenerate, onEdit, onDelete } = useCanvasCallbacks();

  return (
    <>
      <NodeToolbar isVisible={selected && status === "completed"} position={Position.Top} align="center" offset={8}>
        <div className="flex items-center gap-1 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-neutral-200/60 dark:border-neutral-700/60 p-1">
          <button
            onClick={() => src && downloadImage(src, `generate-${id}.png`)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="下载"
          >
            <Download size={13} /> 下载
          </button>
          <button
            onClick={() => prompt && onReGenerate?.(prompt)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="重新生成"
          >
            <RotateCcw size={13} /> 重新生成
          </button>
          <button
            onClick={() => onEdit?.(prompt || "")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="二次编辑"
          >
            <Pencil size={13} /> 编辑
          </button>
          <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />
          <button
            onClick={() => onDelete?.(id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="删除"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </NodeToolbar>

      {selected && status === "completed" && (
        <NodeResizer
          minWidth={150}
          minHeight={100}
          isVisible={selected}
          lineClassName="!border-violet-400"
          handleClassName="!w-2.5 !h-2.5 !bg-violet-500 !border-white !border-2 !rounded-md"
          keepAspectRatio
        />
      )}

      <div
        className={cn(
          "rounded-xl overflow-hidden bg-white dark:bg-neutral-900 shadow-md transition-shadow select-none w-full h-full",
          selected && "ring-2 ring-violet-500 shadow-lg shadow-violet-200/30"
        )}
      >
        {status === "completed" && src ? (
          <img
            src={src}
            alt={prompt || ""}
            className="w-full object-contain pointer-events-none"
            draggable={false}
          />
        ) : status === "failed" ? (
          <div
            className="flex items-center justify-center bg-red-50/50 dark:bg-red-900/10"
            style={{ height: displayHeight }}
          >
            <div className="text-center px-4">
              <p className="text-xs text-red-400 font-medium mb-1">生成失败</p>
              <p className="text-[10px] text-red-300 line-clamp-2">{error || "未知错误"}</p>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center justify-center bg-neutral-50 dark:bg-neutral-800"
            style={{ height: displayHeight }}
          >
            <div className="text-center">
              <Loader2 size={24} className="mx-auto text-violet-400 animate-spin mb-2" />
              <p className="text-xs text-neutral-400">生成中...</p>
            </div>
          </div>
        )}
        {prompt && (
          <div className="px-2.5 py-1.5 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <p className="text-[10px] text-neutral-400 truncate">{prompt}</p>
          </div>
        )}
      </div>
    </>
  );
}

export default memo(ImageNodeComponent);
