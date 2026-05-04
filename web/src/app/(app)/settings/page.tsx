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
  BarChart3,
  MessageCircle,
  ImageIcon,
  Zap,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { userAPI, orderAPI } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PageContainer, PageHeader, PageContent } from "@/components/ui/page-shell";
import { useLoginModalStore } from "@/store/login-modal";

interface CreditLog {
  id: number;
  type: string;
  amount: number;
  balance: number;
  model: string;
  detail: string;
  created_at: string;
}

interface UsageStats {
  balance: number;
  total_recharged: number;
  total_consumed: number;
  today_consumed: number;
  conversations: number;
  messages: number;
  generations: number;
  model_stats: { model: string; total: number; count: number }[];
}

const TABS = ["账号设置", "使用统计", "安全设置", "消费记录", "订单记录"] as const;

export default function SettingsPage() {
  const { user, credits, logout, isLoading, fetchProfile } = useAuthStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [creditLogs, setCreditLogs] = useState<CreditLog[]>([]);
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);

  useEffect(() => {
    if (user) setNickname(user.nickname || "");
  }, [user]);

  useEffect(() => {
    if (activeTab === 1) loadUsageStats();
    if (activeTab === 3) loadCreditLogs();
    if (activeTab === 4) loadOrders();
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
      toast("保存成功", "success");
      fetchProfile();
    } catch {
      toast("保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPwd || !newPwd || newPwd.length < 6) {
      toast("新密码至少6位", "error");
      return;
    }
    setPwdSaving(true);
    try {
      await userAPI.changePassword({ old_password: oldPwd, new_password: newPwd });
      toast("密码修改成功", "success");
      setOldPwd(""); setNewPwd("");
    } catch (e: any) {
      toast(e.response?.data?.error || "修改失败", "error");
    } finally {
      setPwdSaving(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      const res = await userAPI.getUsageStats();
      setUsageStats(res.data);
    } catch { /* handle error */ }
  };

  const loadOrders = async () => {
    try {
      const res = await orderAPI.list();
      setOrders(res.data.data || []);
    } catch { /* handle error */ }
  };

  const tabIcons = [User, BarChart3, Settings, History, CreditCard];

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="个人中心" icon={<Settings size={16} className="text-neutral-400" />} />
        <PageContent>
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="h-24 rounded-2xl bg-neutral-100 animate-pulse" />
            <div className="h-10 w-48 rounded-xl bg-neutral-100 animate-pulse" />
            <div className="h-64 rounded-2xl bg-neutral-100 animate-pulse" />
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer>
        <PageHeader title="个人中心" icon={<Settings size={16} className="text-neutral-400" />} />
        <PageContent>
          <div className="bg-white/80 rounded-2xl border border-neutral-200/60 p-12 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200/60 flex items-center justify-center mx-auto mb-4">
              <User size={24} className="text-neutral-400" />
            </div>
            <p className="text-neutral-500 text-sm mb-4">请先登录</p>
            <button
              onClick={() => useLoginModalStore.getState().openLoginModal()}
              className="px-6 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors shadow-md"
            >
              去登录
            </button>
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="个人中心" icon={<Settings size={16} className="text-neutral-400" />} />
      <PageContent>
        <div className="max-w-3xl mx-auto">

      {/* User card */}
      <div className="bg-white/80 rounded-2xl border border-neutral-200/60 mb-6 shadow-sm overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-neutral-100 via-neutral-50 to-neutral-100" />
        <div className="px-6 pb-6 -mt-8">
          <div className="flex items-end justify-between">
            <div className="flex items-end gap-4">
              <div className="w-16 h-16 rounded-full bg-white p-0.5 shadow-md ring-2 ring-white">
                <div className="w-full h-full rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User size={24} className="text-neutral-400" />
                  )}
                </div>
              </div>
              <div className="pb-1">
                <h2 className="text-base font-semibold text-neutral-900">{user.nickname}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                  {user.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={12} /> {user.email}
                    </span>
                  )}
                  {user.phone && !user.phone.startsWith("u_") && (
                    <span className="flex items-center gap-1">
                      <Phone size={12} /> {user.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 pb-1">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                <Crown size={12} />
                VIP {user.vip_level || 0}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium">
                <Coins size={12} />
                {credits?.balance?.toFixed(0) || 0} 积分
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
              onClick={() => {
                if (window.confirm("确定要退出登录吗？")) {
                  logout();
                  window.location.href = "/";
                }
              }}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
            >
              <LogOut size={16} />
              退出登录
            </button>
          </div>
        </div>
      )}

      {activeTab === 1 && usageStats && (
        <div className="space-y-4">
          {/* Stats overview cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/80 rounded-2xl border border-neutral-200/60 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-blue-50">
                  <Coins size={14} className="text-blue-500" />
                </div>
                <span className="text-xs text-neutral-400">当前余额</span>
              </div>
              <p className="text-xl font-bold text-neutral-900">{usageStats.balance.toFixed(1)}</p>
            </div>
            <div className="bg-white/80 rounded-2xl border border-neutral-200/60 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-red-50">
                  <Zap size={14} className="text-red-500" />
                </div>
                <span className="text-xs text-neutral-400">今日消耗</span>
              </div>
              <p className="text-xl font-bold text-neutral-900">{usageStats.today_consumed.toFixed(1)}</p>
            </div>
            <div className="bg-white/80 rounded-2xl border border-neutral-200/60 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-amber-50">
                  <Zap size={14} className="text-amber-500" />
                </div>
                <span className="text-xs text-neutral-400">累计消耗</span>
              </div>
              <p className="text-xl font-bold text-neutral-900">{usageStats.total_consumed.toFixed(1)}</p>
            </div>
            <div className="bg-white/80 rounded-2xl border border-neutral-200/60 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-green-50">
                  <Coins size={14} className="text-green-500" />
                </div>
                <span className="text-xs text-neutral-400">累计充值</span>
              </div>
              <p className="text-xl font-bold text-neutral-900">{usageStats.total_recharged.toFixed(1)}</p>
            </div>
          </div>

          {/* Usage counts */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/80 rounded-2xl border border-neutral-200/60 p-4 shadow-sm text-center">
              <MessageCircle size={20} className="mx-auto text-neutral-400 mb-1.5" />
              <p className="text-2xl font-bold text-neutral-900">{usageStats.conversations}</p>
              <p className="text-xs text-neutral-400 mt-0.5">对话数</p>
            </div>
            <div className="bg-white/80 rounded-2xl border border-neutral-200/60 p-4 shadow-sm text-center">
              <MessageCircle size={20} className="mx-auto text-neutral-400 mb-1.5" />
              <p className="text-2xl font-bold text-neutral-900">{usageStats.messages}</p>
              <p className="text-xs text-neutral-400 mt-0.5">消息数</p>
            </div>
            <div className="bg-white/80 rounded-2xl border border-neutral-200/60 p-4 shadow-sm text-center">
              <ImageIcon size={20} className="mx-auto text-neutral-400 mb-1.5" />
              <p className="text-2xl font-bold text-neutral-900">{usageStats.generations}</p>
              <p className="text-xs text-neutral-400 mt-0.5">图片生成</p>
            </div>
          </div>

          {/* Per-model breakdown */}
          {usageStats.model_stats && usageStats.model_stats.length > 0 && (
            <div className="bg-white/80 rounded-2xl border border-neutral-200/60 shadow-sm">
              <div className="px-5 py-3 border-b border-neutral-100">
                <h3 className="text-sm font-medium text-neutral-700">模型消耗排行</h3>
              </div>
              <div className="divide-y divide-neutral-100">
                {usageStats.model_stats.map((ms, i) => {
                  const maxTotal = usageStats.model_stats[0]?.total || 1;
                  const pct = Math.round((ms.total / maxTotal) * 100);
                  return (
                    <div key={ms.model} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-neutral-700 font-medium">{ms.model}</span>
                        <div className="flex items-center gap-3 text-xs text-neutral-400">
                          <span>{ms.count} 次</span>
                          <span className="font-medium text-neutral-600">{ms.total.toFixed(1)} 积分</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-neutral-800 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 3 && (
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
        <div className="bg-white/80 rounded-2xl border border-neutral-200/60 divide-y divide-neutral-100 shadow-sm">
          <div className="p-5">
            <label className="block text-sm font-medium text-neutral-700 mb-3">修改密码</label>
            <div className="space-y-3 max-w-md">
              <input
                type="password"
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
                placeholder="当前密码"
                className="w-full px-3 py-2 rounded-xl border border-neutral-200/60 bg-white/60 text-sm outline-none focus:border-neutral-300 transition-all"
              />
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="新密码（至少6位）"
                className="w-full px-3 py-2 rounded-xl border border-neutral-200/60 bg-white/60 text-sm outline-none focus:border-neutral-300 transition-all"
              />
              <button
                onClick={handleChangePassword}
                disabled={pwdSaving}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-md"
              >
                {pwdSaving ? "保存中..." : "修改密码"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 4 && (
        <div className="bg-white/80 rounded-2xl border border-neutral-200/60 shadow-sm">
          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-neutral-400 text-sm">暂无订单记录</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 text-xs">
                  <th className="text-left px-5 py-3 font-medium">订单号</th>
                  <th className="text-left px-5 py-3 font-medium">类型</th>
                  <th className="text-right px-5 py-3 font-medium">金额</th>
                  <th className="text-right px-5 py-3 font-medium">积分</th>
                  <th className="text-center px-5 py-3 font-medium">状态</th>
                  <th className="text-left px-5 py-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-5 py-3 text-neutral-500 font-mono text-xs">{o.order_no}</td>
                    <td className="px-5 py-3">{o.type === 'subscribe' ? '订阅' : '充值'}</td>
                    <td className="px-5 py-3 text-right">¥{o.amount}</td>
                    <td className="px-5 py-3 text-right">{o.credits}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn("px-2 py-0.5 rounded-lg text-xs",
                        o.status === 'paid' ? 'bg-green-50 text-green-600' :
                        o.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                        'bg-neutral-100 text-neutral-500'
                      )}>{({pending:'待支付',paid:'已支付',refunded:'已退款',expired:'已过期'} as any)[o.status] || o.status}</span>
                    </td>
                    <td className="px-5 py-3 text-neutral-500">{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
        </div>
      </PageContent>
    </PageContainer>
  );
}
