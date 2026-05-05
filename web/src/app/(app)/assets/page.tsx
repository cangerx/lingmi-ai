"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HardDrive,
  User,
  Loader2,
  Download,
  X,
  Plus,
  FolderPlus,
  Folder,
  Upload,
  Trash2,
  Image as ImageIcon,
  FileText,
  MoreHorizontal,
  Pencil,
  FolderInput,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { spaceAPI } from "@/lib/api";
import { downloadImage } from "@/lib/download";
import { useAuthStore } from "@/store/auth";
import { useLoginModalStore } from "@/store/login-modal";
import { usePageTitle } from "@/hooks/use-page-title";

interface SpaceFolder {
  id: number;
  name: string;
  file_count: number;
  created_at: string;
}

interface SpaceFile {
  id: number;
  folder_id: number | null;
  name: string;
  url: string;
  size: number;
  mime_type: string;
  width: number;
  height: number;
  created_at: string;
}

interface Quota {
  used_bytes: number;
  max_bytes: number;
  file_count: number;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function AssetsPage() {
  usePageTitle("素材空间");
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folders, setFolders] = useState<SpaceFolder[]>([]);
  const [files, setFiles] = useState<SpaceFile[]>([]);
  const [quota, setQuota] = useState<Quota>({ used_bytes: 0, max_bytes: 104857600, file_count: 0 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeFolder, setActiveFolder] = useState<number | null>(null); // null = all files
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<SpaceFile | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [contextMenu, setContextMenu] = useState<{ type: "file" | "folder"; id: number; x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState<{ type: "file" | "folder"; id: number; name: string } | null>(null);
  const pageSize = 50;

  // ── Data loading ──
  const loadQuota = useCallback(async () => {
    try { const res = await spaceAPI.quota(); setQuota(res.data?.data); } catch {}
  }, []);

  const loadFolders = useCallback(async () => {
    try { const res = await spaceAPI.listFolders(); setFolders(res.data?.data ?? []); } catch {}
  }, []);

  const loadFiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (activeFolder !== null) params.folder_id = activeFolder === 0 ? "root" : String(activeFolder);
      const res = await spaceAPI.listFiles(params);
      setFiles(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
    } catch {} finally { setLoading(false); }
  }, [user, page, activeFolder]);

  useEffect(() => { if (user) { loadQuota(); loadFolders(); } }, [user, loadQuota, loadFolders]);
  useEffect(() => { loadFiles(); }, [loadFiles]);
  useEffect(() => { setPage(1); }, [activeFolder]);

  // ── Upload ──
  const handleUpload = async (fileList: FileList | File[]) => {
    if (uploading) return;
    setUploading(true);
    try {
      for (const f of Array.from(fileList)) {
        await spaceAPI.uploadFile(f, activeFolder && activeFolder > 0 ? activeFolder : undefined);
      }
      loadFiles(); loadQuota(); loadFolders();
    } catch (e: any) {
      alert(e?.response?.data?.error || "上传失败");
    } finally { setUploading(false); }
  };

