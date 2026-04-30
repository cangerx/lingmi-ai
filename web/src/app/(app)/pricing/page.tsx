"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "免费版",
    price: "0",
    period: "",
    credits: "注册送 100 积分",
    features: ["基础 AI 聊天", "每日 5 次免费对话", "标准生图模型", "社区支持"],
    recommended: false,
  },
  {
    name: "月度会员",
    price: "29",
    period: "/月",
    credits: "每月 2000 积分",
    features: [
      "全部 AI 模型",
      "无限对话次数",
      "高级生图/视频/音乐",
      "优先生成队列",
      "无广告体验",
      "专属客服",
    ],
    recommended: true,
  },
  {
    name: "年度会员",
    price: "199",
    period: "/年",
    credits: "每月 3000 积分",
    features: [
      "月度会员全部权益",
      "额外 50% 积分",
      "API 调用权限",
      "批量生成",
      "优先体验新功能",
    ],
    recommended: false,
  },
];

export default function PricingPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
          选择适合你的方案
        </h1>
        <p className="text-sm text-neutral-500">
          所有方案均支持微信和支付宝付款
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "rounded-xl border bg-white p-6 flex flex-col",
              plan.recommended
                ? "border-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                : "border-[var(--color-border)]"
            )}
          >
            {plan.recommended && (
              <span className="self-start px-2.5 py-0.5 rounded text-xs font-medium bg-neutral-900 text-white mb-4">
                推荐
              </span>
            )}

            <h3 className="text-lg font-semibold text-neutral-900">
              {plan.name}
            </h3>
            <div className="mt-2 mb-1">
              <span className="text-3xl font-bold text-neutral-900">
                ¥{plan.price}
              </span>
              {plan.period && (
                <span className="text-sm text-neutral-400">{plan.period}</span>
              )}
            </div>
            <p className="text-sm text-neutral-500 mb-6">{plan.credits}</p>

            <ul className="space-y-2.5 flex-1 mb-6">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-neutral-600"
                >
                  <Check size={14} className="text-neutral-400 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              className={cn(
                "w-full py-2.5 rounded-lg text-sm font-medium transition-colors",
                plan.recommended
                  ? "bg-neutral-900 text-white hover:bg-neutral-800"
                  : "border border-[var(--color-border)] text-neutral-700 hover:bg-neutral-50"
              )}
            >
              {plan.price === "0" ? "当前方案" : "立即开通"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
