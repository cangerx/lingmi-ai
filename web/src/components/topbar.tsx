"use client";

import { Bell, Heart, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";

export default function Topbar() {
  const { user, credits } = useAuthStore();

  return (
    <header className="flex items-center justify-end h-12 px-5 bg-transparent relative z-10">
      <div className="flex items-center gap-2.5">
        {/* VIP / Credits */}
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          <Link
            href="/pricing"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 animate-gradient text-white text-xs font-medium shadow-sm shadow-orange-200/50 btn-press"
          >
            <Sparkles size={12} />
            <span>{credits ? `${credits.balance.toFixed(0)} 积分` : "开通会员"}</span>
          </Link>
        </motion.div>

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="relative p-2 rounded-xl hover:bg-neutral-100/60 transition-colors"
        >
          <Bell size={18} className="text-neutral-400" />
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"
          />
        </motion.button>

        {/* Avatar */}
        {user ? (
          <Link href="/settings" className="ml-0.5">
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm"
            >
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <User size={16} className="text-neutral-500" />
              )}
            </motion.div>
          </Link>
        ) : (
          <Link href="/login" className="ml-0.5">
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center ring-2 ring-white shadow-sm"
            >
              <User size={16} className="text-neutral-500" />
            </motion.div>
          </Link>
        )}
      </div>
    </header>
  );
}
