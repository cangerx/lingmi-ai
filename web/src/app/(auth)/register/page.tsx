"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { setToken, fetchProfile } = useAuthStore();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authAPI.register({ email, password, nickname });
      setToken(res.data.token);
      await fetchProfile();
      router.push("/");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || "注册失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
      className="w-full max-w-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="text-center mb-8"
      >
        <Image src="/logo-dark.svg" alt="灵觅" width={140} height={44} className="mx-auto" priority />
        <p className="text-sm text-neutral-400 mt-3">创建新账号，开启 AI 创作之旅</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.45 }}
        onSubmit={handleSubmit}
        className="bg-white/70 glass rounded-2xl border border-white/60 shadow-xl shadow-neutral-200/30 p-7 space-y-5"
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm text-red-600 bg-red-50/80 border border-red-100 rounded-xl px-3.5 py-2.5"
          >
            {error}
          </motion.div>
        )}

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">昵称</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            minLength={2}
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200/80 bg-white/60 text-sm outline-none focus:border-neutral-400 focus:bg-white focus:shadow-sm transition-all"
            placeholder="你的昵称"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200/80 bg-white/60 text-sm outline-none focus:border-neutral-400 focus:bg-white focus:shadow-sm transition-all"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200/80 bg-white/60 text-sm outline-none focus:border-neutral-400 focus:bg-white focus:shadow-sm transition-all"
            placeholder="至少 6 位"
          />
        </div>

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-md shadow-neutral-300/30 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 size={15} className="animate-spin" /> 注册中...</> : "注册"}
        </motion.button>

        <p className="text-center text-sm text-neutral-400 pt-1">
          已有账号？{" "}
          <Link href="/login" className="text-neutral-900 font-medium hover:underline">
            登录
          </Link>
        </p>
      </motion.form>
    </motion.div>
  );
}
