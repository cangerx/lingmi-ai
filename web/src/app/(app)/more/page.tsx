"use client";

import Link from "next/link";
import {
  MessageSquare,
  Video,
  Music,
  Settings,
  CreditCard,
  HelpCircle,
  Lightbulb,
} from "lucide-react";

const moreItems = [
  { label: "AI 对话", desc: "GPT / DeepSeek / Gemini 多模型对话", href: "/chat", icon: MessageSquare, color: "bg-blue-50 text-blue-600" },
  { label: "AI 视频", desc: "文字或图片生成短视频", href: "/video", icon: Video, color: "bg-red-50 text-red-600" },
  { label: "AI 音乐", desc: "描述风格，创作原创音乐", href: "/music", icon: Music, color: "bg-amber-50 text-amber-600" },
  { label: "灵感库", desc: "浏览海量设计灵感作品", href: "/inspiration", icon: Lightbulb, color: "bg-yellow-50 text-yellow-600" },
  { label: "充值中心", desc: "会员套餐和价格", href: "/pricing", icon: CreditCard, color: "bg-emerald-50 text-emerald-600" },
  { label: "设置", desc: "账户信息、个人资料", href: "/settings", icon: Settings, color: "bg-neutral-100 text-neutral-600" },
  { label: "帮助", desc: "使用指南和常见问题", href: "/more", icon: HelpCircle, color: "bg-purple-50 text-purple-600" },
];

export default function MorePage() {
  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-base font-semibold text-neutral-900 mb-6">更多</h1>
        <div className="grid grid-cols-2 gap-3">
          {moreItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-4 p-5 rounded-xl bg-white border border-[var(--color-border)] hover:border-neutral-300 hover:shadow-sm transition-all"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">{item.label}</h3>
                  <p className="text-xs text-neutral-400">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
