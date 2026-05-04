"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  LayoutGrid,
  LayoutTemplate,
  Clock,
  FolderOpen,
  Package,
  User,
  Sparkles,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useLoginModalStore } from "@/store/login-modal";
import { useSiteConfigStore } from "@/store/site-config";

const navItems = [
  { label: "首页", href: "/", icon: Home },
  { label: "工具", href: "/tools", icon: LayoutGrid },
  { label: "模板", href: "/templates", icon: LayoutTemplate },
  { label: "最近打开", href: "/recent", icon: Clock },
  { label: "项目", href: "/projects", icon: FolderOpen },
  { label: "资产库", href: "/assets", icon: Package },
  { label: "邀请有礼", href: "/referral", icon: Gift },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, credits } = useAuthStore();
  const { config } = useSiteConfigStore();
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <aside className="hidden md:flex flex-col items-center w-[72px] h-screen border-r border-neutral-200/40 bg-white/50 backdrop-blur-sm shrink-0 relative z-10">
      {/* Logo */}
      <div className="flex items-center justify-center h-14 w-full">
        <Link href="/" className="group">
          <motion.div
            whileHover={{ scale: 1.08, rotate: 3 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <img src={config.site_favicon || "/logo-icon.svg"} alt={config.site_name} className="w-7 h-7" />
          </motion.div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-0.5 py-3 w-full px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="relative w-full group">
              <motion.div
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full py-2.5 rounded-xl text-[11px] relative transition-colors",
                  active
                    ? "text-neutral-900 font-medium"
                    : "text-neutral-400 hover:text-neutral-600"
                )}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {/* Tooltip */}
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-neutral-900 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                  {item.label}
                </div>
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-neutral-100"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {active && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-neutral-900"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  <Icon size={20} strokeWidth={active ? 2 : 1.5} />
                </span>
                <span className="relative z-10">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: credits + avatar */}
      <div className="pb-3 px-2 w-full flex flex-col items-center gap-2">
        <Link href="/pricing" className="group relative w-full">
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex flex-col items-center gap-0.5 py-2 rounded-xl text-[10px] text-amber-600 hover:bg-amber-50 transition-colors"
          >
            <Sparkles size={16} strokeWidth={1.5} />
            <span className="font-medium">{credits?.balance?.toFixed(0) || 0}</span>
          </motion.div>
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-neutral-900 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
            积分余额
          </div>
        </Link>
        <Link href="/settings" onClick={(e) => { if (!user) { e.preventDefault(); useLoginModalStore.getState().openLoginModal(); } }} className="group relative">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center overflow-hidden ring-2 ring-white/80 shadow-sm"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <User size={15} className="text-neutral-400" />
            )}
          </motion.div>
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-neutral-900 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
            {user ? user.nickname || "个人中心" : "登录"}
          </div>
        </Link>
      </div>
    </aside>
  );
}
