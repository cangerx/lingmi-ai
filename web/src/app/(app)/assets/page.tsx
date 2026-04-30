"use client";

import { useState } from "react";
import { Package, Plus, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageContainer, PageHeader, PageContent, EmptyState } from "@/components/ui/page-shell";

const TABS = ["最近保存", "管理配方", "我的模特"];

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState("最近保存");

  return (
    <PageContainer>
      <PageHeader
        title="我的资产"
        icon={<Package size={16} className="text-neutral-400" />}
        actions={
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs transition-colors",
                  activeTab === tab ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-50"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        }
      />
      <PageContent>
        {activeTab === "最近保存" && (
          <EmptyState
            icon={<Package size={24} className="text-neutral-400" />}
            title="暂无保存的资产"
            description="创作中收藏的素材会保存在这里"
          />
        )}

        {activeTab === "管理配方" && (
          <div className="grid grid-cols-4 gap-4">
            <button className="aspect-square rounded-2xl border-2 border-dashed border-neutral-200/80 bg-white/40 hover:bg-white/60 hover:border-neutral-300 flex flex-col items-center justify-center gap-2 transition-all">
              <Plus size={24} className="text-neutral-400" />
              <span className="text-sm text-neutral-500">素材配方</span>
            </button>
          </div>
        )}

        {activeTab === "我的模特" && (
          <div className="grid grid-cols-4 gap-4">
            <button className="aspect-square rounded-2xl border-2 border-dashed border-neutral-200/80 bg-white/40 hover:bg-white/60 hover:border-neutral-300 flex flex-col items-center justify-center gap-2 transition-all">
              <UserCircle size={24} className="text-neutral-400" />
              <span className="text-sm text-neutral-500">创建专属模特</span>
            </button>
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
}
