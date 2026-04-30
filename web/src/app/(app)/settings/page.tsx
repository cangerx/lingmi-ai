"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  User,
  CreditCard,
  History,
  Mail,
  Phone,
  Crown,
  Coins,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { userAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface CreditLog {
  id: number;
  type: string;
  amount: number;
  balance: number;
  model: string;
  detail: string;
  created_at: string;
}

const TABS = ["账号设置", "消费记录", "充值记录"] as const;

export default function SettingsPage() {
  const { user, credits, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [creditLogs, setCreditLogs] = useState<CreditLog[]>([]);
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setNickname(user.nickname || "");
  }, [user]);

  useEffect(() => {
    if (activeTab === 1) loadCreditLogs();
  }, [activeTab]);

  const loadCreditLogs = async () => {
    try {
      const res = await userAPI.getCreditLogs();
      setCreditLogs(res.data.data || []);
    } catch {
      // handle error
    }
  };

  const handleSaveProfile = async () => {
    if (!nickname.trim()) return;
    setSaving(true);
    try {
      await userAPI.updateProfile({ nickname: nickname.trim() });
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  const tabIcons = [User, History, CreditCard];

  if (!user) {
    return (
      <div className="h-full flex flex-col bg-[#fafafa]">
        <div className="px-6 py-4 border-b border-neutral-100 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50 border border-neutral-200/60 flex items-center justify-center">
              <Settings size={16} className="text-neutral-400" />
            </div>
            <h1 className="text-base font-semibold text-neutral-900">个人中心</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white/80 rounded-2xl border border-neutral-200/60 p-12 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200/60 flex items-center justify-center mx-auto mb-4">
              <User size={24} className="text-neutral-400" />
            </div>
            <p className="text-neutral-500 text-sm mb-4">请先登录</p>
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors shadow-md"
            >
              去登录
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#fafafa]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50 border border-neutral-200/60 flex items-center justify-center">
            <Settings size={16} className="text-neutral-400" />
          </div>
          <h1 className="text-base font-semibold text-neutral-900">个人中心</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">

      {/* User card */}
      <div className="bg-white/80 rounded-2xl border border-neutral-200/60 p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <User size={22} className="text-neutral-400" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">{user.nickname}</h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                {user.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={12} /> {user.email}
                  </span>
                )}
                {user.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} /> {user.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm">
                <Crown size={14} className="text-amber-500" />
                <span className="font-medium">VIP {user.vip_level || 0}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-neutral-400 mt-0.5">
                <Coins size={12} />
                <span>{credits?.balance?.toFixed(0) || 0} 积分</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-neutral-100">
        {TABS.map((label, i) => {
          const Icon = tabIcons[i];
          return (
            <button
              key={label}
              onClick={() => setActiveTab(i)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors",
                activeTab === i
                  ? "border-neutral-900 text-neutral-900 font-medium"
                  : "border-transparent text-neutral-500 hover:text-neutral-700"
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 0 && (
        <div className="bg-white/80 rounded-2xl border border-neutral-200/60 divide-y divide-neutral-100 shadow-sm">
          <div className="p-5">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">昵称</label>
            <div className="flex gap-3">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-neutral-200/60 bg-white/60 text-sm outline-none focus:border-neutral-300 focus:bg-white focus:shadow-sm transition-all"
              />
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-md"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
          <div className="p-5">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">邮箱</label>
            <p className="text-sm text-neutral-500">{user.email || "未绑定"}</p>
          </div>
          <div className="p-5">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">手机号</label>
            <p className="text-sm text-neutral-500">{user.phone || "未绑定"}</p>
          </div>
          <div className="p-5">
            <button
              onClick={() => { logout(); window.location.href = "/login"; }}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
            >
              <LogOut size={16} />
              退出登录
            </button>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div className="bg-white/80 rounded-2xl border border-neutral-200/60 shadow-sm">
          {creditLogs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-neutral-400 text-sm">暂无消费记录</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 text-xs">
                  <th className="text-left px-5 py-3 font-medium">时间</th>
                  <th className="text-left px-5 py-3 font-medium">类型</th>
                  <th className="text-left px-5 py-3 font-medium">模型</th>
                  <th className="text-right px-5 py-3 font-medium">积分变动</th>
                  <th className="text-right px-5 py-3 font-medium">余额</th>
                </tr>
              </thead>
              <tbody>
                {creditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-5 py-3 text-neutral-500">
                      {new Date(log.created_at).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-5 py-3">{log.detail || log.type}</td>
                    <td className="px-5 py-3 text-neutral-400">{log.model || "-"}</td>
                    <td className={cn("px-5 py-3 text-right font-medium", log.amount >= 0 ? "text-green-600" : "text-red-500")}>
                      {log.amount >= 0 ? "+" : ""}{log.amount.toFixed(1)}
                    </td>
                    <td className="px-5 py-3 text-right text-neutral-500">{log.balance.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 2 && (
        <div className="bg-white/80 rounded-2xl border border-neutral-200/60 p-12 text-center shadow-sm">
          <p className="text-neutral-400 text-sm">暂无充值记录</p>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
