"use client";

import { Check, Sparkles, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
    <div className="h-full flex flex-col bg-[#fafafa]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50 border border-neutral-200/60 flex items-center justify-center">
              <CreditCard size={16} className="text-neutral-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-neutral-900">选择方案</h1>
              <p className="text-xs text-neutral-400">所有方案均支持微信和支付宝付款</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "rounded-2xl border bg-white/80 backdrop-blur-sm p-6 flex flex-col hover:shadow-lg transition-all",
                plan.recommended
                  ? "border-neutral-900 shadow-md ring-1 ring-neutral-900/5"
                  : "border-neutral-200/60 shadow-sm hover:border-neutral-300"
              )}
            >
              {plan.recommended && (
                <span className="self-start flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-amber-400 to-orange-400 text-white mb-4">
                  <Sparkles size={11} /> 推荐
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
              <p className="text-sm text-neutral-400 mb-6">{plan.credits}</p>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-neutral-600"
                  >
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "w-full py-2.5 rounded-xl text-sm font-medium transition-colors",
                  plan.recommended
                    ? "bg-neutral-900 text-white hover:bg-neutral-800 shadow-md"
                    : "border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                )}
              >
                {plan.price === "0" ? "当前方案" : "立即开通"}
              </motion.button>
            </motion.div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}
