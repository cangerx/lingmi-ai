"use client";

import { useState } from "react";
import { Package, Plus, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = ["最近保存", "管理配方", "我的模特"];

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState("最近保存");

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa]">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex items-center gap-4 mb-6 border-b border-[var(--color-border)]">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-3 text-sm transition-colors border-b-2",
                activeTab === tab
                  ? "border-neutral-900 text-neutral-900 font-medium"
                  : "border-transparent text-neutral-400 hover:text-neutral-600"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "最近保存" && (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <Package size={40} className="mx-auto text-neutral-200 mb-3" />
              <p className="text-sm text-neutral-400 mb-1">暂无保存的资产</p>
              <p className="text-xs text-neutral-300">创作中收藏的素材会保存在这里</p>
            </div>
          </div>
        )}

        {activeTab === "管理配方" && (
          <div className="grid grid-cols-4 gap-4">
            <button className="aspect-square rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 hover:bg-amber-50 flex flex-col items-center justify-center gap-2 transition-colors">
              <Plus size={24} className="text-amber-400" />
              <span className="text-sm text-amber-600">素材配方</span>
            </button>
          </div>
        )}

        {activeTab === "我的模特" && (
          <div className="grid grid-cols-4 gap-4">
            <button className="aspect-square rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 hover:bg-amber-50 flex flex-col items-center justify-center gap-2 transition-colors">
              <UserCircle size={24} className="text-amber-400" />
              <span className="text-sm text-amber-600">创建专属模特</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
