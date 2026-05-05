"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { Download, RotateCcw, Pencil, Trash2, Copy } from "lucide-react";
import { useCanvasCallbacks } from "./CanvasContext";
import { downloadImage } from "@/lib/download";

export interface ContextMenuProps {
  nodeId: string;
  src?: string;
  prompt?: string;
  status?: string;
  x: number;
  y: number;
  onClose: () => void;
}

function ContextMenu({ nodeId, src, prompt, status, x, y, onClose }: ContextMenuProps) {
  const { onReGenerate, onEdit, onDelete } = useCanvasCallbacks();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const isCompleted = status === "completed";

  const items = [
    ...(isCompleted && src
      ? [{ icon: Download, label: "下载图片", onClick: () => downloadImage(src, `generate-${nodeId}.png`) }]
      : []),
    ...(isCompleted && prompt
      ? [{ icon: Copy, label: "复制提示词", onClick: () => navigator.clipboard.writeText(prompt) }]
      : []),
    ...(prompt
      ? [{ icon: RotateCcw, label: "重新生成", onClick: () => onReGenerate(prompt) }]
      : []),
    ...(isCompleted
      ? [{ icon: Pencil, label: "二次编辑", onClick: () => onEdit(prompt || "") }]
      : []),
    { icon: Trash2, label: "删除", onClick: () => onDelete(nodeId), danger: true },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] py-1 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-xl shadow-xl border border-neutral-200/60 dark:border-neutral-700/60 animate-in fade-in zoom-in-95 duration-150"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.onClick(); onClose(); }}
          className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors ${
            (item as any).danger
              ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <item.icon size={13} />
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default memo(ContextMenu);
