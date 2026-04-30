"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Sparkles, User } from "lucide-react";
import Sidebar from "@/components/sidebar";
import { useAuthStore } from "@/store/auth";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2, ease: "easeIn" as const } },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, credits } = useAuthStore();

  return (
    <div className="flex h-screen overflow-hidden bg-[#fafafa]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        {/* Floating top-right actions */}
        <div className="absolute top-3 right-5 z-30 flex items-center gap-2.5">
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/pricing"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 animate-gradient text-white text-xs font-medium shadow-sm shadow-orange-200/50"
            >
              <Sparkles size={12} />
              <span>{credits ? `${credits.balance.toFixed(0)} 积分` : "开通会员"}</span>
            </Link>
          </motion.div>
          <Link href={user ? "/settings" : "/login"}>
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center overflow-hidden ring-2 ring-white/60 shadow-sm"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <User size={15} className="text-neutral-400" />
              )}
            </motion.div>
          </Link>
        </div>
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            variants={pageVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className="flex-1 overflow-y-auto"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
