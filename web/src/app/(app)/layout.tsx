"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Sparkles, User, Home, LayoutGrid, Compass, HardDrive, FolderOpen } from "lucide-react";
import Sidebar from "@/components/sidebar";
import NotificationBanner from "@/components/notification-banner";
import LoginModal from "@/components/login-modal";
import { useAuthStore } from "@/store/auth";
import { useLoginModalStore } from "@/store/login-modal";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { label: "首页", href: "/", icon: Home },
  { label: "灵感", href: "/inspiration", icon: Compass },
  { label: "工具", href: "/tools", icon: LayoutGrid },
  { label: "素材", href: "/assets", icon: HardDrive },
  { label: "作品", href: "/projects", icon: FolderOpen },
];

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15, ease: "easeIn" as const } },
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
    <div className="flex h-screen overflow-hidden bg-[#fafafa] dark:bg-[#0A0A0A]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        {/* Floating top-right: only show login when NOT logged in */}
        {!user && (
          <div className={cn("absolute top-3 right-5 z-30 flex items-center gap-2.5", pathname === "/referral" && "hidden")}>
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={openLoginModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium shadow-sm cursor-pointer hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
            >
              <User size={13} />
              <span>登录 / 注册</span>
            </motion.div>
          </div>
        )}
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-200/40 dark:border-neutral-800/40 flex items-center justify-around px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
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
