"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Sparkles, User, Home, LayoutGrid, LayoutTemplate, Clock, FolderOpen } from "lucide-react";
import Sidebar from "@/components/sidebar";
import NotificationBanner from "@/components/notification-banner";
import LoginModal from "@/components/login-modal";
import { useAuthStore } from "@/store/auth";
import { useLoginModalStore } from "@/store/login-modal";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { label: "首页", href: "/", icon: Home },
  { label: "工具", href: "/tools", icon: LayoutGrid },
  { label: "模板", href: "/templates", icon: LayoutTemplate },
  { label: "最近", href: "/recent", icon: Clock },
  { label: "项目", href: "/projects", icon: FolderOpen },
];

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2, ease: "easeIn" as const } },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, credits, token, isLoading, fetchProfile } = useAuthStore();
  const { openLoginModal } = useLoginModalStore();

  useEffect(() => {
    if (token && !user && !isLoading) {
      fetchProfile();
    }
  }, [token, user, isLoading, fetchProfile]);

  // Handle referral redirect: /?ref=xxx&login=1
  useEffect(() => {
    const ref = searchParams.get("ref");
    const login = searchParams.get("login");
    if (ref) {
      localStorage.setItem("ref_code", ref);
    }
    if (login === "1") {
      // Clean URL then open modal
      window.history.replaceState({}, "", "/");
      setTimeout(() => openLoginModal(), 100);
    }
  }, [searchParams, openLoginModal]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#fafafa]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        {/* Floating top-right actions (hidden on pages with own header) */}
        <div className={cn("absolute top-3 right-5 z-30 flex items-center gap-2.5", pathname === "/referral" && "hidden")}>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/pricing"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 animate-gradient text-white text-xs font-medium shadow-sm shadow-orange-200/50"
            >
              <Sparkles size={12} />
              <span>{credits ? `${credits.balance.toFixed(0)} 积分` : "开通会员"}</span>
            </Link>
          </motion.div>
          {user ? (
            <Link href="/settings">
              <motion.div
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center overflow-hidden ring-2 ring-white/60 shadow-sm"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <User size={15} className="text-neutral-400" />
                )}
              </motion.div>
            </Link>
          ) : (
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={openLoginModal}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center overflow-hidden ring-2 ring-white/60 shadow-sm cursor-pointer"
            >
              <User size={15} className="text-neutral-400" />
            </motion.div>
          )}
        </div>
        <NotificationBanner />
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            variants={pageVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className="flex-1 overflow-y-auto pb-16 md:pb-0"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-neutral-200/40 flex items-center justify-around px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {mobileNavItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="relative flex flex-col items-center gap-0.5 py-1.5 px-4">
              {active && (
                <motion.div
                  layoutId="mobile-nav-active"
                  className="absolute -top-0.5 w-5 h-[3px] rounded-full bg-neutral-900"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={20} strokeWidth={active ? 2 : 1.5} className={cn("transition-colors", active ? "text-neutral-900" : "text-neutral-400")} />
              <span className={cn("text-[10px] transition-colors", active ? "text-neutral-900 font-medium" : "text-neutral-400")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <LoginModal />
    </div>
  );
}