  // ── Drag & Drop ──
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
  };

  // ── Folder CRUD ──
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try { await spaceAPI.createFolder(newFolderName.trim()); loadFolders(); setNewFolderName(""); setShowNewFolder(false); } catch {}
  };

  const deleteFolder = async (id: number) => {
    if (!confirm("删除文件夹将同时删除其中所有文件，确定吗？")) return;
    try { await spaceAPI.deleteFolder(id); loadFolders(); loadQuota(); if (activeFolder === id) { setActiveFolder(null); } loadFiles(); } catch {}
  };

  const renameItem = async () => {
    if (!renaming || !renaming.name.trim()) return;
    try {
      if (renaming.type === "folder") await spaceAPI.renameFolder(renaming.id, renaming.name.trim());
      else await spaceAPI.renameFile(renaming.id, renaming.name.trim());
      loadFolders(); loadFiles(); setRenaming(null);
    } catch {}
  };

  // ── File actions ──
  const deleteFile = async (id: number) => {
    try { await spaceAPI.deleteFile(id); setFiles((p) => p.filter((f) => f.id !== id)); setTotal((t) => t - 1); loadQuota(); if (selected?.id === id) setSelected(null); } catch {}
  };

  const totalPages = Math.ceil(total / pageSize);
  const usagePercent = quota.max_bytes > 0 ? Math.min(100, (quota.used_bytes / quota.max_bytes) * 100) : 0;

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-[#fafafa]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200/60 flex items-center justify-center mx-auto mb-4">
            <User size={24} className="text-neutral-400" />
          </div>
          <h3 className="text-sm font-medium text-neutral-600 mb-1">请先登录</h3>
          <p className="text-xs text-neutral-400 max-w-xs mb-4">登录后可使用素材空间</p>
          <button onClick={() => useLoginModalStore.getState().openLoginModal()} className="px-6 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors shadow-md">
            去登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fafafa] dark:bg-[#0A0A0A]" onClick={() => setContextMenu(null)}>
      {/* Header */}
      <div className="px-6 pt-5 pb-3 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-100/60 dark:border-neutral-800/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <HardDrive size={18} className="text-neutral-500" />
            <h1 className="text-base font-semibold text-neutral-900">素材空间</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewFolder(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100 transition-colors border border-neutral-200/60">
              <FolderPlus size={13} /> 新建文件夹
            </button>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white bg-neutral-900 hover:bg-neutral-800 transition-colors shadow-sm">
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} 上传文件
            </button>
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
          </div>
        </div>
        {/* Quota bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", usagePercent > 90 ? "bg-red-400" : usagePercent > 70 ? "bg-amber-400" : "bg-blue-400")}
              style={{ width: `${usagePercent}%` }} />
          </div>
          <span className="text-[11px] text-neutral-400 shrink-0">
            {formatBytes(quota.used_bytes)} / {formatBytes(quota.max_bytes)}
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Folders */}
        <div className="w-48 border-r border-neutral-100/60 bg-white/50 overflow-y-auto shrink-0 hidden md:block">
          <div className="p-3 space-y-0.5">
            <button onClick={() => setActiveFolder(null)}
              className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors", activeFolder === null ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100")}>
              <HardDrive size={13} /> 全部文件
            </button>
            <button onClick={() => setActiveFolder(0)}
              className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors", activeFolder === 0 ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100")}>
              <FileText size={13} /> 未分类
            </button>
            <div className="h-px bg-neutral-100 my-2" />
            {folders.map((f) => (
              <button key={f.id} onClick={() => setActiveFolder(f.id)}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ type: "folder", id: f.id, x: e.clientX, y: e.clientY }); }}
                className={cn("w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs transition-colors group", activeFolder === f.id ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100")}>
                <span className="flex items-center gap-2 truncate"><Folder size={13} /> {f.name}</span>
                <span className={cn("text-[10px]", activeFolder === f.id ? "text-white/60" : "text-neutral-300")}>{f.file_count}</span>
              </button>
            ))}
            {/* New folder inline */}
            <AnimatePresence>
              {showNewFolder && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="flex items-center gap-1 px-1 py-1">
                    <input autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createFolder()}
                      placeholder="文件夹名称" className="flex-1 px-2 py-1.5 rounded-lg border border-neutral-200 text-xs outline-none focus:border-neutral-400 bg-white" />
                    <button onClick={createFolder} className="p-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800"><Plus size={12} /></button>
                    <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400"><X size={12} /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Main content - Files */}
        <div className="flex-1 overflow-y-auto"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}>

          {/* Drag overlay */}
          <AnimatePresence>
            {dragOver && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-blue-500/10 border-2 border-dashed border-blue-400 flex items-center justify-center pointer-events-none">
                <div className="bg-white rounded-2xl shadow-lg px-8 py-6 text-center">
                  <Upload size={32} className="text-blue-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-neutral-700">松开即可上传</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-neutral-300 animate-spin" /></div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
                  <Upload size={28} className="text-neutral-300" />
                </div>
                <p className="text-sm font-medium text-neutral-500 mb-1">暂无文件</p>
                <p className="text-xs text-neutral-400 mb-4">上传品牌素材、参考图等资源到你的空间</p>
                <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2 rounded-xl bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition-colors flex items-center gap-1.5">
                  <Upload size={13} /> 上传文件
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {files.map((file) => (
                    <motion.div key={file.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                      className="group relative rounded-xl overflow-hidden bg-white border border-neutral-200/60 shadow-sm hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelected(file)}
                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ type: "file", id: file.id, x: e.clientX, y: e.clientY }); }}>
                      {file.mime_type?.startsWith("image/") ? (
                        <img src={file.url} alt={file.name} className="w-full aspect-square object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full aspect-square bg-neutral-50 flex flex-col items-center justify-center gap-2">
                          <FileText size={28} className="text-neutral-300" />
                          <span className="text-[10px] text-neutral-400 uppercase">{file.name.split(".").pop()}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[10px] text-white/90 truncate">{file.name}</p>
                        <p className="text-[9px] text-white/60">{formatBytes(file.size)}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setContextMenu({ type: "file", id: file.id, x: e.clientX, y: e.clientY }); }}
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white">
                        <MoreHorizontal size={12} className="text-neutral-500" />
                      </button>
                    </motion.div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 transition-colors">
                      <ChevronLeft size={16} className="text-neutral-500" />
                    </button>
                    <span className="text-xs text-neutral-500">{page} / {totalPages}</span>
                    <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 transition-colors">
                      <ChevronRight size={16} className="text-neutral-500" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-50 bg-white rounded-xl shadow-lg border border-neutral-200/60 py-1 min-w-[140px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button onClick={() => { setRenaming({ type: contextMenu.type, id: contextMenu.id, name: "" }); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50 transition-colors">
              <Pencil size={12} /> 重命名
            </button>
            {contextMenu.type === "file" && (
              <button onClick={() => { const f = files.find((x) => x.id === contextMenu.id); if (f) downloadImage(f.url, f.name); setContextMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50 transition-colors">
                <Download size={12} /> 下载
              </button>
            )}
            {contextMenu.type === "file" && folders.length > 0 && (
              <div className="border-t border-neutral-100 pt-1 mt-1">
                <p className="px-3 py-1 text-[10px] text-neutral-400">移动到</p>
                {folders.map((f) => (
                  <button key={f.id} onClick={() => { spaceAPI.moveFile(contextMenu.id, f.id).then(() => { loadFiles(); loadFolders(); }); setContextMenu(null); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 transition-colors">
                    <FolderInput size={12} /> {f.name}
                  </button>
                ))}
              </div>
            )}
            <div className="border-t border-neutral-100 pt-1 mt-1">
              <button onClick={() => {
                if (contextMenu.type === "folder") deleteFolder(contextMenu.id);
                else deleteFile(contextMenu.id);
                setContextMenu(null);
              }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={12} /> 删除
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename dialog */}
      <AnimatePresence>
        {renaming && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setRenaming(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl p-5 w-80" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">重命名</h3>
              <input autoFocus value={renaming.name} onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && renameItem()}
                placeholder="输入新名称" className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm outline-none focus:border-neutral-400 mb-3" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setRenaming(null)} className="px-3 py-1.5 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100">取消</button>
                <button onClick={renameItem} className="px-3 py-1.5 rounded-lg text-xs text-white bg-neutral-900 hover:bg-neutral-800">确定</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File preview modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-neutral-100">
                <h3 className="text-sm font-semibold text-neutral-900 truncate">{selected.name}</h3>
                <button onClick={() => setSelected(null)} className="p-1 hover:bg-neutral-100 rounded-lg"><X size={16} className="text-neutral-400" /></button>
              </div>
              <div className="flex-1 overflow-auto bg-neutral-50 flex items-center justify-center p-6">
                {selected.mime_type?.startsWith("image/") ? (
                  <img src={selected.url} alt={selected.name} className="max-w-full max-h-[60vh] object-contain rounded-lg" />
                ) : (
                  <div className="text-center py-12">
                    <FileText size={48} className="text-neutral-300 mx-auto mb-3" />
                    <p className="text-sm text-neutral-500">{selected.name}</p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-neutral-100 flex items-center justify-between">
                <div className="text-xs text-neutral-400 space-x-3">
                  <span>{formatBytes(selected.size)}</span>
                  {selected.width > 0 && <span>{selected.width} x {selected.height}</span>}
                  <span>{new Date(selected.created_at).toLocaleDateString("zh-CN")}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => deleteFile(selected.id)} className="px-3 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 border border-red-200 flex items-center gap-1.5">
                    <Trash2 size={12} /> 删除
                  </button>
                  <button onClick={() => downloadImage(selected.url, selected.name)} className="px-3 py-1.5 rounded-lg text-xs text-white bg-neutral-900 hover:bg-neutral-800 flex items-center gap-1.5">
                    <Download size={12} /> 下载
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
