"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <Image src="/logo-dark.svg" alt="灵觅" width={140} height={44} className="mx-auto" priority />
        <p className="text-sm text-neutral-500 mt-2">创建新账号</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-[var(--color-border)] p-6 space-y-4"
      >
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            昵称
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            minLength={2}
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] text-sm outline-none focus:border-neutral-400 transition-colors"
            placeholder="你的昵称"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            邮箱
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] text-sm outline-none focus:border-neutral-400 transition-colors"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            密码
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] text-sm outline-none focus:border-neutral-400 transition-colors"
            placeholder="至少 6 位"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors"
        >
          {loading ? "注册中..." : "注册"}
        </button>

        <p className="text-center text-sm text-neutral-500">
          已有账号？{" "}
          <Link
            href="/login"
            className="text-neutral-900 font-medium hover:underline"
          >
            登录
          </Link>
        </p>
      </form>
    </div>
  );
}
